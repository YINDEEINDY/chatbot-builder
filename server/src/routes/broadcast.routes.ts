import { Router } from 'express';
import { broadcastController } from '../controllers/broadcast.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', broadcastController.list.bind(broadcastController));
router.post('/', broadcastController.create.bind(broadcastController));
router.get('/:broadcastId', broadcastController.get.bind(broadcastController));
router.put('/:broadcastId', broadcastController.update.bind(broadcastController));
router.delete('/:broadcastId', broadcastController.delete.bind(broadcastController));
router.post('/:broadcastId/send', broadcastController.send.bind(broadcastController));
router.post('/:broadcastId/schedule', broadcastController.schedule.bind(broadcastController));

export default router;
