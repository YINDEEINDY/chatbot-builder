import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { blockService } from '../services/block.service.js';

export class BlockController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;

      const blocks = await blockService.listBlocks(botId, userId);

      res.json({
        success: true,
        data: blocks,
      });
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const blockId = req.params.blockId as string;
      const userId = req.userId!;

      const block = await blockService.getBlock(blockId, botId, userId);

      res.json({
        success: true,
        data: block,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const userId = req.userId!;

      const block = await blockService.createBlock(botId, userId, req.body);

      res.status(201).json({
        success: true,
        data: block,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const blockId = req.params.blockId as string;
      const userId = req.userId!;

      const block = await blockService.updateBlock(blockId, botId, userId, req.body);

      res.json({
        success: true,
        data: block,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const blockId = req.params.blockId as string;
      const userId = req.userId!;

      const result = await blockService.deleteBlock(blockId, botId, userId);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async duplicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const blockId = req.params.blockId as string;
      const userId = req.userId!;

      const block = await blockService.duplicateBlock(blockId, botId, userId);

      res.status(201).json({
        success: true,
        data: block,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const blockController = new BlockController();
