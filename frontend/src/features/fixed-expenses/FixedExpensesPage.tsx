import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CalendarClock, Check, PauseCircle, Pencil, PlayCircle, Plus, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import type { ApiCategory, ApiFixedExpense } from '../../types';
import { useAuthStore } from '../auth/store';

const today = new Date().toISOString().slice(0, 10);
const emptyForm = { description: '', amount: '', category_id: '', currency: 'BRL', due_day: '10', start_date: today, end_date: '' };

export function FixedExpensesPage() {
  const client = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiFixedExpense | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...emptyForm, currency: user?.default_currency ?? 'BRL' });
  const expenses = useQuery({ queryKey: ['fixed-expenses'], queryFn: async () => (await api.get<ApiFixedExpense[]>('/fixed-expenses')).data });
  const categories = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<ApiCategory[]>('/categories')).data });
  const expenseCategories = (categories.data ?? []).filter((category) => category.type === 'expense');
  const invalidate = async () => Promise.all([client.invalidateQueries({ queryKey: ['fixed-expenses'] }), client.invalidateQueries({ queryKey: ['dashboard'] }), client.invalidateQueries({ queryKey: ['transactions'] })]);
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, amount: Number(form.amount), due_day: Number(form.due_day), category_id: form.category_id || expenseCategories[0]?.id, end_date: form.end_date || null };
      return editing ? api.patch(`/fixed-expenses/${editing.id}`, payload) : api.post('/fixed-expenses', payload);
    },
    onSuccess: async () => { closeForm(); await invalidate(); },
    onError: (cause) => setError(axios.isAxiosError<{ detail?: string }>(cause) ? cause.response?.data?.detail ?? 'Não foi possível salvar.' : 'Não foi possível salvar.')
  });
  const toggleActive = useMutation({
    mutationFn: async (expense: ApiFixedExpense) => expense.is_active ? api.delete(`/fixed-expenses/${expense.id}`) : api.patch(`/fixed-expenses/${expense.id}`, { is_active: true }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível alterar o status do gasto fixo.')
  });
  const active = useMemo(() => (expenses.data ?? []).filter((expense) => expense.is_active), [expenses.data]);
  const forecast = active.reduce((sum, expense) => sum + Number(expense.amount), 0);

  function closeForm() { setOpen(false); setEditing(null); setError(''); setForm({ ...emptyForm, currency: user?.default_currency ?? 'BRL' }); }
  function openCreate() { setEditing(null); setError(''); setForm({ ...emptyForm, currency: user?.default_currency ?? 'BRL' }); setOpen(true); }
  function openEdit(expense: ApiFixedExpense) { setEditing(expense); setError(''); setForm({ description: expense.description, amount: String(expense.amount), category_id: expense.category_id, currency: expense.currency, due_day: String(expense.due_day), start_date: expense.start_date, end_date: expense.end_date ?? '' }); setOpen(true); }
  function changeStatus(expense: ApiFixedExpense) {
    const verb = expense.is_active ? 'desativar' : 'reativar';
    if (window.confirm(`Deseja ${verb} “${expense.description}”?`)) toggleActive.mutate(expense);
  }

  return <div className='feature-page'>
    <PageHeader title='Gastos fixos' description='O que se repete no mês aparece antes de virar surpresa.' action={<button className='primary-button compact' onClick={openCreate}><Plus size={17} />Novo gasto fixo</button>} />
    {open && <form className='inline-form' onSubmit={(event: FormEvent) => { event.preventDefault(); setError(''); save.mutate(); }}><label>Descrição<input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} autoFocus /></label><label>Valor<input required type='number' min='0.01' step='0.01' value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Moeda<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option value='BRL'>BRL</option><option value='USD'>USD</option><option value='EUR'>EUR</option></select></label><label>Categoria<select required value={form.category_id || expenseCategories[0]?.id || ''} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Dia do vencimento<input required type='number' min='1' max='31' value={form.due_day} onChange={(event) => setForm({ ...form, due_day: event.target.value })} /></label><label>Início<input required type='date' value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></label><label>Data final (opcional)<input type='date' min={form.start_date} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></label><button className='primary-button compact' disabled={save.isPending || !expenseCategories.length}>{save.isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar'}</button><button type='button' className='icon-button' aria-label='Cancelar' onClick={closeForm}><X size={18} /></button>{error && <p className='form-error' role='alert'>{error}</p>}</form>}
    {!open && error && <p className='form-error page-feedback' role='alert'>{error}</p>}
    {expenses.isError && <p className='form-error' role='alert'>Não foi possível carregar os gastos fixos.</p>}
    {expenses.isFetching && <p className='empty-row' role='status'>Carregando gastos fixos...</p>}
    {toggleActive.isPending && <p className='empty-row' role='status'>Atualizando gasto fixo...</p>}
    <section className='recurrence-band'><div><CalendarClock /><span>Previsão mensal<strong>{formatMoney(forecast, user?.default_currency ?? 'BRL')}</strong></span></div><p>{active.length} compromissos ativos · a geração mensal preserva os lançamentos anteriores</p></section>
    <section className='record-list' aria-busy={expenses.isLoading}><header><span>Descrição</span><span>Período</span><span>Valor</span><span>Status</span><span>Ações</span></header>{(expenses.data ?? []).map((expense, index) => <article key={expense.id} className={expense.is_active ? '' : 'is-inactive'}><div><span className='record-index'>{String(index + 1).padStart(2, '0')}</span><strong>{expense.description}</strong><small>Vence todo dia {expense.due_day}</small></div><span>{expense.start_date}{expense.end_date ? ` → ${expense.end_date}` : ' → contínuo'}</span><strong>{formatMoney(Number(expense.amount), expense.currency)}</strong><span className={expense.is_active ? 'status active' : 'status pending'}>{expense.is_active ? 'Ativo' : 'Inativo'}</span><span className='row-actions'><button aria-label={`Editar ${expense.description}`} onClick={() => openEdit(expense)}><Pencil size={16} /></button><button aria-label={expense.is_active ? `Desativar ${expense.description}` : `Reativar ${expense.description}`} onClick={() => changeStatus(expense)}>{expense.is_active ? <PauseCircle size={17} /> : <PlayCircle size={17} />}</button></span></article>)}{!expenses.isLoading && !expenses.data?.length && <p className='empty-row'>Nenhum gasto fixo cadastrado.</p>}</section>
    <div className='quiet-note'><Check size={17} /><p>Alterações em gastos fixos afetam somente os próximos lançamentos. O histórico permanece intacto.</p></div>
  </div>;
}
