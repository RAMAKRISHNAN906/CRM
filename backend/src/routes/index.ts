import { Router } from 'express';
import authRoutes from './auth.routes';
import leadsRoutes from './leads.routes';
import contactsRoutes from './contacts.routes';
import dealsRoutes from './deals.routes';
import tasksRoutes from './tasks.routes';
import preferencesRoutes from './preferences.routes';
import dashboardRoutes from './dashboard.routes';
import accountsRoutes from './accounts.routes';
import teamsRoutes from './teams.routes';
import communicationsRoutes from './communications.routes';
import ticketsRoutes from './tickets.routes';
import automationRoutes from './automation.routes';
import notificationsRoutes from './notifications.routes';
import invoicesRoutes from './invoices.routes';
import webhooksRoutes from './webhooks.routes';
import reportsRoutes from './reports.routes';

const router = Router();

// Core auth
router.use('/auth', authRoutes);

// CRM modules
router.use('/leads', leadsRoutes);
router.use('/contacts', contactsRoutes);
router.use('/deals', dealsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/accounts', accountsRoutes);
router.use('/communications', communicationsRoutes);
router.use('/tickets', ticketsRoutes);

// Finance
router.use('/invoices', invoicesRoutes);

// Automation & integrations
router.use('/automation', automationRoutes);
router.use('/webhooks', webhooksRoutes);

// Analytics
router.use('/reports', reportsRoutes);
router.use('/dashboard', dashboardRoutes);

// User & settings
router.use('/preferences', preferencesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/teams', teamsRoutes);

export default router;
