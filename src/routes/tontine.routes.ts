import { Router } from 'express';
import { TontineController } from '../controllers/TontineController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', TontineController.index);
router.post('/', TontineController.store);
router.get('/:tontine', TontineController.show);
router.put('/:tontine', TontineController.update);
router.delete('/:tontine', TontineController.delete);

router.post('/:tontine/activate', TontineController.activate);
router.get('/:tontine/members', TontineController.getMembers);

router.post('/join-by-code', TontineController.joinByCode);
router.post('/:tontine/leave', TontineController.leave);
router.post('/:tontine/reorder-members', TontineController.reorderMembers);
router.post('/:tontine/invite', TontineController.inviteMember);
router.post('/:tontine/restart', TontineController.restart);
router.post('/:tontine/payouts/:payoutId/complete', TontineController.completePayout);
router.get('/:tontine/members/:user/contract', TontineController.generateContract);

export default router;
