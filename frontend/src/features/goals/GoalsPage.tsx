import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowRight, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import type { ApiCategory, ApiGoal } from '../../types';
import { useAuthStore } from '../auth/store';

export function GoalsPage() {
  const client = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiGoal | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [currency, setCurrency] = useState(user?.default_currency ?? 'BRL');
  const [error, setError] = useState('');
  const goals = useQuery({ queryKey: ['goals'], queryFn: async () => (await api.get<ApiGoal[]>('/goals')).data });
  const categories = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<ApiCategory[]>('/categories')).data });
  const available = (categories.data ?? []).filter((category) => category.type === 'expense' && !(goals.data ?? []).some((goal) => goal.is_active && goal.category_id === category.id));
  const invalidate = async () => Promise.all([client.invalidateQueries({ queryKey: ['goals'] }), client.invalidateQueries({ queryKey: ['dashboard'] })]);
  const save = useMutation({
    mutationFn: async () => editing
      ? api.patch(`/goals/${editing.id}`, { monthly_limit: Number(limit), currency })
      : api.post('/goals', { category_id: categoryId || available[0]?.id, monthly_limit: Number(limit), currency }),
    onSuccess: async () => { closeForm(); await invalidate(); },
    onError: (cause) => setError(axios.isAxiosError<{ detail?: string }>(cause) ? cause.response?.data?.detail ?? 'Não foi possível salvar a meta.' : 'Não foi possível salvar a meta.')
  });
  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/goals/${id}`),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível excluir a meta.')
  });
  const active = (goals.data ?? []).filter((goal) => goal.is_active);
  const planned = active.reduce((sum, goal) => sum + Number(goal.monthly_limit), 0);
  const spent = active.reduce((sum, goal) => sum + Number(goal.current_month_spent), 0);
  const totalPercent = planned ? Math.round(spent / planned * 100) : 0;

  function closeForm() { setOpen(false); setEditing(null); setCategoryId(''); setLimit(''); setCurrency(user?.default_currency ?? 'BRL'); setError(''); }
  function openCreate() { setEditing(null); setCategoryId(''); setLimit(''); setCurrency(user?.default_currency ?? 'BRL'); setError(''); setOpen(true); }
  function openEdit(goal: ApiGoal) { setEditing(goal); setCategoryId(goal.category_id); setLimit(String(goal.monthly_limit)); setCurrency(goal.currency); setError(''); setOpen(true); }
  function removeGoal(goal: ApiGoal) { if (window.confirm(`Excluir a meta de ${goal.category_name}?`)) remove.mutate(goal.id); }

  return <div className='feature-page'>
    <PageHeader title='Metas do mês' description='Limites claros para decidir com antecedência, sem culpa.' action={<button className='primary-button compact' onClick={openCreate}><Plus size={17} />Nova meta</button>} />
    {open && <form className='inline-form' onSubmit={(event: FormEvent) => { event.preventDefault(); setError(''); save.mutate(); }}><label>Categoria<select required value={categoryId || editing?.category_id || available[0]?.id || ''} disabled={Boolean(editing)} onChange={(event) => setCategoryId(event.target.value)}>{editing && <option value={editing.category_id}>{editing.category_name}</option>}{!editing && available.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Limite mensal<input autoFocus required type='number' min='0.01' step='0.01' value={limit} onChange={(event) => setLimit(event.target.value)} /></label><label>Moeda<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value='BRL'>BRL</option><option value='USD'>USD</option><option value='EUR'>EUR</option></select></label><button className='primary-button compact' disabled={(!editing && !available.length) || save.isPending}>{save.isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar'}</button><button type='button' className='icon-button' aria-label='Cancelar' onClick={closeForm}><X size={18} /></button>{error && <p className='form-error' role='alert'>{error}</p>}</form>}
    {!open && error && <p className='form-error page-feedback' role='alert'>{error}</p>}
    {goals.isError && <p className='form-error' role='alert'>Não foi possível carregar as metas.</p>}
    {goals.isFetching && <p className='empty-row' role='status'>Carregando metas...</p>}
    {remove.isPending && <p className='empty-row' role='status'>Excluindo meta...</p>}
    <div className='goal-overview'><div><Target /><span>{active.length} metas ativas<strong>{formatMoney(planned, user?.default_currency ?? 'BRL')} planejados</strong></span></div><p>Você utilizou {totalPercent}% dos limites definidos neste mês.</p></div>
    <section className='goal-board' aria-busy={goals.isLoading}>{active.map((goal) => { const percent = Math.round(Number(goal.current_month_spent) / Number(goal.monthly_limit) * 100); return <article key={goal.id} className={goal.is_exceeded ? 'exceeded' : ''}><header><span>{goal.category_name}</span><em>{percent}%</em></header><strong>{formatMoney(Number(goal.current_month_spent), goal.currency)} <small>de {formatMoney(Number(goal.monthly_limit), goal.currency)}</small></strong><div className='goal-track'><span style={{ width: `${Math.min(percent, 100)}%` }} /></div><footer><span>{goal.is_exceeded ? 'Limite ultrapassado' : 'Dentro do planejado'}</span><span className='row-actions'><button onClick={() => openEdit(goal)} aria-label={`Editar meta de ${goal.category_name}`}><Pencil size={14} /></button><button onClick={() => removeGoal(goal)} aria-label={`Excluir meta de ${goal.category_name}`}><Trash2 size={14} /></button></span></footer></article>; })}{!goals.isLoading && !active.length && <p className='empty-row'>Nenhuma meta ativa. Crie uma para acompanhar seus gastos.</p>}</section>
    <section className='category-limits'><header><h2>Progresso por categoria</h2><p>Valores calculados a partir das transações reais do mês.</p></header>{active.map((goal) => { const percent = Math.round(Number(goal.current_month_spent) / Number(goal.monthly_limit) * 100); return <div key={goal.id} className={goal.is_exceeded ? 'exceeded' : ''}><span className='category-color' /><strong>{goal.category_name}</strong><div className='comparison-track'><span style={{ width: `${Math.min(percent, 100)}%` }} /></div><em>{percent}%</em><ArrowRight size={15} /></div>; })}</section>
  </div>;
}
