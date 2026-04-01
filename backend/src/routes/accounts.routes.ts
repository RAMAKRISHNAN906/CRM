import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getAccounts, getAccount, createAccount, updateAccount, deleteAccount } from '../controllers/accounts.controller';

const router = Router();
router.use(authenticate);

router.get('/', getAccounts);
router.post('/', createAccount);
router.get('/:id', getAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
