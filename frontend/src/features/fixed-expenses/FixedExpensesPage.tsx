import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CalendarClock, Check, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { ApiCategory, ApiFixedExpense } from "../../types";
import { useAuthStore } from "../auth/store";

const today = new Date().toISOString().slice(0, 10);
export function FixedExpensesPage() {
  const client = useQueryClient(); const user = useAuthStore((s) => s.user); const [open, setOpen] = useState(false); const [error, setError] = useState("");
  const [form, setForm] = useState({ description: "", amount: "", category_id: "", due_day: "10", start_date: today });
  const expenses = useQuery({ queryKey: ["fixed-expenses"], queryFn: async () => (await api.get<ApiFixedExpense[]>("/fixed-expenses")).data });
  const categories = useQuery({ queryKey: ["categories"], queryFn: async () => (await api.get<ApiCategory[]>("/categories")).data });
  const expenseCategories = (categories.data ?? []).filter((c) => c.type === "expense");
  const create = useMutation({ mutationFn: async () => api.post("/fixed-expenses", { ...form, amount: Number(form.amount), due_day: Number(form.due_day), category_id: form.category_id || expenseCategories[0]?.id, currency: user?.default_currency ?? "BRL" }), onSuccess: async () => { setOpen(false); setForm({ description: "", amount: "", category_id: "", due_day: "10", start_date: today }); await Promise.all([client.invalidateQueries({queryKey:["fixed-expenses"]}), client.invalidateQueries({queryKey:["dashboard"]})]); }, onError: (err) => setError(axios.isAxiosError<{detail?:string}>(err) ? err.response?.data?.detail ?? "Não foi possível salvar." : "Não foi possível salvar.") });
  const deactivate = useMutation({ mutationFn: async (id:string) => api.delete(`/fixed-expenses/${id}`), onSuccess: async () => client.invalidateQueries({queryKey:["fixed-expenses"]}) });
  const active = useMemo(() => (expenses.data ?? []).filter((e) => e.is_active), [expenses.data]); const forecast = active.reduce((sum,e) => sum + Number(e.amount), 0);
  return <div className="feature-page"><PageHeader title="Gastos fixos" description="O que se repete no mês aparece antes de virar surpresa." action={<button className="primary-button compact" onClick={() => setOpen(true)}><Plus size={17} />Novo gasto fixo</button>} />
    {open && <form className="inline-form" onSubmit={(e:FormEvent) => { e.preventDefault(); setError(""); create.mutate(); }}><label>Descrição<input required value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} autoFocus /></label><label>Valor<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})} /></label><label>Categoria<select required value={form.category_id || expenseCategories[0]?.id || ""} onChange={(e)=>setForm({...form,category_id:e.target.value})}>{expenseCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Dia do vencimento<input required type="number" min="1" max="31" value={form.due_day} onChange={(e)=>setForm({...form,due_day:e.target.value})} /></label><label>Início<input required type="date" value={form.start_date} onChange={(e)=>setForm({...form,start_date:e.target.value})} /></label><button className="primary-button compact" disabled={create.isPending || !expenseCategories.length}>Salvar</button><button type="button" className="icon-button" aria-label="Cancelar" onClick={()=>setOpen(false)}><X size={18}/></button>{error && <p className="form-error">{error}</p>}</form>}
    <section className="recurrence-band"><div><CalendarClock /><span>Previsão mensal<strong>{formatMoney(forecast)}</strong></span></div><p>{active.length} compromissos ativos</p></section>
    <section className="record-list" aria-busy={expenses.isLoading}><header><span>Descrição</span><span>Vencimento</span><span>Valor</span><span>Status</span><span /></header>{active.map((expense,index)=><article key={expense.id}><div><span className="record-index">{String(index+1).padStart(2,"0")}</span><strong>{expense.description}</strong><small>Recorrência mensal</small></div><span>Dia {expense.due_day}</span><strong>{formatMoney(Number(expense.amount))}</strong><span className="status active">Ativo</span><button aria-label={`Desativar ${expense.description}`} onClick={()=>deactivate.mutate(expense.id)}><Trash2 size={17}/></button></article>)}{!expenses.isLoading && !active.length && <p className="empty-row">Nenhum gasto fixo ativo.</p>}</section>
    <div className="quiet-note"><Check size={17}/><p>Alterações em gastos fixos afetam somente os próximos lançamentos. O histórico permanece intacto.</p></div>
  </div>;
}
