import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';
import { widgetController } from '../controllers/widget.controller.js';

export const webhookRoutes = Router();
webhookRoutes.get('/facebook', webhookController.verifyFacebook.bind(webhookController));
webhookRoutes.post('/facebook', webhookController.receiveFacebook.bind(webhookController));
webhookRoutes.get('/facebook/:botId', webhookController.verifyFacebook.bind(webhookController));
webhookRoutes.post('/facebook/:botId', webhookController.receiveFacebook.bind(webhookController));
webhookRoutes.post('/line/:botId', webhookController.receiveLine.bind(webhookController));

export const widgetRoutes = Router();
widgetRoutes.get('/:botId/config', widgetController.config.bind(widgetController));
widgetRoutes.post('/:botId/session', widgetController.session.bind(widgetController));
widgetRoutes.post('/:botId/messages', widgetController.send.bind(widgetController));
