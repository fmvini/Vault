import { AlertTriangle, ArrowRight, Plus, Target } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { categories, goals } from "../../lib/demo";
import { formatMoney } from "../../lib/format";

export function GoalsPage() {
  return <div className="feature-page"><PageHeader title="Metas do mês" description="Limites claros para decidir com antecedência, sem culpa." action={<button className="primary-button compact"><Plus size={17} />Nova meta</button>} />
    <div className="goal-overview"><div><Target /><span>3 metas ativas<strong>{formatMoney(14200)} planejados</strong></span></div><p>Você utilizou 43% dos limites definidos para setembro.</p></div>
    <section className="goal-board">{goals.map((goal, index) => { const percent = Math.round(goal.current / goal.limit * 100); return <article key={goal.id}><header><span>{goal.name}</span><em>{percent}%</em></header><strong>{formatMoney(goal.current)} <small>de {formatMoney(goal.limit)}</small></strong><div className="goal-track"><span style={{ width: `${percent}%` }} /></div><footer><span>{index === 0 ? "Ritmo saudável" : "Dentro do planejado"}</span><button>Ver movimentos <ArrowRight size={14} /></button></footer></article>; })}</section>
    <section className="category-limits"><header><h2>Pressão por categoria</h2><p>Comparação entre seus gastos e a média dos três meses anteriores.</p></header>{categories.slice(0,4).map((category, index) => <div key={category.name}><span className="category-color" style={{background: category.color}} /><strong>{category.name}</strong><div className="comparison-track"><span style={{width: `${[78,62,43,89][index]}%`}} /></div><em>{[78,62,43,89][index]}%</em>{index === 3 && <AlertTriangle size={15} />}</div>)}</section>
  </div>;
}
