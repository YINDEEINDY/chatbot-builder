import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.get('/me', auth, authController.getMe.bind(authController));

export default router;
