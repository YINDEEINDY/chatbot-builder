import { Router } from 'express';
import { botController } from '../controllers/bot.controller.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createBotSchema, updateBotSchema, botIdSchema, connectFacebookSchema } from '../schemas/index.js';

const router = Router();

router.use(auth);

router.get('/', botController.listBots.bind(botController));
router.post('/', validate(createBotSchema), botController.createBot.bind(botController));
router.get('/:id', validate(botIdSchema), botController.getBot.bind(botController));
router.put('/:id', validate(updateBotSchema), botController.updateBot.bind(botController));
router.delete('/:id', validate(botIdSchema), botController.deleteBot.bind(botController));
router.post('/:id/connect-facebook', validate(connectFacebookSchema), botController.connectFacebook.bind(botController));

export default router;
