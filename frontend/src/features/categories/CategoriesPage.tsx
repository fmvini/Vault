import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { BookOpen, Briefcase, Car, Heart, Home, Pencil, Plus, Tag, Trash2, Utensils, Wallet, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../lib/api';
import type { ApiCategory, TransactionType } from '../../types';

const initialForm = { name: '', type: 'expense' as TransactionType, color: '#6fc5ad', icon: 'tag' };
const categoryIcons: Record<string, typeof Tag> = {
  tag: Tag, food: Utensils, car: Car, house: Home, heart: Heart,
  study: BookOpen, work: Briefcase, wallet: Wallet
};

function CategoryIcon({ icon }: { icon: string | null }) {
  const Icon = categoryIcons[icon ?? 'tag'] ?? Tag;
  return <Icon size={14} aria-hidden='true' />;
}

export function CategoriesPage() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCategory | null>(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<ApiCategory[]>('/categories')).data });
  const save = useMutation({
    mutationFn: async () => editing
      ? api.patch(`/categories/${editing.id}`, { name: form.name.trim(), color: form.color, icon: form.icon })
      : api.post('/categories', { ...form, name: form.name.trim() }),
    onSuccess: async () => { closeForm(); await client.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (cause) => setError(axios.isAxiosError<{ detail?: string }>(cause) ? cause.response?.data?.detail ?? 'Não foi possível salvar a categoria.' : 'Não foi possível salvar a categoria.')
  });
  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/categories/${id}`),
    onSuccess: async () => { setError(''); await client.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (cause) => setError(axios.isAxiosError<{ detail?: string }>(cause) ? cause.response?.data?.detail ?? 'Não foi possível excluir a categoria.' : 'Não foi possível excluir a categoria.')
  });
  const groups: { type: TransactionType; title: string }[] = [{ type: 'expense', title: 'Gastos' }, { type: 'income', title: 'Receitas' }];

  function closeForm() { setOpen(false); setEditing(null); setForm(initialForm); setError(''); }
  function openCreate() { setEditing(null); setForm(initialForm); setError(''); setOpen(true); }
  function openEdit(category: ApiCategory) { setEditing(category); setForm({ name: category.name, type: category.type, color: category.color ?? '#6fc5ad', icon: category.icon ?? 'tag' }); setError(''); setOpen(true); }
  function removeCategory(category: ApiCategory) {
    if (window.confirm(`Excluir a categoria “${category.name}”?`)) remove.mutate(category.id);
  }

  return <div className='feature-page'>
    <PageHeader title='Categorias' description='Uma taxonomia simples para explicar para onde o dinheiro foi.' action={<button className='primary-button compact' onClick={openCreate}><Plus size={17} />Nova categoria</button>} />
    {open && <form className='inline-form' onSubmit={(event: FormEvent) => { event.preventDefault(); setError(''); if (form.name.trim()) save.mutate(); }}><label>Nome<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={100} autoFocus /></label><label>Tipo<select value={form.type} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, type: event.target.value as TransactionType })}><option value='expense'>Gasto</option><option value='income'>Receita</option></select></label><label>Ícone<select value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}><option value='tag'>Etiqueta</option><option value='food'>Alimentação</option><option value='car'>Transporte</option><option value='house'>Moradia</option><option value='heart'>Saúde</option><option value='study'>Educação</option><option value='work'>Trabalho</option><option value='wallet'>Carteira</option></select></label><label>Cor<input type='color' value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label><button className='primary-button compact' disabled={save.isPending}>{save.isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar'}</button><button type='button' className='icon-button' aria-label='Cancelar' onClick={closeForm}><X size={18} /></button>{error && <p className='form-error' role='alert'>{error}</p>}</form>}
    {!open && error && <p className='form-error page-feedback' role='alert'>{error}</p>}
    {query.isError && <p className='form-error' role='alert'>Não foi possível carregar as categorias.</p>}
    {query.isFetching && <p className='empty-row' role='status'>Carregando categorias...</p>}
    {remove.isPending && <p className='empty-row' role='status'>Excluindo categoria...</p>}
    <div className='category-columns' aria-busy={query.isLoading}>{groups.map((group) => { const items = (query.data ?? []).filter((item) => item.type === group.type); return <section key={group.type}><header><h2>{group.title}</h2><span>{items.length} categorias</span></header>{items.map((category) => <article key={category.id}><span className='category-swatch' style={{ background: category.color ?? '#aeb8bd' }} /><div><strong><CategoryIcon icon={category.icon} />{category.name}</strong><small>{category.is_system ? 'Categoria do sistema' : `Personalizada · ${category.icon || 'tag'}`}</small></div><em>{category.type === 'expense' ? 'Gasto' : 'Receita'}</em>{category.is_system ? <span className='system-lock'>Protegida</span> : <span className='row-actions'><button aria-label={`Editar ${category.name}`} onClick={() => openEdit(category)}><Pencil size={16} /></button><button aria-label={`Excluir ${category.name}`} disabled={remove.isPending} onClick={() => removeCategory(category)}><Trash2 size={16} /></button></span>}</article>)}{!query.isLoading && items.length === 0 && <p className='empty-row'>Nenhuma categoria cadastrada.</p>}</section>; })}</div>
  </div>;
}
