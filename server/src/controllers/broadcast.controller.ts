import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { broadcastService } from '../services/broadcast.service.js';

export class BroadcastController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;

      const broadcasts = await broadcastService.listBroadcasts(botId, userId);

      res.json({
        success: true,
        data: broadcasts,
      });
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const broadcastId = req.params.broadcastId as string;
      const userId = req.userId!;

      const broadcast = await broadcastService.getBroadcast(broadcastId, botId, userId);

      res.json({
        success: true,
        data: broadcast,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;

      const broadcast = await broadcastService.createBroadcast(botId, userId, req.body);

      res.status(201).json({
        success: true,
        data: broadcast,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const broadcastId = req.params.broadcastId as string;
      const userId = req.userId!;

      const broadcast = await broadcastService.updateBroadcast(broadcastId, botId, userId, req.body);

      res.json({
        success: true,
        data: broadcast,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const broadcastId = req.params.broadcastId as string;
      const userId = req.userId!;

      const result = await broadcastService.deleteBroadcast(broadcastId, botId, userId);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async send(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const broadcastId = req.params.broadcastId as string;
      const userId = req.userId!;

      const result = await broadcastService.sendBroadcast(broadcastId, botId, userId);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async schedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const broadcastId = req.params.broadcastId as string;
      const userId = req.userId!;
      const { scheduledAt } = req.body;

      const broadcast = await broadcastService.scheduleBroadcast(
        broadcastId,
        botId,
        userId,
        new Date(scheduledAt)
      );

      res.json({
        success: true,
        data: broadcast,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const broadcastController = new BroadcastController();
