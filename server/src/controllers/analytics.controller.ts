import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { analyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;
      const days = parseInt(req.query.days as string) || 7;

      const summary = await analyticsService.getSummary(botId, userId, days);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDailyData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;
      const days = parseInt(req.query.days as string) || 7;

      const result = await analyticsService.getDailyData(botId, userId, days);

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getContactStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;

      const stats = await analyticsService.getContactStats(botId, userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
