import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface FacebookProfile {
  id: string;
  email?: string;
  name: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface FacebookTokenResponse {
  access_token?: string;
  error?: {
    message: string;
  };
}

interface FacebookPagesResponse {
  data?: FacebookPage[];
  error?: {
    message: string;
  };
}

interface UpdateProfileInput {
  name?: string;
  profilePic?: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        profilePic: true,
        createdAt: true,
      },
    });

    const token = this.generateToken(user.id);

    return { user, token };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if user has a password (might be Facebook-only user)
    if (!user.password) {
      throw new AppError('This account uses Facebook login. Please login with Facebook.', 401);
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate token with appropriate expiration based on rememberMe
    const token = this.generateToken(user.id, input.rememberMe);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async loginWithFacebook(accessToken: string) {
    // Fetch user profile from Facebook
    const profileResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );

    if (!profileResponse.ok) {
      throw new AppError('Failed to fetch Facebook profile', 401);
    }

    const profile = await profileResponse.json() as FacebookProfile;

    if (!profile.id) {
      throw new AppError('Invalid Facebook profile', 401);
    }

    // Check if user exists by Facebook ID
    let user = await prisma.user.findFirst({
      where: { facebookId: profile.id },
    });

    if (!user && profile.email) {
      // Check if user exists by email
      user = await prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        // Link Facebook to existing account
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            facebookId: profile.id,
            profilePic: profile.picture?.data?.url || user.profilePic,
          },
        });
      }
    }

    if (!user) {
      // Create new user
      const email = profile.email || `fb_${profile.id}@facebook.local`;
      user = await prisma.user.create({
        data: {
          email,
          name: profile.name,
          facebookId: profile.id,
          profilePic: profile.picture?.data?.url,
          password: null, // No password for Facebook users
        },
      });
    } else {
      // Update profile pic if changed
      if (profile.picture?.data?.url && profile.picture.data.url !== user.profilePic) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { profilePic: profile.picture.data.url },
        });
      }
    }

    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  // Exchange Facebook authorization code for access token
  async exchangeFacebookCode(code: string): Promise<string> {
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(env.FACEBOOK_REDIRECT_URI)}&client_secret=${env.FACEBOOK_APP_SECRET}&code=${code}`;

    const response = await fetch(tokenUrl);
    const data = await response.json() as FacebookTokenResponse;

    if (data.error) {
      console.error('Facebook token exchange error:', data.error);
      throw new AppError(data.error.message || 'Failed to exchange Facebook code', 401);
    }

    return data.access_token!;
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePic: true,
        facebookId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  // Get Facebook OAuth URL
  getFacebookAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      redirect_uri: env.FACEBOOK_REDIRECT_URI,
      scope: 'email,public_profile',
      response_type: 'code',
    });

    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }

  // Get Facebook Pages OAuth URL (with page permissions) - uses KonKui App
  getFacebookPagesAuthUrl(botId: string): string {
    const params = new URLSearchParams({
      client_id: env.FACEBOOK_PAGES_APP_ID,
      redirect_uri: env.FACEBOOK_PAGES_REDIRECT_URI,
      scope: 'pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata,pages_read_user_content,instagram_basic,instagram_manage_messages',
      response_type: 'code',
      state: botId, // Pass botId in state to know which bot to connect
    });

    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }

  // Exchange code for user token (for pages) - uses KonKui App
  async exchangeFacebookPagesCode(code: string): Promise<string> {
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${env.FACEBOOK_PAGES_APP_ID}&redirect_uri=${encodeURIComponent(env.FACEBOOK_PAGES_REDIRECT_URI)}&client_secret=${env.FACEBOOK_PAGES_APP_SECRET}&code=${code}`;

    const response = await fetch(tokenUrl);
    const data = await response.json() as FacebookTokenResponse;

    if (data.error) {
      console.error('Facebook pages token exchange error:', data.error);
      throw new AppError(data.error.message || 'Failed to exchange Facebook code', 401);
    }

    return data.access_token!;
  }

  // Get list of Facebook Pages managed by user
  async getFacebookPages(userAccessToken: string): Promise<FacebookPage[]> {
    const url = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture&access_token=${userAccessToken}`;

    const response = await fetch(url);
    const data = await response.json() as FacebookPagesResponse;

    if (data.error) {
      console.error('Facebook pages error:', data.error);
      throw new AppError(data.error.message || 'Failed to get Facebook pages', 401);
    }

    return data.data || [];
  }

  // Get Instagram Business Account linked to a Facebook Page
  async getInstagramAccount(pageAccessToken: string, pageId: string): Promise<{ id: string; username: string } | null> {
    try {
      // Step 1: Get the instagram_business_account ID from the page
      const pageResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
      );
      const pageData = await pageResponse.json() as { instagram_business_account?: { id: string }; error?: { message: string } };

      if (pageData.error || !pageData.instagram_business_account) {
        return null;
      }

      const igAccountId = pageData.instagram_business_account.id;

      // Step 2: Get the Instagram username
      const igResponse = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,username&access_token=${pageAccessToken}`
      );
      const igData = await igResponse.json() as { id?: string; username?: string; error?: { message: string } };

      if (igData.error || !igData.id || !igData.username) {
        return null;
      }

      return { id: igData.id, username: igData.username };
    } catch (error) {
      console.error('Error fetching Instagram account:', error);
      return null;
    }
  }

  // Subscribe a Facebook Page to webhook events (messages, postbacks, etc.)
  async subscribePageToWebhooks(pageAccessToken: string, pageId: string): Promise<void> {
    const url = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads',
        access_token: pageAccessToken,
      }),
    });

    const data = await response.json() as { success?: boolean; error?: { message: string } };

    if (data.error) {
      console.error('Webhook subscription error:', data.error);
      throw new AppError(`Failed to subscribe to webhooks: ${data.error.message}`, 500);
    }

    console.log(`Page ${pageId} subscribed to webhooks successfully`);
  }

  // Exchange short-lived user token for long-lived user token - uses KonKui App
  async getLongLivedPageToken(shortLivedToken: string): Promise<string> {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${env.FACEBOOK_PAGES_APP_ID}&client_secret=${env.FACEBOOK_PAGES_APP_SECRET}&fb_exchange_token=${shortLivedToken}`
    );

    const data = await response.json() as FacebookTokenResponse;

    if (data.error) {
      console.error('Long-lived token exchange error:', JSON.stringify(data.error));
      throw new AppError(`Failed to get long-lived token: ${data.error.message}`, 401);
    }

    return data.access_token || shortLivedToken;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name ?? user.name,
        profilePic: input.profilePic ?? user.profilePic,
      },
      select: {
        id: true,
        email: true,
        name: true,
        profilePic: true,
        facebookId: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Facebook-only users cannot change password
    if (!user.password) {
      throw new AppError('Cannot change password for Facebook-linked accounts', 400);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(input.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(input.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  }

  private generateToken(userId: string, rememberMe: boolean = true): string {
    // If rememberMe is true, token expires in 30 days
    // If rememberMe is false, token expires in 1 day (session-like)
    const expiresIn = rememberMe ? '30d' : '1d';
    return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn });
  }
}

export const authService = new AuthService();
