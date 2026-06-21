import { Router } from 'express';
import { ContributionController } from '../controllers/ContributionController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../utils/upload';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', ContributionController.index);
router.post('/', ContributionController.store);
router.get('/summary', ContributionController.summary);
router.get('/late', ContributionController.lateContributions);
router.post('/pay', upload.single('proof_image'), ContributionController.pay);

export default router;
