import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { PiggyBank, Plus, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import type { ApiSavingsGoal } from '../../types';
import { useAuthStore } from '../auth/store';

function errorMessage(cause: unknown, fallback: string) {
  return axios.isAxiosError<{ detail?: string }>(cause) ? cause.response?.data?.detail ?? fallback : fallback;
}

export function SavingsGoalsPage() {
  const client = useQueryClient();
  const currency = useAuthStore((state) => state.user?.default_currency ?? 'BRL');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [depositId, setDepositId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const goals = useQuery({ queryKey: ['savings-goals'], queryFn: async () => (await api.get<ApiSavingsGoal[]>('/savings-goals')).data });
  const refresh = async () => Promise.all([
    client.invalidateQueries({ queryKey: ['savings-goals'] }),
    client.invalidateQueries({ queryKey: ['dashboard'] })
  ]);
  const create = useMutation({
    mutationFn: async () => api.post('/savings-goals', { name: name.trim(), target_amount: Number(target), currency }),
    onSuccess: async () => { setOpen(false); setName(''); setTarget(''); setError(''); await refresh(); },
    onError: (cause) => setError(errorMessage(cause, 'Não foi possível criar a meta.'))
  });
  const deposit = useMutation({
    mutationFn: async (id: string) => api.post(`/savings-goals/${id}/deposits`, { amount: Number(amount) }),
    onSuccess: async () => { setDepositId(null); setAmount(''); setError(''); await refresh(); },
    onError: (cause) => setError(errorMessage(cause, 'Não foi possível adicionar dinheiro.'))
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => api.post(`/savings-goals/${id}/cancel`),
    onSuccess: async () => { setError(''); await refresh(); },
    onError: (cause) => setError(errorMessage(cause, 'Não foi possível cancelar a meta.'))
  });
  const current = (goals.data ?? []).filter((goal) => goal.status !== 'cancelled');
  const cancelled = (goals.data ?? []).filter((goal) => goal.status === 'cancelled');

  return <div className='feature-page savings-page'>
    <PageHeader title='Metas' description='Guarde dinheiro para algo que você quer conquistar.' action={<button className='primary-button compact' onClick={() => { setError(''); setOpen(true); }}><Plus size={17} />Nova meta</button>} />
    {open && <form className='inline-form' onSubmit={(event: FormEvent) => { event.preventDefault(); setError(''); create.mutate(); }}>
      <label>Nome da meta<input autoFocus required maxLength={100} value={name} placeholder='Ex.: Meu carro' onChange={(event) => setName(event.target.value)} /></label>
      <label>Valor desejado<input required type='number' min='0.01' step='0.01' value={target} onChange={(event) => setTarget(event.target.value)} /></label>
      <span className='savings-currency'>Moeda: {currency}</span>
      <button className='primary-button compact' disabled={create.isPending}>Criar meta</button>
      <button type='button' className='icon-button' aria-label='Fechar formulário' onClick={() => { setOpen(false); setError(''); }}><X size={18} /></button>
    </form>}
    {error && <p className='form-error page-feedback' role='alert'>{error}</p>}
    {goals.isError && <p className='form-error' role='alert'>Não foi possível carregar as metas.</p>}
    {goals.isLoading && <p className='empty-row' role='status'>Carregando metas...</p>}
    <div className='goal-overview'><div><PiggyBank /><span>Seu plano de poupança<strong>{current.length} {current.length === 1 ? 'meta criada' : 'metas criadas'}</strong></span></div><p>Cada aporte reserva parte do saldo. Ao cancelar uma meta, o dinheiro guardado volta ao saldo.</p></div>
    <section className='savings-board' aria-label='Metas de poupança'>
      {current.map((goal) => {
        const saved = Number(goal.saved_amount);
        const targetAmount = Number(goal.target_amount);
        const percent = Math.round(saved / targetAmount * 100);
        return <article className='savings-card' key={goal.id}>
          <header><span className='savings-icon'><PiggyBank size={21} /></span><span className={goal.status === 'completed' ? 'savings-status complete' : 'savings-status'}>{goal.status === 'completed' ? 'Conquistada' : 'Em andamento'}</span></header>
          <h2>{goal.name}</h2><p className='savings-amount'><strong>{formatMoney(saved, goal.currency)}</strong> de {formatMoney(targetAmount, goal.currency)}</p>
          <div className='goal-track' role='progressbar' aria-label={`Progresso de ${goal.name}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(percent, 100)}%` }} /></div>
          <p className='savings-percent'>{percent}% da meta alcançada</p>
          {depositId === goal.id && <form className='savings-deposit' onSubmit={(event: FormEvent) => { event.preventDefault(); setError(''); deposit.mutate(goal.id); }}><label>Valor para guardar<input autoFocus required type='number' min='0.01' max={(targetAmount - saved).toFixed(2)} step='0.01' value={amount} onChange={(event) => setAmount(event.target.value)} /></label><button className='primary-button compact' disabled={deposit.isPending}>Confirmar aporte</button><button type='button' className='secondary-button' onClick={() => { setDepositId(null); setAmount(''); setError(''); }}>Fechar</button></form>}
          <footer>{goal.status === 'active' && <button className='primary-button compact' onClick={() => { setDepositId(goal.id); setAmount(''); setError(''); }}>Adicionar dinheiro</button>}<button className='secondary-button' disabled={cancel.isPending} onClick={() => { if (window.confirm(`Cancelar ${goal.name} e devolver ${formatMoney(saved, goal.currency)} ao saldo?`)) cancel.mutate(goal.id); }}>Cancelar meta</button></footer>
        </article>;
      })}
      {!goals.isLoading && !current.length && <p className='empty-row'>Nenhuma meta de poupança ativa. Crie uma para começar a guardar dinheiro.</p>}
    </section>
    {cancelled.length > 0 && <section className='savings-history'><h2>Metas canceladas</h2><p>{cancelled.map((goal) => goal.name).join(' · ')}</p></section>}
  </div>;
}
