import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../utils/upload';

const router = Router();

router.use(authMiddleware);

router.get('/profile', UserController.profile);
router.post('/profile', upload.single('avatar'), UserController.updateProfile);
router.post('/avatar', upload.single('avatar'), UserController.uploadAvatar);
router.get('/my-tontines', UserController.myTontines);

router.get('/notifications', UserController.notifications);
router.put('/notifications/read-all', UserController.markAllNotificationsRead);
router.put('/notifications/:notificationId/read', UserController.markNotificationRead);
router.get('/notifications/unread-count', UserController.unreadNotificationsCount);

export default router;
