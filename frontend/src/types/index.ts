export type TransactionType = "expense" | "income";

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
