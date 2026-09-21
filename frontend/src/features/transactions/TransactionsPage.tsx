import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "../../components/PageHeader";
import { transactions as initialTransactions } from "../../lib/demo";
import { formatMoney, formatShortDate } from "../../lib/format";
import type { Transaction } from "../../types";

const transactionSchema = z.object({
  description: z.string().min(2, "Descreva a transação"),
  amount: z.coerce.number().positive("Informe um valor maior que zero"),
  type: z.enum(["expense", "income"]),
  categoryName: z.string().min(1),
  transactionDate: z.string().min(1)
});
type TransactionForm = z.infer<typeof transactionSchema>;

export function TransactionsPage() {
  const [items, setItems] = useState(initialTransactions);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const visible = useMemo(() => items.filter((item) => item.description.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: "expense", transactionDate: "2026-09-21", categoryName: "Alimentação" }
  });

  const addTransaction = (values: TransactionForm) => {
    const item: Transaction = { id: crypto.randomUUID(), currency: "BRL", icon: "entry", ...values };
    setItems((current) => [item, ...current]);
    reset();
    setDrawerOpen(false);
  };

  return <div className="feature-page">
    <PageHeader title="Transações" description="Cada movimento do seu dinheiro, pesquisável e explicado." action={<button className="primary-button compact" onClick={() => setDrawerOpen(true)}><Plus size={17} />Nova transação</button>} />
    <section className="filter-strip">
      <label className="table-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por descrição" /></label>
      <button><CalendarDays size={16} />1–30 set 2026</button><button><Filter size={16} />Todas as categorias</button><button><SlidersHorizontal size={16} />Mais filtros</button>
    </section>
    <section className="ledger-surface">
      <div className="ledger-summary"><span>Saldo do período<strong>{formatMoney(2460)}</strong></span><span>Receitas<strong className="positive">{formatMoney(6200)}</strong></span><span>Gastos<strong className="negative">{formatMoney(3740)}</strong></span></div>
      <div className="feature-table"><div className="feature-row feature-row-head"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Tipo</span><span>Valor</span></div>{visible.map((item) => <div className="feature-row" key={item.id}><span>{formatShortDate(item.transactionDate)}</span><strong>{item.description}</strong><span>{item.categoryName}</span><span>{item.type === "expense" ? "Gasto" : "Receita"}</span><strong className={item.type === "expense" ? "negative" : "positive"}>{item.type === "expense" ? "−" : "+"} {formatMoney(item.amount)}</strong></div>)}</div>
    </section>
    {drawerOpen && <><button className="drawer-scrim" aria-label="Fechar formulário" onClick={() => setDrawerOpen(false)} /><aside className="entry-drawer"><header><div><h2>Nova transação</h2><p>Registre em poucos campos.</p></div><button onClick={() => setDrawerOpen(false)}>Fechar</button></header><form onSubmit={handleSubmit(addTransaction)}><label>Descrição<input {...register("description")} />{errors.description && <small>{errors.description.message}</small>}</label><div className="field-pair"><label>Valor<input type="number" step="0.01" {...register("amount")} />{errors.amount && <small>{errors.amount.message}</small>}</label><label>Tipo<select {...register("type")}><option value="expense">Gasto</option><option value="income">Receita</option></select></label></div><label>Categoria<select {...register("categoryName")}><option>Alimentação</option><option>Moradia</option><option>Transporte</option><option>Salário</option></select></label><label>Data<input type="date" {...register("transactionDate")} /></label><button className="primary-button" type="submit">Salvar transação</button></form></aside></>}
  </div>;
}
