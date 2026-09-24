export type TransactionType = "expense" | "income";

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  default_currency: string;
}

export interface Transaction {
  id: string;
  description: string;
  categoryName: string;
  type: TransactionType;
  amount: number;
  currency: string;
  transactionDate: string;
  icon: string;
}

export interface Goal {
  id: string;
  name: string;
  current: number;
  limit: number;
  icon: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
  icon: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  is_system: boolean;
}

export interface ApiTransaction {
  id: string;
  category_id: string;
  category_name: string;
  category_icon: string | null;
  fixed_expense_id: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  transaction_date: string;
  is_paid: boolean;
}

export interface TransactionPage {
  items: ApiTransaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiFixedExpense {
  id: string;
  category_id: string;
  description: string;
  amount: number;
  currency: string;
  due_day: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface ApiGoal {
  id: string;
  category_id: string;
  category_name: string;
  monthly_limit: number;
  currency: string;
  current_month_spent: number;
  is_exceeded: boolean;
  is_active: boolean;
}

export interface ApiSavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  currency: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface ExpenseByCategory {
  category_id: string;
  category_name: string;
  total: number;
  percentage: number;
}

export interface TimelinePoint {
  date: string;
  total_income: number;
  total_expense: number;
}

export interface DashboardSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  savings_movement: number;
  currency: string;
  expenses_by_category: ExpenseByCategory[];
  timeline: TimelinePoint[];
}

export interface NotificationPreference {
  notify_goal_exceeded: boolean;
  notify_fixed_expense_due: boolean;
  fixed_expense_due_days_before: number;
}
