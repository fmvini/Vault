import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, Filter, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../lib/api';
import { formatMoney, formatShortDate } from '../../lib/format';
import type { ApiCategory, ApiTransaction, TransactionPage, TransactionType } from '../../types';
import { useAuthStore } from '../auth/store';

const transactionSchema = z.object({
  description: z.string().min(2, 'Descreva a transação'),
  amount: z.coerce.number().positive('Informe um valor maior que zero'),
  type: z.enum(['expense', 'income']),
  category_id: z.string().min(1, 'Selecione uma categoria'),
  currency: z.string().length(3, 'Selecione a moeda'),
  transaction_date: z.string().min(1, 'Informe a data')
});
type TransactionForm = z.infer<typeof transactionSchema>;
type SortValue = 'transaction_date:desc' | 'transaction_date:asc' | 'amount:desc' | 'amount:asc';

const today = new Date().toISOString().slice(0, 10);
const pageSize = 10;

function monthStart(offset = 0) {
  const date = new Date();
  date.setMonth(date.getMonth() + offset, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const requestedSearch = searchParams.get('q') ?? '';
  const shouldOpenNew = searchParams.get('new') === '1';
  const [drawerOpen, setDrawerOpen] = useState(shouldOpenNew);
  const [editing, setEditing] = useState<ApiTransaction | null>(null);
  const [search, setSearch] = useState(requestedSearch);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState<SortValue>('transaction_date:desc');
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState('');
  const drawerRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [sortBy, sortOrder] = sort.split(':') as ['transaction_date' | 'amount', 'asc' | 'desc'];

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<ApiCategory[]>('/categories')).data
  });
  const transactionsQuery = useQuery({
    queryKey: ['transactions', { search, typeFilter, categoryFilter, startDate, endDate, sort, page }],
    queryFn: async () => (await api.get<TransactionPage>('/transactions', { params: {
      q: search.trim() || undefined,
      type: typeFilter === 'all' ? undefined : typeFilter,
      category_id: categoryFilter === 'all' ? undefined : categoryFilter,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      page_size: pageSize
    } })).data,
    placeholderData: (previous) => previous
  });

  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: 'expense', transaction_date: today, category_id: '', currency: user?.default_currency ?? 'BRL', description: '', amount: 0 }
  });
  const selectedType = watch('type');
  const descriptionField = register('description');
  const selectableCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.type === selectedType),
    [categoriesQuery.data, selectedType]
  );

  useEffect(() => setSearch(requestedSearch), [requestedSearch]);
  useEffect(() => { if (shouldOpenNew) setDrawerOpen(true); }, [shouldOpenNew]);
  useEffect(() => { setPage(1); }, [search, typeFilter, categoryFilter, startDate, endDate, sort]);
  useEffect(() => {
    if (!drawerOpen) return;
    const currentCategory = getValues('category_id');
    if (!selectableCategories.some((category) => category.id === currentCategory)) {
      setValue('category_id', selectableCategories[0]?.id ?? '');
    }
  }, [drawerOpen, getValues, selectableCategories, setValue]);
  useEffect(() => {
    if (!drawerOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appShell = document.querySelector<HTMLElement>('.app-shell');
    appShell?.setAttribute('inert', '');
    window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => { appShell?.removeAttribute('inert'); opener?.focus(); };
  }, [drawerOpen]);

  const invalidateFinance = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['goals'] })
  ]);

  const saveTransaction = useMutation({
    mutationFn: async (values: TransactionForm) => editing
      ? (await api.patch(`/transactions/${editing.id}`, values)).data
      : (await api.post('/transactions', values)).data,
    onSuccess: async () => { await invalidateFinance(); closeDrawer(); },
    onError: (error) => {
      const detail = axios.isAxiosError<{ detail?: string }>(error) ? error.response?.data?.detail : undefined;
      setFormError(detail || 'Não foi possível salvar a transação. Tente novamente.');
    }
  });
  const removeTransaction = useMutation({
    mutationFn: async (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: invalidateFinance
  });
  const markPaid = useMutation({
    mutationFn: async ({ item, isPaid }: { item: ApiTransaction; isPaid: boolean }) => api.patch(`/fixed-expenses/${item.fixed_expense_id}/transactions/${item.id}/mark-paid`, { is_paid: isPaid }),
    onSuccess: invalidateFinance
  });

  const openCreate = () => {
    setEditing(null);
    reset({ type: 'expense', transaction_date: today, category_id: '', currency: user?.default_currency ?? 'BRL', description: '', amount: 0 });
    setFormError('');
    setDrawerOpen(true);
  };
  const openEdit = (item: ApiTransaction) => {
    setEditing(item);
    reset({ description: item.description ?? '', amount: Number(item.amount), type: item.type, category_id: item.category_id, currency: item.currency, transaction_date: item.transaction_date });
    setFormError('');
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setFormError('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('new');
    setSearchParams(nextParams, { replace: true });
  };
  const handleDrawerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); return; }
    if (event.key !== 'Tab') return;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex=-1])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const remove = (item: ApiTransaction) => {
    if (window.confirm(`Excluir “${item.description || 'Sem descrição'}”? Esta ação não pode ser desfeita.`)) removeTransaction.mutate(item.id);
  };
  const useLastMonth = () => { setStartDate(monthStart(-1)); const end = new Date(); end.setDate(0); setEndDate(end.toISOString().slice(0, 10)); };
  const clearFilters = () => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all'); setStartDate(''); setEndDate(''); };

  const items = transactionsQuery.data?.items ?? [];
  const totalsByCurrency = new Map<string, { income: number; expense: number }>();
  for (const item of items) {
    const totals = totalsByCurrency.get(item.currency) ?? { income: 0, expense: 0 };
    totals[item.type] += Number(item.amount);
    totalsByCurrency.set(item.currency, totals);
  }
  if (!totalsByCurrency.size) {
    totalsByCurrency.set(user?.default_currency ?? 'BRL', { income: 0, expense: 0 });
  }
  const currencyTotals = [...totalsByCurrency].sort(([left], [right]) => left.localeCompare(right));
  const multipleCurrencies = currencyTotals.length > 1;
  const summaryAmounts = (type: 'balance' | TransactionType) => currencyTotals.map(([currency, totals]) => (
    <span key={currency}>{formatMoney(type === 'balance' ? totals.income - totals.expense : totals[type], currency)}</span>
  ));
  const totalPages = Math.max(1, Math.ceil((transactionsQuery.data?.total ?? 0) / pageSize));

  return <div className='feature-page'>
    <PageHeader title='Transações' description='Cada movimento do seu dinheiro, pesquisável e explicado.' action={<button className='primary-button compact' onClick={openCreate}><Plus size={17} />Nova transação</button>} />
    <section className='filter-strip' aria-label='Filtros do histórico'>
      <label className='table-search'><Search size={16} /><span className='sr-only'>Buscar por descrição</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Buscar por descrição' /></label>
      <label className='filter-control'><CalendarDays size={16} /><span>De</span><input type='date' value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label className='filter-control'><span>Até</span><input type='date' value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
      <button className='filter-action' type='button' onClick={useLastMonth}>Último mês</button>
      <label className='filter-control'><Filter size={16} /><span className='sr-only'>Filtrar por tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TransactionType | 'all')}><option value='all'>Todos os tipos</option><option value='expense'>Gastos</option><option value='income'>Receitas</option></select></label>
      <label className='filter-control'><span className='sr-only'>Filtrar por categoria</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value='all'>Todas as categorias</option>{(categoriesQuery.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className='filter-control'><span className='sr-only'>Ordenar transações</span><select value={sort} onChange={(event) => setSort(event.target.value as SortValue)}><option value='transaction_date:desc'>Mais recentes</option><option value='transaction_date:asc'>Mais antigas</option><option value='amount:desc'>Maior valor</option><option value='amount:asc'>Menor valor</option></select></label>
      <button className='filter-action' type='button' onClick={clearFilters}>Limpar</button>
    </section>
    {transactionsQuery.isError && <p className='form-error' role='alert'>Não foi possível carregar as transações.</p>}
    {removeTransaction.isError && <p className='form-error' role='alert'>Não foi possível excluir a transação.</p>}
    {markPaid.isError && <p className='form-error' role='alert'>Não foi possível atualizar o pagamento.</p>}
    {transactionsQuery.isFetching && <p className='empty-row' role='status'>Carregando transações...</p>}
    {removeTransaction.isPending && <p className='empty-row' role='status'>Excluindo transação...</p>}
    {markPaid.isPending && <p className='empty-row' role='status'>Atualizando pagamento...</p>}
    <section className='ledger-surface' aria-busy={transactionsQuery.isFetching}>
      <div className='ledger-summary'><span>Saldo desta página<strong className={multipleCurrencies ? 'multi-currency-total' : ''}>{summaryAmounts('balance')}</strong></span><span>Receitas<strong className={multipleCurrencies ? 'positive multi-currency-total' : 'positive'}>{summaryAmounts('income')}</strong></span><span>Gastos<strong className={multipleCurrencies ? 'negative multi-currency-total' : 'negative'}>{summaryAmounts('expense')}</strong></span></div>
      <div className='feature-table'><div className='feature-row feature-row-head'><span>Data</span><span>Descrição</span><span>Categoria</span><span>Status</span><span>Valor</span><span>Ações</span></div>{items.map((item) => <div className='feature-row' key={item.id}><span>{formatShortDate(item.transaction_date)}</span><strong>{item.description || 'Sem descrição'}</strong><span>{item.category_name}</span><span>{item.fixed_expense_id ? <button className={item.is_paid ? 'payment-state paid' : 'payment-state pending'} onClick={() => markPaid.mutate({ item, isPaid: !item.is_paid })}>{item.is_paid ? <CheckCircle2 size={14} /> : <Circle size={14} />}{item.is_paid ? 'Pago' : 'Pendente'}</button> : item.type === 'expense' ? 'Gasto' : 'Receita'}</span><strong className={item.type === 'expense' ? 'negative' : 'positive'}>{item.type === 'expense' ? '−' : '+'} {formatMoney(Number(item.amount), item.currency)}</strong><span className='row-actions'><button aria-label={`Editar ${item.description || 'transação'}`} onClick={() => openEdit(item)}><Pencil size={15} /></button><button aria-label={`Excluir ${item.description || 'transação'}`} onClick={() => remove(item)}><Trash2 size={15} /></button></span></div>)}</div>
      {!transactionsQuery.isLoading && items.length === 0 && <p className='empty-row'>Nenhuma transação encontrada para estes filtros.</p>}
      <footer className='pagination'><span>{transactionsQuery.data?.total ?? 0} transações</span><div><button type='button' disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label='Página anterior'><ChevronLeft size={16} /></button><span>Página {page} de {totalPages}</span><button type='button' disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} aria-label='Próxima página'><ChevronRight size={16} /></button></div></footer>
    </section>
    {drawerOpen && createPortal(<><button type='button' className='drawer-scrim' aria-label='Fechar formulário' onClick={closeDrawer} /><aside ref={drawerRef} className='entry-drawer' role='dialog' aria-modal='true' aria-labelledby='transaction-form-title' aria-describedby='transaction-form-description' onKeyDown={handleDrawerKeyDown}><header><div><h2 id='transaction-form-title'>{editing ? 'Editar transação' : 'Nova transação'}</h2><p id='transaction-form-description'>{editing ? 'A alteração recalcula dashboard e metas.' : 'O lançamento será salvo no seu histórico.'}</p></div><button type='button' onClick={closeDrawer}>Fechar</button></header><form onSubmit={handleSubmit((values) => saveTransaction.mutate(values))}><label>Descrição<input {...descriptionField} ref={(element) => { descriptionField.ref(element); firstFieldRef.current = element; }} />{errors.description && <small>{errors.description.message}</small>}</label><div className='field-pair'><label>Valor<input type='number' step='0.01' {...register('amount')} />{errors.amount && <small>{errors.amount.message}</small>}</label><label>Moeda<select {...register('currency')}><option value='BRL'>BRL</option><option value='USD'>USD</option><option value='EUR'>EUR</option></select></label></div><div className='field-pair'><label>Tipo<select {...register('type')}><option value='expense'>Gasto</option><option value='income'>Receita</option></select></label><label>Data<input type='date' {...register('transaction_date')} /></label></div><label>Categoria<select {...register('category_id')} disabled={categoriesQuery.isLoading}><option value=''>Selecione</option>{selectableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.category_id && <small>{errors.category_id.message}</small>}</label>{formError && <p className='form-error' role='alert'>{formError}</p>}<button className='primary-button' type='submit' disabled={saveTransaction.isPending}>{saveTransaction.isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar transação'}</button></form></aside></>, document.body)}
  </div>;
}
