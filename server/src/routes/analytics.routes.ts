import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/summary', analyticsController.getSummary.bind(analyticsController));
router.get('/daily', analyticsController.getDailyData.bind(analyticsController));
router.get('/contacts', analyticsController.getContactStats.bind(analyticsController));

export default router;
