import { Router } from 'express';
import { GuarantorController } from '../controllers/GuarantorController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../utils/upload';

const router = Router();

router.use(authMiddleware);

router.get('/', GuarantorController.index);
router.post('/', upload.single('id_card_image'), GuarantorController.store);

export default router;
