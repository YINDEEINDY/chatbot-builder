import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { botService } from '../services/bot.service.js';
import { pageContentService } from '../services/page-content.service.js';
import { AppError } from '../middlewares/errorHandler.js';

export class PageContentController {
  private async getPageContext(req: AuthRequest) {
    const botId = req.params.botId as string;
    const userId = req.userId!;

    const bot = await botService.getBot(botId, userId);
    const token = botService.getDecryptedToken(bot.facebookToken);

    if (!bot.facebookPageId || !token) {
      console.error('Page not connected:', { pageId: bot.facebookPageId, hasToken: !!bot.facebookToken });
      throw new AppError('Facebook Page not connected', 400);
    }

    console.log('Page context:', { pageId: bot.facebookPageId, tokenLength: token.length });
    return { bot, pageId: bot.facebookPageId, token };
  }

  async getPosts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { pageId, token } = await this.getPageContext(req);
      const limit = parseInt(req.query.limit as string) || 25;
      const after = req.query.after as string | undefined;

      const result = await pageContentService.getPagePosts(token, pageId, limit, after);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getComments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = await this.getPageContext(req);
      const postId = req.params.postId as string;
      const limit = parseInt(req.query.limit as string) || 25;
      const after = req.query.after as string | undefined;

      const result = await pageContentService.getPostComments(token, postId, limit, after);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = await this.getPageContext(req);
      const commentId = req.params.commentId as string;

      await pageContentService.deleteComment(token, commentId);

      res.json({
        success: true,
        data: { message: 'Comment deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const pageContentController = new PageContentController();
