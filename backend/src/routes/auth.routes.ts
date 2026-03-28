import { Router } from 'express';
import { register, login, refresh, logout, getMe, changePassword } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import { registerSchema, loginSchema, refreshSchema } from '../utils/validation';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

export default router;
