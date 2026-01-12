import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';

const router = Router();

// Facebook webhook verification
router.get('/:botId', webhookController.verify.bind(webhookController));

// Facebook webhook receive messages
router.post('/:botId', webhookController.receive.bind(webhookController));

export default router;
