import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { conversationService } from '../services/conversation.service.js';

export class ConversationController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;
      const conversations = await conversationService.listConversations(botId, userId, {
        status: req.query.status as string | undefined,
        assignee: req.query.assignee as 'mine' | 'unassigned' | 'all' | undefined,
        search: req.query.search as string | undefined,
      });

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const conversationId = req.params.conversationId as string;
      const userId = req.userId!;

      const conversation = await conversationService.getConversation(conversationId, botId, userId);

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const conversationId = req.params.conversationId as string;
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await conversationService.getConversationMessages(
        conversationId,
        botId,
        userId,
        page,
        limit
      );

      res.json({
        success: true,
        data: {
          messages: result.messages,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async takeover(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const conversationId = req.params.conversationId as string;
      const userId = req.userId!;

      const conversation = await conversationService.takeoverConversation(
        conversationId,
        botId,
        userId
      );

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  async release(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const conversationId = req.params.conversationId as string;
      const userId = req.userId!;

      const conversation = await conversationService.releaseConversation(
        conversationId,
        botId,
        userId
      );

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const conversationId = req.params.conversationId as string;
      const userId = req.userId!;
      const { content } = req.body;

      const message = await conversationService.sendMessage(
        conversationId,
        botId,
        userId,
        content
      );

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  async close(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const conversationId = req.params.conversationId as string;
      const userId = req.userId!;

      const conversation = await conversationService.closeConversation(
        conversationId,
        botId,
        userId
      );

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const conversationController = new ConversationController();
