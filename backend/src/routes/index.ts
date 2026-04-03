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
// ── Enterprise v2 routes ──────────────────────────────────────
import pipelineRoutes from './pipeline.routes';
import quotesRoutes from './quotes.routes';
import purchaseOrdersRoutes from './purchaseOrders.routes';
import competitorsRoutes from './competitors.routes';
import festivalsRoutes from './festivals.routes';
import settingsRoutes from './settings.routes';
import subtasksRoutes from './subtasks.routes';
import exportRoutes from './export.routes';
import activitiesRoutes from './activities.routes';
import projectsRoutes from './projects.routes';
import countryTargetsRoutes from './countryTargets.routes';
import opportunitiesRoutes from './opportunities.routes';

const router = Router();

// Core auth
router.use('/auth', authRoutes);

// CRM modules
router.use('/leads', leadsRoutes);
router.use('/contacts', contactsRoutes);
router.use('/deals', dealsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/tasks', subtasksRoutes);   // subtasks nested under tasks
router.use('/accounts', accountsRoutes);
router.use('/communications', communicationsRoutes);
router.use('/activities', activitiesRoutes);
router.use('/projects',  projectsRoutes);
router.use('/country-targets',  countryTargetsRoutes);
router.use('/opportunities',    opportunitiesRoutes);
router.use('/tickets', ticketsRoutes);

// Finance
router.use('/invoices', invoicesRoutes);
router.use('/quotes', quotesRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);

// Pipeline (dynamic stages + demo details)
router.use('/pipeline', pipelineRoutes);

// Sales intelligence
router.use('/competitors', competitorsRoutes);

// Engagement & automation
router.use('/festivals', festivalsRoutes);

// Automation & integrations
router.use('/automation', automationRoutes);
router.use('/webhooks', webhooksRoutes);

// Analytics & exports
router.use('/reports', reportsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/export', exportRoutes);

// User & settings
router.use('/preferences', preferencesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/teams', teamsRoutes);
router.use('/settings', settingsRoutes);

export default router;
