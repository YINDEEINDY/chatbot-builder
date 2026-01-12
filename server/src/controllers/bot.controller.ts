import { Response, NextFunction } from 'express';
import { botService } from '../services/bot.service.js';
import { AuthRequest } from '../middlewares/auth.js';

export class BotController {
  async listBots(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bots = await botService.listBots(req.userId!);

      res.json({
        success: true,
        data: bots,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBot(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bot = await botService.getBot(req.params.id, req.userId!);

      res.json({
        success: true,
        data: bot,
      });
    } catch (error) {
      next(error);
    }
  }

  async createBot(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const bot = await botService.createBot(req.userId!, { name, description });

      res.status(201).json({
        success: true,
        data: bot,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBot(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, isActive } = req.body;
      const bot = await botService.updateBot(req.params.id, req.userId!, {
        name,
        description,
        isActive,
      });

      res.json({
        success: true,
        data: bot,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBot(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await botService.deleteBot(req.params.id, req.userId!);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async connectFacebook(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { pageId, accessToken } = req.body;
      const bot = await botService.connectFacebook(
        req.params.id,
        req.userId!,
        pageId,
        accessToken
      );

      res.json({
        success: true,
        data: bot,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const botController = new BotController();
