import { Router } from 'express';
import { botController } from '../controllers/bot.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

router.use(auth);

router.get('/', botController.listBots.bind(botController));
router.post('/', botController.createBot.bind(botController));
router.get('/:id', botController.getBot.bind(botController));
router.put('/:id', botController.updateBot.bind(botController));
router.delete('/:id', botController.deleteBot.bind(botController));
router.post('/:id/connect-facebook', botController.connectFacebook.bind(botController));

export default router;
