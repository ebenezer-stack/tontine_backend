import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', AuthController.register);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/login', AuthController.login);
router.post('/resend-otp', AuthController.resendOtp);

// Protected routes
router.get('/user', authMiddleware, AuthController.user);
router.post('/logout', authMiddleware, AuthController.logout);

export default router;
