import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Plus, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import type { ApiCategory, TransactionType } from "../../types";

export function CategoriesPage() {
  const client = useQueryClient(); const [open, setOpen] = useState(false); const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense"); const [color, setColor] = useState("#6fc5ad"); const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["categories"], queryFn: async () => (await api.get<ApiCategory[]>("/categories")).data });
  const create = useMutation({ mutationFn: async () => api.post("/categories", { name, type, color }), onSuccess: async () => { setName(""); setOpen(false); setError(""); await client.invalidateQueries({ queryKey: ["categories"] }); }, onError: (err) => setError(axios.isAxiosError<{detail?: string}>(err) ? err.response?.data?.detail ?? "Não foi possível criar a categoria." : "Não foi possível criar a categoria.") });
  const remove = useMutation({ mutationFn: async (id: string) => api.delete(`/categories/${id}`), onSuccess: async () => client.invalidateQueries({ queryKey: ["categories"] }) });
  const groups: { type: TransactionType; title: string }[] = [{ type: "expense", title: "Gastos" }, { type: "income", title: "Receitas" }];
  return <div className="feature-page"><PageHeader title="Categorias" description="Uma taxonomia simples para explicar para onde o dinheiro foi." action={<button className="primary-button compact" onClick={() => setOpen(true)}><Plus size={17} />Nova categoria</button>} />
    {open && <form className="inline-form" onSubmit={(event: FormEvent) => { event.preventDefault(); if (name.trim()) create.mutate(); }}><label>Nome<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoFocus /></label><label>Tipo<select value={type} onChange={(e) => setType(e.target.value as TransactionType)}><option value="expense">Gasto</option><option value="income">Receita</option></select></label><label>Cor<input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label><button className="primary-button compact" disabled={create.isPending}>{create.isPending ? "Salvando..." : "Salvar"}</button><button type="button" className="icon-button" aria-label="Cancelar" onClick={() => setOpen(false)}><X size={18} /></button>{error && <p className="form-error" role="alert">{error}</p>}</form>}
    {query.isError && <p className="form-error" role="alert">Não foi possível carregar as categorias.</p>}
    <div className="category-columns" aria-busy={query.isLoading}>{groups.map((group) => { const items = (query.data ?? []).filter((item) => item.type === group.type); return <section key={group.type}><header><h2>{group.title}</h2><span>{items.length} categorias</span></header>{items.map((category) => <article key={category.id}><span className="category-swatch" style={{background: category.color ?? "#aeb8bd"}} /><div><strong>{category.name}</strong><small>{category.is_system ? "Categoria do sistema" : "Categoria personalizada"}</small></div><em>{category.type === "expense" ? "Gasto" : "Receita"}</em>{category.is_system ? <span /> : <button aria-label={`Excluir ${category.name}`} onClick={() => remove.mutate(category.id)}><Trash2 size={17} /></button>}</article>)}{!query.isLoading && items.length === 0 && <p className="empty-row">Nenhuma categoria cadastrada.</p>}</section>; })}</div>
  </div>;
}
