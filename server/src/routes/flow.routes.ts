import { Router } from 'express';
import { flowController } from '../controllers/flow.controller.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
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

export default router;
