import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Outlet, useLocation } from "react-router-dom";
import { AuthPage } from "./features/auth/AuthPage";
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { CategoriesPage } from "./features/categories/CategoriesPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { FixedExpensesPage } from "./features/fixed-expenses/FixedExpensesPage";
import { GoalsPage } from "./features/goals/GoalsPage";
import { SavingsGoalsPage } from "./features/savings-goals/SavingsGoalsPage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TransactionsPage } from "./features/transactions/TransactionsPage";
import { useAuthStore } from "./features/auth/store";
import { useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createWorkspaceQueryClient } from './lib/queryClient';
import { PreviewLayout } from './features/preview/PreviewLayout';
import { CookieBanner } from './features/legal/CookieBanner';
import { LegalPage } from './features/legal/LegalPage';
import { NotFoundPage } from './features/legal/NotFoundPage';

function RequireAuth() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();
  const client = useMemo(() => token ? createWorkspaceQueryClient() : null, [token]);

  return token && client ? <QueryClientProvider client={client}><Outlet /></QueryClientProvider> : <Navigate to="/login" replace state={{ from: location }} />;
}

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/termos-de-uso" element={<LegalPage key="terms" kind="terms" />} />
      <Route path="/politica-de-privacidade" element={<LegalPage key="privacy" kind="privacy" />} />
      <Route path="/politica-de-cookies" element={<LegalPage key="cookies" kind="cookies" />} />
      <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      <Route path="/register" element={<AuthPage key="register" mode="register" />} />
      <Route path="/forgot-password" element={<AuthPage key="forgot" mode="forgot" />} />
      <Route path='/reset-password' element={<ResetPasswordPage />} />
      <Route path="/preview" element={<PreviewLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="fixed-expenses" element={<FixedExpensesPage />} />
        <Route path="limits" element={<GoalsPage />} />
        <Route path="goals" element={<SavingsGoalsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/preview/*" element={<NotFoundPage preview />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="fixed-expenses" element={<FixedExpensesPage />} />
          <Route path="limits" element={<GoalsPage />} />
          <Route path="goals" element={<SavingsGoalsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <CookieBanner />
    </>
  );
}
