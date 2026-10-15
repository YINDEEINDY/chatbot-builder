import { prisma } from '../config/db.js';
import type { AuthRequest } from '../middlewares/auth.js';
import { channelStatus, connectLine } from '../channels/setup.js';
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

// Platform connection: status of every channel + one-click LINE setup.
router.get('/:id/channel-status', async (req: AuthRequest, res, next) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id as string, userId: req.userId } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot not found' });
    res.json({ success: true, data: await channelStatus(bot) });
  } catch (e) { next(e); }
});
router.post('/:id/line/connect', async (req: AuthRequest, res, next) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id as string, userId: req.userId } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot not found' });
    const { secret, token } = req.body ?? {};
    if (typeof secret !== 'string' || typeof token !== 'string' || !secret.trim() || !token.trim()) {
      return res.status(400).json({ success: false, message: 'ใส่ Channel secret และ Channel access token ให้ครบ' });
    }
    res.json({ success: true, data: await connectLine(bot, secret, token.trim()) });
  } catch (e) { next(e); }
});

export default router;
