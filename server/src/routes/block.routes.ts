import { Router } from 'express';
import { blockController } from '../controllers/block.controller.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createBlockSchema, updateBlockSchema, blockIdSchema, botIdParamSchema } from '../schemas/index.js';

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', validate(botIdParamSchema), blockController.list.bind(blockController));
router.post('/', validate(createBlockSchema), blockController.create.bind(blockController));
router.get('/:blockId', validate(blockIdSchema), blockController.get.bind(blockController));
router.put('/:blockId', validate(updateBlockSchema), blockController.update.bind(blockController));
router.delete('/:blockId', validate(blockIdSchema), blockController.delete.bind(blockController));
router.post('/:blockId/duplicate', validate(blockIdSchema), blockController.duplicate.bind(blockController));

export default router;
