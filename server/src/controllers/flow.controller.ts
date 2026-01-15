import { Response, NextFunction } from 'express';
import { flowService } from '../services/flow.service.js';
import { AuthRequest } from '../middlewares/auth.js';

export class FlowController {
  async listFlows(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const flows = await flowService.listFlows(req.params.botId as string, req.userId!);

      res.json({
        success: true,
        data: flows,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFlow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const flow = await flowService.getFlow(
        req.params.flowId as string,
        req.params.botId as string,
        req.userId!
      );

      res.json({
        success: true,
        data: flow,
      });
    } catch (error) {
      next(error);
    }
  }

  async createFlow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      const flow = await flowService.createFlow(req.params.botId as string, req.userId!, { name });

      res.status(201).json({
        success: true,
        data: flow,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFlow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, nodes, edges, isActive } = req.body;
      const flow = await flowService.updateFlow(
        req.params.flowId as string,
        req.params.botId as string,
        req.userId!,
        { name, nodes, edges, isActive }
      );

      res.json({
        success: true,
        data: flow,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFlow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await flowService.deleteFlow(
        req.params.flowId as string,
        req.params.botId as string,
        req.userId!
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async setDefaultFlow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const flow = await flowService.setDefaultFlow(
        req.params.flowId as string,
        req.params.botId as string,
        req.userId!
      );

      res.json({
        success: true,
        data: flow,
      });
    } catch (error) {
      next(error);
    }
  }

  async duplicateFlow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const flow = await flowService.duplicateFlow(
        req.params.flowId as string,
        req.params.botId as string,
        req.userId!
      );

      res.status(201).json({
        success: true,
        data: flow,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const flowController = new FlowController();
