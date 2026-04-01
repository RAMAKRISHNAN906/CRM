import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from './store/themeStore';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/modules/LeadsPage';
import { ContactsPage } from './pages/modules/ContactsPage';
import { DealsPage } from './pages/modules/DealsPage';
import { TasksPage } from './pages/modules/TasksPage';
import { PipelinePage } from './pages/modules/PipelinePage';
import { ReportsPage } from './pages/modules/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { initializeTheme } from './store/themeStore';
import { BackgroundEffect } from './components/layout/BackgroundEffect';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-loaded modules
const AccountsPage     = lazy(() => import('./pages/modules/AccountsPage'));
const TicketsPage      = lazy(() => import('./pages/modules/TicketsPage'));
const AutomationPage   = lazy(() => import('./pages/modules/AutomationPage'));
const InvoicesPage     = lazy(() => import('./pages/modules/InvoicesPage'));
const TeamPage         = lazy(() => import('./pages/modules/TeamPage'));
const AdvancedReportsPage = lazy(() => import('./pages/modules/AdvancedReportsPage'));
const SalesPage        = lazy(() => import('./pages/modules/SalesPage').then(m => ({ default: m.SalesPage })));
const CRMPage          = lazy(() => import('./pages/modules/CRMPage').then(m => ({ default: m.CRMPage })));
const AccountingPage   = lazy(() => import('./pages/modules/AccountingPage').then(m => ({ default: m.AccountingPage })));
const ProcurementPage  = lazy(() => import('./pages/modules/ProcurementPage').then(m => ({ default: m.ProcurementPage })));
const StockPage        = lazy(() => import('./pages/modules/StockPage').then(m => ({ default: m.StockPage })));
const ManufacturingPage = lazy(() => import('./pages/modules/ManufacturingPage').then(m => ({ default: m.ManufacturingPage })));
const ProjectsPage     = lazy(() => import('./pages/modules/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const AssetsPage       = lazy(() => import('./pages/modules/AssetsPage').then(m => ({ default: m.AssetsPage })));
const POSPage          = lazy(() => import('./pages/modules/POSPage').then(m => ({ default: m.POSPage })));
const QualityPage      = lazy(() => import('./pages/modules/QualityPage').then(m => ({ default: m.QualityPage })));
const HRPage           = lazy(() => import('./pages/modules/HRPage').then(m => ({ default: m.HRPage })));
const CalendarPage     = lazy(() => import('./pages/modules/CalendarPage').then(m => ({ default: m.CalendarPage })));
const EmailPage        = lazy(() => import('./pages/modules/EmailPage').then(m => ({ default: m.EmailPage })));
const DocumentsPage    = lazy(() => import('./pages/modules/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const IntegrationsPage = lazy(() => import('./pages/modules/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));
const ProductsPage     = lazy(() => import('./pages/modules/ProductsPage').then(m => ({ default: m.ProductsPage })));
const QuotesPage       = lazy(() => import('./pages/modules/QuotesPage').then(m => ({ default: m.QuotesPage })));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false },
  },
});

const App: React.FC = () => {
  const { isDark } = useThemeStore();

  useEffect(() => { initializeTheme(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BackgroundEffect />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"      element={<DashboardPage />} />

              {/* Core */}
              <Route path="leads"          element={<LeadsPage />} />
              <Route path="contacts"       element={<ContactsPage />} />
              <Route path="deals"          element={<DealsPage />} />
              <Route path="tasks"          element={<TasksPage />} />
              <Route path="pipeline"       element={<PipelinePage />} />
              <Route path="reports"        element={<ReportsPage />} />

              {/* Sales & CRM */}
              <Route path="sales"          element={<S><SalesPage /></S>} />
              <Route path="crm"            element={<S><CRMPage /></S>} />
              <Route path="accounts"       element={<S><AccountsPage /></S>} />
              <Route path="quotes"         element={<S><QuotesPage /></S>} />
              <Route path="products"       element={<S><ProductsPage /></S>} />

              {/* Accounting & Finance */}
              <Route path="accounting"     element={<S><AccountingPage /></S>} />
              <Route path="invoices"       element={<S><InvoicesPage /></S>} />
              <Route path="assets"         element={<S><AssetsPage /></S>} />

              {/* Operations */}
              <Route path="procurement"    element={<S><ProcurementPage /></S>} />
              <Route path="stock"          element={<S><StockPage /></S>} />
              <Route path="manufacturing"  element={<S><ManufacturingPage /></S>} />
              <Route path="projects"       element={<S><ProjectsPage /></S>} />
              <Route path="pos"            element={<S><POSPage /></S>} />
              <Route path="quality"        element={<S><QualityPage /></S>} />

              {/* Service */}
              <Route path="support"        element={<S><TicketsPage /></S>} />
              <Route path="tickets"        element={<S><TicketsPage /></S>} />

              {/* HR */}
              <Route path="hr"             element={<S><HRPage /></S>} />
              <Route path="team"           element={<S><TeamPage /></S>} />

              {/* Other */}
              <Route path="calendar"       element={<S><CalendarPage /></S>} />
              <Route path="email"          element={<S><EmailPage /></S>} />
              <Route path="documents"      element={<S><DocumentsPage /></S>} />
              <Route path="automation"     element={<S><AutomationPage /></S>} />
              <Route path="integrations"   element={<S><IntegrationsPage /></S>} />
              <Route path="analytics"      element={<S><AdvancedReportsPage /></S>} />

              <Route path="settings"       element={<SettingsPage />} />
              <Route path="*"              element={<NotFoundPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: isDark ? '#18181b' : '#ffffff',
            color: isDark ? '#fff' : '#0f0f1a',
            border: isDark ? '1px solid #2a2a38' : '1px solid #d4d4e0',
            borderRadius: '12px', fontSize: '14px',
            padding: '12px 16px', maxWidth: '380px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: isDark ? '#18181b' : '#ffffff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: isDark ? '#18181b' : '#ffffff' } },
        }}
      />
    </QueryClientProvider>
  );
};

export default App;
