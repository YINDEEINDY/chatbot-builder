import { Router } from 'express';
import { conversationController } from '../controllers/conversation.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', conversationController.list.bind(conversationController));
router.get('/:conversationId', conversationController.get.bind(conversationController));
router.get('/:conversationId/messages', conversationController.getMessages.bind(conversationController));
router.put('/:conversationId/takeover', conversationController.takeover.bind(conversationController));
router.put('/:conversationId/release', conversationController.release.bind(conversationController));
router.post('/:conversationId/messages', conversationController.sendMessage.bind(conversationController));
router.put('/:conversationId/close', conversationController.close.bind(conversationController));

export default router;
