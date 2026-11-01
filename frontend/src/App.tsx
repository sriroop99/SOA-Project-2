import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpenseListPage } from './pages/ExpenseListPage';
import { ExpenseDetailPage } from './pages/ExpenseDetailPage';
import { AddEditExpensePage } from './pages/AddEditExpensePage';
import { ApprovalQueuePage } from './pages/ApprovalQueuePage';
import { BudgetManagementPage } from './pages/BudgetManagementPage';
import { BudgetReconciliationPage } from './pages/BudgetReconciliationPage';
import { AnalyticsReportsPage } from './pages/AnalyticsReportsPage';
import { DepartmentManagementPage } from './pages/DepartmentManagementPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AuditHistoryPage } from './pages/AuditHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">
        Authenticating SpendWise Session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated Dashboard & Microservice Views */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="expenses" element={<ExpenseListPage />} />
              <Route path="expenses/new" element={<AddEditExpensePage />} />
              <Route path="expenses/:id" element={<ExpenseDetailPage />} />
              <Route path="expenses/:id/edit" element={<AddEditExpensePage />} />

              <Route
                path="approvals"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'FINANCE_MANAGER']}>
                    <ApprovalQueuePage />
                  </ProtectedRoute>
                }
              />

              <Route path="budgets" element={<BudgetManagementPage />} />
              <Route path="reconciliation" element={<BudgetReconciliationPage />} />
              <Route path="reports" element={<AnalyticsReportsPage />} />
              <Route path="departments" element={<DepartmentManagementPage />} />

              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />

              <Route path="audit" element={<AuditHistoryPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
