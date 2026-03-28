import { Router } from 'express';
import authRoutes from './auth.routes';
import leadsRoutes from './leads.routes';
import contactsRoutes from './contacts.routes';
import dealsRoutes from './deals.routes';
import tasksRoutes from './tasks.routes';
import preferencesRoutes from './preferences.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/leads', leadsRoutes);
router.use('/contacts', contactsRoutes);
router.use('/deals', dealsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/preferences', preferencesRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
