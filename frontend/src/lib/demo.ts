import type { FixedExpense, Goal, Transaction } from "../types";

export const flowData = [
  { day: "1", income: 320, expense: 90 },
  { day: "4", income: 450, expense: 110 },
  { day: "7", income: 280, expense: 165 },
  { day: "10", income: 415, expense: 90 },
  { day: "13", income: 265, expense: 180 },
  { day: "16", income: 360, expense: 120 },
  { day: "19", income: 240, expense: 210 },
  { day: "22", income: 310, expense: 115 },
  { day: "25", income: 225, expense: 250 },
  { day: "28", income: 290, expense: 135 },
  { day: "30", income: 210, expense: 95 }
];

export const categories = [
  { name: "Alimentação", value: 1047, color: "#dfa8b8" },
  { name: "Moradia", value: 897, color: "#b4a6df" },
  { name: "Transporte", value: 449, color: "#9adbc5" },
  { name: "Compras", value: 374, color: "#8fc8d2" },
  { name: "Saúde", value: 299, color: "#d4c3ea" },
  { name: "Outros", value: 674, color: "#cfd5da" }
];

export const goals: Goal[] = [
  { id: "1", name: "Viagem para o Japão", current: 7200, limit: 12000, icon: "plane" },
  { id: "2", name: "Entrada do apê", current: 18000, limit: 50000, icon: "house" },
  { id: "3", name: "Pós-graduação", current: 4800, limit: 20000, icon: "study" }
];

export const fixedExpenses: FixedExpense[] = [
  { id: "1", name: "Aluguel", dueDate: "2026-10-05", amount: 1200, icon: "house" },
  { id: "2", name: "Cartão Nubank", dueDate: "2026-10-10", amount: 860, icon: "card" },
  { id: "3", name: "Plano de saúde", dueDate: "2026-10-12", amount: 350, icon: "heart" },
  { id: "4", name: "Internet", dueDate: "2026-10-15", amount: 120, icon: "wifi" },
  { id: "5", name: "Academia", dueDate: "2026-10-18", amount: 99.9, icon: "fitness" }
];

export const transactions: Transaction[] = [
  { id: "1", description: "Supermercado Pão de Açúcar", categoryName: "Alimentação", type: "expense", amount: 182.4, currency: "BRL", transactionDate: "2026-09-28", icon: "food" },
  { id: "2", description: "Freelance — Projeto Site", categoryName: "Receitas", type: "income", amount: 1800, currency: "BRL", transactionDate: "2026-09-27", icon: "work" },
  { id: "3", description: "Uber", categoryName: "Transporte", type: "expense", amount: 34.9, currency: "BRL", transactionDate: "2026-09-26", icon: "car" },
  { id: "4", description: "Farmácia Drogasil", categoryName: "Saúde", type: "expense", amount: 56.3, currency: "BRL", transactionDate: "2026-09-25", icon: "health" },
  { id: "5", description: "Restaurante Maní", categoryName: "Alimentação", type: "expense", amount: 168, currency: "BRL", transactionDate: "2026-09-24", icon: "food" }
];
