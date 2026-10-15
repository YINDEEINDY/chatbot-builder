import { Router } from 'express';
import { flowController } from '../controllers/flow.controller.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import type { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import type { AuthRequest } from '../middlewares/auth.js';
import { startFlow, continueFlow, type FlowGraph, type RunState } from '../engine/flow-runner.js';
import { createFlowSchema, updateFlowSchema, flowIdSchema, botIdParamSchema } from '../schemas/index.js';

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', validate(botIdParamSchema), flowController.listFlows.bind(flowController));
router.post('/', validate(createFlowSchema), flowController.createFlow.bind(flowController));
router.get('/:flowId', validate(flowIdSchema), flowController.getFlow.bind(flowController));
router.put('/:flowId', validate(updateFlowSchema), flowController.updateFlow.bind(flowController));
router.delete('/:flowId', validate(flowIdSchema), flowController.deleteFlow.bind(flowController));
router.post('/:flowId/set-default', validate(flowIdSchema), flowController.setDefaultFlow.bind(flowController));
router.post('/:flowId/duplicate', validate(flowIdSchema), flowController.duplicateFlow.bind(flowController));

// Try a flow from the editor without saving or messaging anyone: pure runner, no DB writes.
router.post('/:flowId/simulate', validate(flowIdSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.botId as string, userId: req.userId } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot not found' });
    const graph = { nodes: req.body?.nodes ?? [], edges: req.body?.edges ?? [] } as FlowGraph;
    const state = req.body?.state as RunState | undefined;
    const vars = { name: 'ลูกค้าทดลอง', ...(req.body?.vars ?? {}) };
    const result = state?.nodeId
      ? continueFlow(graph, state, { text: String(req.body?.text ?? ''), payload: req.body?.payload })
      : startFlow(graph, vars);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

export default router;
