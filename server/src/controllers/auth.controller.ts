import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { notificationService } from '../services/notification.service.js';
import { AuthRequest } from '../middlewares/auth.js';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

// Temporary storage for Facebook Pages OAuth sessions
interface FacebookPagesSession {
  userAccessToken: string;
  pages: Array<{
    id: string;
    name: string;
    accessToken: string;
    picture?: string;
  }>;
  botId: string;
  createdAt: Date;
}

const facebookPagesSessionStore = new Map<string, FacebookPagesSession>();

// Clean up old sessions (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of facebookPagesSessionStore.entries()) {
    if (now - session.createdAt.getTime() > 10 * 60 * 1000) {
      facebookPagesSessionStore.delete(key);
    }
  }
}, 60 * 1000);

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;
      const result = await authService.register({ email, password, name });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, rememberMe } = req.body;
      const result = await authService.login({ email, password, rememberMe });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.userId!);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Facebook OAuth URL - frontend redirects user to this URL
  async getFacebookAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const url = authService.getFacebookAuthUrl();
      res.json({
        success: true,
        data: { url },
      });
    } catch (error) {
      next(error);
    }
  }

  // Facebook OAuth callback - receives code from Facebook
  async facebookCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, error, error_description } = req.query;

      // Handle Facebook error
      if (error) {
        console.error('Facebook OAuth error:', error, error_description);
        return res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(String(error_description || error))}`);
      }

      if (!code || typeof code !== 'string') {
        return res.redirect(`${env.CLIENT_URL}/login?error=No authorization code received`);
      }

      // Exchange code for access token
      const accessToken = await authService.exchangeFacebookCode(code);

      // Login/register with Facebook
      const result = await authService.loginWithFacebook(accessToken);

      // Redirect to frontend with token
      res.redirect(`${env.CLIENT_URL}/auth/callback?token=${result.token}`);
    } catch (error: any) {
      console.error('Facebook callback error:', error);
      res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(error.message || 'Facebook login failed')}`);
    }
  }

  // Direct Facebook login with access token (for mobile/JS SDK)
  async facebookLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          message: 'Access token is required',
        });
      }

      const result = await authService.loginWithFacebook(accessToken);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Facebook Pages OAuth URL - requires page permissions
  async getFacebookPagesAuthUrl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { botId } = req.query;

      if (!botId || typeof botId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'botId is required',
        });
      }

      // Verify user owns this bot
      const bot = await prisma.bot.findFirst({
        where: { id: botId, userId: req.userId },
      });

      if (!bot) {
        return res.status(404).json({
          success: false,
          message: 'Bot not found',
        });
      }

      const url = authService.getFacebookPagesAuthUrl(botId);
      res.json({
        success: true,
        data: { url },
      });
    } catch (error) {
      next(error);
    }
  }

  // Facebook Pages OAuth callback - exchanges code and fetches pages
  async facebookPagesCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, error, error_description, state } = req.query;
      const botId = state as string;

      // Handle Facebook error
      if (error) {
        console.error('Facebook Pages OAuth error:', error, error_description);
        return res.redirect(
          `${env.CLIENT_URL}/bots/${botId}/settings?error=${encodeURIComponent(String(error_description || error))}`
        );
      }

      if (!code || typeof code !== 'string') {
        return res.redirect(
          `${env.CLIENT_URL}/bots/${botId}/settings?error=No authorization code received`
        );
      }

      if (!botId) {
        return res.redirect(
          `${env.CLIENT_URL}/bots?error=No bot ID in state`
        );
      }

      // Exchange code for user access token
      const shortLivedUserToken = await authService.exchangeFacebookPagesCode(code);

      // Exchange short-lived user token for long-lived user token
      // This ensures page tokens obtained below will be non-expiring
      const longLivedUserToken = await authService.getLongLivedPageToken(shortLivedUserToken);

      // Get list of pages user manages (using long-lived user token = non-expiring page tokens)
      const pages = await authService.getFacebookPages(longLivedUserToken);

      if (pages.length === 0) {
        return res.redirect(
          `${env.CLIENT_URL}/bots/${botId}/settings?error=No Facebook Pages found. Make sure you have admin access to at least one page.`
        );
      }

      // Store session with pages data
      const sessionId = crypto.randomUUID();
      facebookPagesSessionStore.set(sessionId, {
        userAccessToken: longLivedUserToken,
        pages: pages.map(p => ({
          id: p.id,
          name: p.name,
          accessToken: p.access_token,
          picture: p.picture?.data?.url,
        })),
        botId,
        createdAt: new Date(),
      });

      // Redirect to frontend with session ID
      res.redirect(`${env.CLIENT_URL}/bots/${botId}/settings?pageSession=${sessionId}`);
    } catch (error: any) {
      console.error('Facebook Pages callback error:', error);
      const botId = req.query.state as string;
      res.redirect(
        `${env.CLIENT_URL}/bots/${botId || ''}/settings?error=${encodeURIComponent(error.message || 'Failed to connect Facebook Pages')}`
      );
    }
  }

  // Get Facebook Pages from session
  async getFacebookPagesFromSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;

      const session = facebookPagesSessionStore.get(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session expired or not found. Please try connecting again.',
        });
      }

      // Verify user owns this bot
      const bot = await prisma.bot.findFirst({
        where: { id: session.botId, userId: req.userId },
      });

      if (!bot) {
        facebookPagesSessionStore.delete(sessionId);
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this bot',
        });
      }

      res.json({
        success: true,
        data: {
          botId: session.botId,
          pages: session.pages.map(p => ({
            id: p.id,
            name: p.name,
            picture: p.picture,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Connect a Facebook Page to a bot
  async connectFacebookPage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const { sessionId, pageId } = req.body;

      if (!sessionId || !pageId) {
        return res.status(400).json({
          success: false,
          message: 'sessionId and pageId are required',
        });
      }

      // Get session
      const session = facebookPagesSessionStore.get(sessionId);
      if (!session || session.botId !== botId) {
        return res.status(404).json({
          success: false,
          message: 'Session expired or not found. Please try connecting again.',
        });
      }

      // Verify user owns this bot
      const bot = await prisma.bot.findFirst({
        where: { id: botId, userId: req.userId },
      });

      if (!bot) {
        return res.status(404).json({
          success: false,
          message: 'Bot not found',
        });
      }

      // Find selected page
      const selectedPage = session.pages.find(p => p.id === pageId);
      if (!selectedPage) {
        return res.status(400).json({
          success: false,
          message: 'Selected page not found in session',
        });
      }

      // Page token is already non-expiring (obtained via long-lived user token)
      // Store it directly
      const updatedBot = await prisma.bot.update({
        where: { id: botId },
        data: {
          facebookPageId: selectedPage.id,
          facebookPageName: selectedPage.name,
          facebookToken: selectedPage.accessToken,
          isActive: true,
        },
      });

      // Clean up session
      facebookPagesSessionStore.delete(sessionId);

      res.json({
        success: true,
        data: {
          id: updatedBot.id,
          name: updatedBot.name,
          facebookPageId: updatedBot.facebookPageId,
          facebookPageName: updatedBot.facebookPageName,
          isActive: updatedBot.isActive,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Disconnect Facebook Page from bot
  async disconnectFacebookPage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;

      // Verify user owns this bot
      const bot = await prisma.bot.findFirst({
        where: { id: botId, userId: req.userId },
      });

      if (!bot) {
        return res.status(404).json({
          success: false,
          message: 'Bot not found',
        });
      }

      // Update bot to remove Facebook Page info
      const updatedBot = await prisma.bot.update({
        where: { id: botId },
        data: {
          facebookPageId: null,
          facebookPageName: null,
          facebookToken: null,
          isActive: false,
        },
      });

      res.json({
        success: true,
        data: {
          id: updatedBot.id,
          name: updatedBot.name,
          facebookPageId: null,
          facebookPageName: null,
          isActive: false,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, profilePic } = req.body;
      const user = await authService.updateProfile(req.userId!, { name, profilePic });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.userId!, { currentPassword, newPassword });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get notification settings
  async getNotificationSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await notificationService.getNotificationSettings(req.userId!);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update notification settings
  async updateNotificationSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { notifyNewMessages, notifyDailySummary, notifyBotErrors } = req.body;
      const settings = await notificationService.updateNotificationSettings(req.userId!, {
        notifyNewMessages,
        notifyDailySummary,
        notifyBotErrors,
      });

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
