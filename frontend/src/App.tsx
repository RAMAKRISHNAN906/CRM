import React, { useEffect } from 'react';
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

// New enterprise modules (lazy loaded for performance)
import { lazy, Suspense } from 'react';
const AccountsPage = lazy(() => import('./pages/modules/AccountsPage'));
const TicketsPage = lazy(() => import('./pages/modules/TicketsPage'));
const AutomationPage = lazy(() => import('./pages/modules/AutomationPage'));
const InvoicesPage = lazy(() => import('./pages/modules/InvoicesPage'));
const TeamPage = lazy(() => import('./pages/modules/TeamPage'));
const AdvancedReportsPage = lazy(() => import('./pages/modules/AdvancedReportsPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  const { isDark } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BackgroundEffect />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Core CRM */}
              <Route path="leads" element={<LeadsPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="deals" element={<DealsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="reports" element={<ReportsPage />} />

              {/* Enterprise modules */}
              <Route path="accounts" element={<Suspense fallback={<PageLoader />}><AccountsPage /></Suspense>} />
              <Route path="tickets" element={<Suspense fallback={<PageLoader />}><TicketsPage /></Suspense>} />
              <Route path="automation" element={<Suspense fallback={<PageLoader />}><AutomationPage /></Suspense>} />
              <Route path="invoices" element={<Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>} />
              <Route path="team" element={<Suspense fallback={<PageLoader />}><TeamPage /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AdvancedReportsPage /></Suspense>} />

              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
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
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
            maxWidth: '380px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: isDark ? '#18181b' : '#ffffff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: isDark ? '#18181b' : '#ffffff' },
          },
        }}
      />
    </QueryClientProvider>
  );
};

export default App;
