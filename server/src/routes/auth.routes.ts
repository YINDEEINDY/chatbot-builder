import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from '../schemas/index.js';

const router = Router();

// Email/Password auth
router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/login', validate(loginSchema), authController.login.bind(authController));
router.get('/me', auth, authController.getMe.bind(authController));

// Facebook OAuth (User Login)
router.get('/facebook', authController.getFacebookAuthUrl.bind(authController));
router.get('/facebook/callback', authController.facebookCallback.bind(authController));
router.post('/facebook/token', authController.facebookLogin.bind(authController));

// Facebook Pages OAuth (Connect Page to Bot)
router.get('/facebook/pages', auth, authController.getFacebookPagesAuthUrl.bind(authController));
router.get('/facebook/pages/callback', authController.facebookPagesCallback.bind(authController));
router.get('/facebook/pages/session/:sessionId', auth, authController.getFacebookPagesFromSession.bind(authController));
router.post('/facebook/pages/:botId/connect', auth, authController.connectFacebookPage.bind(authController));
router.delete('/facebook/pages/:botId/disconnect', auth, authController.disconnectFacebookPage.bind(authController));

// Profile routes
router.put('/profile', auth, validate(updateProfileSchema), authController.updateProfile.bind(authController));
router.post('/profile/change-password', auth, validate(changePasswordSchema), authController.changePassword.bind(authController));

// Notification settings routes
router.get('/notifications', auth, authController.getNotificationSettings.bind(authController));
router.put('/notifications', auth, authController.updateNotificationSettings.bind(authController));

export default router;
