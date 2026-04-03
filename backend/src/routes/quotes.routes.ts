import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getQuotes, getQuote, createQuote, updateQuote, deleteQuote, convertQuote,
  getPaymentTerms, createPaymentTerm, updatePaymentTerm, deletePaymentTerm,
  downloadPdf,
} from '../controllers/quotes.controller';

const router = Router();
router.use(authenticate);

// Payment terms (must be before /:id)
router.get('/payment-terms', getPaymentTerms);
router.post('/payment-terms', createPaymentTerm);
router.put('/payment-terms/:id', updatePaymentTerm);
router.delete('/payment-terms/:id', deletePaymentTerm);

// Quotes CRUD
router.get('/', getQuotes);
router.post('/', createQuote);
router.get('/:id', getQuote);
router.put('/:id', updateQuote);
router.delete('/:id', deleteQuote);
router.post('/:id/convert', convertQuote);
router.get('/:id/pdf', downloadPdf);

export default router;
