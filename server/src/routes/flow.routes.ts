import { Router } from 'express';
import { flowController } from '../controllers/flow.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', flowController.listFlows.bind(flowController));
router.post('/', flowController.createFlow.bind(flowController));
router.get('/:flowId', flowController.getFlow.bind(flowController));
router.put('/:flowId', flowController.updateFlow.bind(flowController));
router.delete('/:flowId', flowController.deleteFlow.bind(flowController));
router.post('/:flowId/set-default', flowController.setDefaultFlow.bind(flowController));

export default router;
