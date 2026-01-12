import { Router } from 'express';
import authRoutes from './auth.routes.js';
import botRoutes from './bot.routes.js';
import flowRoutes from './flow.routes.js';
import webhookRoutes from './webhook.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bots', botRoutes);
router.use('/bots/:botId/flows', flowRoutes);
router.use('/webhook', webhookRoutes);

export default router;
