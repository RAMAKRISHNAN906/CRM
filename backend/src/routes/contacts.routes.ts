import { Router } from 'express';
import { getContacts, getContact, createContact, updateContact, deleteContact } from '../controllers/contacts.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { contactSchema } from '../utils/validation';

const router = Router();
router.use(authenticate);

router.get('/', getContacts);
router.get('/:id', getContact);
router.post('/', validate(contactSchema), createContact);
router.put('/:id', validate(contactSchema.partial()), updateContact);
router.delete('/:id', deleteContact);

export default router;
