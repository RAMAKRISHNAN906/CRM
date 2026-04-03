import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getPurchaseOrders, getPurchaseOrder, createPurchaseOrder,
  updatePurchaseOrder, deletePurchaseOrder,
} from '../controllers/purchaseOrders.controller';

const router = Router();
router.use(authenticate);

router.get('/', getPurchaseOrders);
router.post('/', createPurchaseOrder);
router.get('/:id', getPurchaseOrder);
router.put('/:id', updatePurchaseOrder);
router.delete('/:id', deletePurchaseOrder);

export default router;
