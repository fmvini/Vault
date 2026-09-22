import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CalendarDays, Filter, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { PageHeader } from "../../components/PageHeader";
import { useAuthStore } from "../auth/store";
import { api } from "../../lib/api";
import { formatMoney, formatShortDate } from "../../lib/format";
import type { ApiCategory, TransactionPage, TransactionType } from "../../types";

const transactionSchema = z.object({
  description: z.string().min(2, "Descreva a transação"),
  amount: z.coerce.number().positive("Informe um valor maior que zero"),
  type: z.enum(["expense", "income"]),
  category_id: z.string().min(1, "Selecione uma categoria"),
  transaction_date: z.string().min(1, "Informe a data")
});
type TransactionForm = z.infer<typeof transactionSchema>;

const today = new Date().toISOString().slice(0, 10);

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const requestedSearch = searchParams.get("q") ?? "";
  const shouldOpenNew = searchParams.get("new") === "1";
  const [drawerOpen, setDrawerOpen] = useState(shouldOpenNew);
  const [search, setSearch] = useState(requestedSearch);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formError, setFormError] = useState("");
  const drawerRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<ApiCategory[]>("/categories")).data
  });
  const transactionsQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => (await api.get<TransactionPage>("/transactions", { params: { page_size: 100 } })).data
  });

  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: "expense", transaction_date: today, category_id: "", description: "" }
  });
  const selectedType = watch("type");
  const descriptionField = register("description");
  const selectableCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.type === selectedType),
    [categoriesQuery.data, selectedType]
  );

  useEffect(() => setSearch(requestedSearch), [requestedSearch]);
  useEffect(() => {
    if (shouldOpenNew) setDrawerOpen(true);
  }, [shouldOpenNew]);
  useEffect(() => {
    const currentCategory = getValues("category_id");
    if (!selectableCategories.some((category) => category.id === currentCategory)) {
      setValue("category_id", selectableCategories[0]?.id ?? "");
    }
  }, [getValues, selectableCategories, setValue]);
  useEffect(() => {
    if (!drawerOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appShell = document.querySelector<HTMLElement>(".app-shell");
    appShell?.setAttribute("inert", "");
    firstFieldRef.current?.focus();
    return () => {
      appShell?.removeAttribute("inert");
      opener?.focus();
    };
  }, [drawerOpen]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setFormError("");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("new");
    setSearchParams(nextParams, { replace: true });
  };

  const handleDrawerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const createTransaction = useMutation({
    mutationFn: async (values: TransactionForm) => (await api.post("/transactions", {
      ...values,
      currency: user?.default_currency ?? "BRL"
    })).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["goals"] })
      ]);
      reset({ type: "expense", transaction_date: today, category_id: "", description: "" });
      closeDrawer();
    },
    onError: (error) => {
      const detail = axios.isAxiosError<{ detail?: string }>(error) ? error.response?.data?.detail : undefined;
      setFormError(detail || "Não foi possível salvar a transação. Tente novamente.");
    }
  });

  const items = useMemo(() => transactionsQuery.data?.items ?? [], [transactionsQuery.data?.items]);
  const visible = useMemo(() => items.filter((item) => {
    const matchesSearch = (item.description ?? "Sem descrição").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || item.category_id === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  }), [categoryFilter, items, search, typeFilter]);
  const income = items.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0);
  const expense = items.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), 0);

  return <div className="feature-page">
    <PageHeader title="Transações" description="Cada movimento do seu dinheiro, pesquisável e explicado." action={<button className="primary-button compact" onClick={() => setDrawerOpen(true)}><Plus size={17} />Nova transação</button>} />
    <section className="filter-strip">
      <label className="table-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por descrição" /></label>
      <span className="filter-control"><CalendarDays size={16} />Até {formatShortDate(today)}</span>
      <label className="filter-control"><Filter size={16} /><span className="sr-only">Filtrar por tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TransactionType | "all")}><option value="all">Todos os tipos</option><option value="expense">Gastos</option><option value="income">Receitas</option></select></label>
      <label className="filter-control"><span className="sr-only">Filtrar por categoria</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Todas as categorias</option>{(categoriesQuery.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    </section>
    {transactionsQuery.isError && <p className="form-error" role="alert">Não foi possível carregar as transações.</p>}
    <section className="ledger-surface" aria-busy={transactionsQuery.isLoading}>
      <div className="ledger-summary"><span>Saldo do período<strong>{formatMoney(income - expense)}</strong></span><span>Receitas<strong className="positive">{formatMoney(income)}</strong></span><span>Gastos<strong className="negative">{formatMoney(expense)}</strong></span></div>
      <div className="feature-table"><div className="feature-row feature-row-head"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Tipo</span><span>Valor</span></div>{visible.map((item) => <div className="feature-row" key={item.id}><span>{formatShortDate(item.transaction_date)}</span><strong>{item.description || "Sem descrição"}</strong><span>{item.category_name}</span><span>{item.type === "expense" ? "Gasto" : "Receita"}</span><strong className={item.type === "expense" ? "negative" : "positive"}>{item.type === "expense" ? "−" : "+"} {formatMoney(Number(item.amount))}</strong></div>)}</div>
      {!transactionsQuery.isLoading && visible.length === 0 && <p className="empty-row">Nenhuma transação encontrada para estes filtros.</p>}
    </section>
    {drawerOpen && createPortal(<><button type="button" className="drawer-scrim" aria-label="Fechar formulário" onClick={closeDrawer} /><aside ref={drawerRef} className="entry-drawer" role="dialog" aria-modal="true" aria-labelledby="new-transaction-title" aria-describedby="new-transaction-description" onKeyDown={handleDrawerKeyDown}><header><div><h2 id="new-transaction-title">Nova transação</h2><p id="new-transaction-description">O lançamento será salvo no seu histórico.</p></div><button type="button" onClick={closeDrawer}>Fechar</button></header><form onSubmit={handleSubmit((values) => createTransaction.mutate(values))}><label>Descrição<input {...descriptionField} ref={(element) => { descriptionField.ref(element); firstFieldRef.current = element; }} />{errors.description && <small>{errors.description.message}</small>}</label><div className="field-pair"><label>Valor<input type="number" step="0.01" {...register("amount")} />{errors.amount && <small>{errors.amount.message}</small>}</label><label>Tipo<select {...register("type")}><option value="expense">Gasto</option><option value="income">Receita</option></select></label></div><label>Categoria<select {...register("category_id")} disabled={categoriesQuery.isLoading}><option value="">Selecione</option>{selectableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.category_id && <small>{errors.category_id.message}</small>}</label><label>Data<input type="date" {...register("transaction_date")} /></label>{formError && <p className="form-error" role="alert">{formError}</p>}<button className="primary-button" type="submit" disabled={createTransaction.isPending}>{createTransaction.isPending ? "Salvando..." : "Salvar transação"}</button></form></aside></>, document.body)}
  </div>;
}
