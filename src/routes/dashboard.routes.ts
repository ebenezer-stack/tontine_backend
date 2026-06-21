import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', DashboardController.index);
router.get('/fortune-calendar', DashboardController.fortuneCalendar);

export default router;
