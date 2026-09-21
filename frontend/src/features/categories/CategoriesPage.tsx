import { CircleEllipsis, Plus } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { categories } from "../../lib/demo";
import { formatMoney } from "../../lib/format";

export function CategoriesPage() {
  const income = [{ name: "Salário", value: 5500, color: "#6fc5ad" }, { name: "Renda extra", value: 700, color: "#9adbc5" }];
  return <div className="feature-page"><PageHeader title="Categorias" description="Uma taxonomia simples para explicar para onde o dinheiro foi." action={<button className="primary-button compact"><Plus size={17} />Nova categoria</button>} />
    <div className="category-columns"><section><header><h2>Gastos</h2><span>{categories.length} categorias</span></header>{categories.map((category) => <article key={category.name}><span className="category-swatch" style={{background: category.color}} /><div><strong>{category.name}</strong><small>Categoria do sistema</small></div><em>{formatMoney(category.value)}</em><button><CircleEllipsis /></button></article>)}</section><section><header><h2>Receitas</h2><span>{income.length} categorias</span></header>{income.map((category) => <article key={category.name}><span className="category-swatch" style={{background: category.color}} /><div><strong>{category.name}</strong><small>Categoria do sistema</small></div><em>{formatMoney(category.value)}</em><button><CircleEllipsis /></button></article>)}</section></div>
  </div>;
}
