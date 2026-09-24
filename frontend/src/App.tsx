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

function RequireAuth() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  return token ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path='/reset-password' element={<ResetPasswordPage />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
