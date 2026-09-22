import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowRight, Plus, Target, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import type { ApiCategory, ApiGoal } from "../../types";
import { useAuthStore } from "../auth/store";

export function GoalsPage() {
  const client = useQueryClient(); const user = useAuthStore((s)=>s.user); const [open,setOpen]=useState(false); const [categoryId,setCategoryId]=useState(""); const [limit,setLimit]=useState(""); const [error,setError]=useState("");
  const goals = useQuery({queryKey:["goals"],queryFn:async()=>(await api.get<ApiGoal[]>("/goals")).data});
  const categories = useQuery({queryKey:["categories"],queryFn:async()=>(await api.get<ApiCategory[]>("/categories")).data});
  const available=(categories.data??[]).filter(c=>c.type==="expense" && !(goals.data??[]).some(g=>g.is_active&&g.category_id===c.id));
  const create=useMutation({mutationFn:async()=>api.post("/goals",{category_id:categoryId||available[0]?.id,monthly_limit:Number(limit),currency:user?.default_currency??"BRL"}),onSuccess:async()=>{setOpen(false);setLimit("");setCategoryId("");await Promise.all([client.invalidateQueries({queryKey:["goals"]}),client.invalidateQueries({queryKey:["dashboard"]})]);},onError:(err)=>setError(axios.isAxiosError<{detail?:string}>(err)?err.response?.data?.detail??"Não foi possível criar a meta.":"Não foi possível criar a meta.")});
  const remove=useMutation({mutationFn:async(id:string)=>api.delete(`/goals/${id}`),onSuccess:async()=>client.invalidateQueries({queryKey:["goals"]})});
  const active=(goals.data??[]).filter(g=>g.is_active); const planned=active.reduce((sum,g)=>sum+Number(g.monthly_limit),0); const spent=active.reduce((sum,g)=>sum+Number(g.current_month_spent),0); const totalPercent=planned?Math.round(spent/planned*100):0;
  return <div className="feature-page"><PageHeader title="Metas do mês" description="Limites claros para decidir com antecedência, sem culpa." action={<button className="primary-button compact" onClick={()=>setOpen(true)}><Plus size={17}/>Nova meta</button>}/>
    {open&&<form className="inline-form" onSubmit={(e:FormEvent)=>{e.preventDefault();setError("");create.mutate();}}><label>Categoria<select required value={categoryId||available[0]?.id||""} onChange={e=>setCategoryId(e.target.value)}>{available.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Limite mensal<input autoFocus required type="number" min="0.01" step="0.01" value={limit} onChange={e=>setLimit(e.target.value)}/></label><button className="primary-button compact" disabled={!available.length||create.isPending}>Salvar</button><button type="button" className="icon-button" aria-label="Cancelar" onClick={()=>setOpen(false)}><X size={18}/></button>{error&&<p className="form-error">{error}</p>}</form>}
    <div className="goal-overview"><div><Target/><span>{active.length} metas ativas<strong>{formatMoney(planned)} planejados</strong></span></div><p>Você utilizou {totalPercent}% dos limites definidos neste mês.</p></div>
    <section className="goal-board" aria-busy={goals.isLoading}>{active.map(goal=>{const percent=Math.round(Number(goal.current_month_spent)/Number(goal.monthly_limit)*100);return <article key={goal.id}><header><span>{goal.category_name}</span><em>{percent}%</em></header><strong>{formatMoney(Number(goal.current_month_spent))} <small>de {formatMoney(Number(goal.monthly_limit))}</small></strong><div className="goal-track"><span style={{width:`${Math.min(percent,100)}%`}}/></div><footer><span>{goal.is_exceeded?"Limite ultrapassado":"Dentro do planejado"}</span><button onClick={()=>remove.mutate(goal.id)} aria-label={`Excluir meta de ${goal.category_name}`}>Excluir <Trash2 size={14}/></button></footer></article>})}{!goals.isLoading&&!active.length&&<p className="empty-row">Nenhuma meta ativa. Crie uma para acompanhar seus gastos.</p>}</section>
    <section className="category-limits"><header><h2>Progresso por categoria</h2><p>Valores calculados a partir das transações reais do mês.</p></header>{active.map(goal=>{const percent=Math.round(Number(goal.current_month_spent)/Number(goal.monthly_limit)*100);return <div key={goal.id}><span className="category-color"/><strong>{goal.category_name}</strong><div className="comparison-track"><span style={{width:`${Math.min(percent,100)}%`}}/></div><em>{percent}%</em><ArrowRight size={15}/></div>})}</section>
  </div>;
}
