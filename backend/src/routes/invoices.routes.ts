import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getInvoices, getInvoice, createInvoice, updateInvoice, updateInvoiceStatus,
  recordPayment, deleteInvoice, downloadInvoicePdf, downloadInvoiceDocx,
} from '../controllers/invoices.controller';

const router = Router();
router.use(authenticate);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.patch('/:id/status', updateInvoiceStatus);
router.post('/:id/payments', recordPayment);
router.delete('/:id', deleteInvoice);
router.get('/:id/pdf', downloadInvoicePdf);
router.get('/:id/docx', downloadInvoiceDocx);

export default router;
