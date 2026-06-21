import { Router } from 'express';
import { KycController } from '../controllers/KycController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../utils/upload';

const router = Router();

router.use(authMiddleware);

router.post('/upload', upload.fields([{ name: 'id_card', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]), KycController.upload);
router.get('/status', KycController.status);
router.post('/verify/:user', KycController.verify);

export default router;
