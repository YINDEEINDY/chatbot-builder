import { Router } from 'express';
import { contactController } from '../controllers/contact.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', contactController.list.bind(contactController));
router.get('/stats', contactController.getStats.bind(contactController));
router.get('/:contactId', contactController.get.bind(contactController));
router.put('/:contactId', contactController.update.bind(contactController));
router.get('/:contactId/messages', contactController.getMessages.bind(contactController));
router.post('/tags/add', contactController.addTags.bind(contactController));
router.post('/tags/remove', contactController.removeTags.bind(contactController));

export default router;
