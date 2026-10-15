import { Router } from 'express';
import authRoutes from './auth.routes.js';
import botRoutes from './bot.routes.js';
import flowRoutes from './flow.routes.js';
import contactRoutes from './contact.routes.js';
import broadcastRoutes from './broadcast.routes.js';
import conversationRoutes from './conversation.routes.js';
import analyticsRoutes from './analytics.routes.js';
import uploadRoutes from './upload.routes.js';
import pageContentRoutes from './page-content.routes.js';
import { webhookRoutes, widgetRoutes } from './webhook.routes.js';
import { cannedRoutes, ruleRoutes, attributeRoutes } from './replies.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bots', botRoutes);
router.use('/bots/:botId/flows', flowRoutes);
router.use('/bots/:botId/contacts', attributeRoutes);
router.use('/bots/:botId/contacts', contactRoutes);
router.use('/bots/:botId/broadcasts', broadcastRoutes);
router.use('/bots/:botId/conversations', conversationRoutes);
router.use('/bots/:botId/analytics', analyticsRoutes);
router.use('/bots/:botId/page-content', pageContentRoutes);
router.use('/bots/:botId/canned-responses', cannedRoutes);
router.use('/bots/:botId/rules', ruleRoutes);
router.use('/uploads', uploadRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/widget', widgetRoutes);

export default router;
