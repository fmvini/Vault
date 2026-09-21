import { CalendarClock, Check, CircleEllipsis, Plus } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { fixedExpenses } from "../../lib/demo";
import { formatMoney, formatShortDate } from "../../lib/format";

export function FixedExpensesPage() {
  return <div className="feature-page"><PageHeader title="Gastos fixos" description="O que se repete no mês aparece antes de virar surpresa." action={<button className="primary-button compact"><Plus size={17} />Novo gasto fixo</button>} />
    <section className="recurrence-band"><div><CalendarClock /><span>Previsão de outubro<strong>{formatMoney(2629.9)}</strong></span></div><p>5 compromissos ativos · próximo vencimento em 14 dias</p></section>
    <section className="record-list"><header><span>Descrição</span><span>Próximo vencimento</span><span>Valor</span><span>Status</span><span /></header>{fixedExpenses.map((expense, index) => <article key={expense.id}><div><span className="record-index">{String(index + 1).padStart(2, "0")}</span><strong>{expense.name}</strong><small>Recorrência mensal</small></div><span>{formatShortDate(expense.dueDate)}</span><strong>{formatMoney(expense.amount)}</strong><span className={index === 0 ? "status pending" : "status active"}>{index === 0 ? "Pendente" : "Agendado"}</span><button aria-label={`Opções de ${expense.name}`}><CircleEllipsis /></button></article>)}</section>
    <div className="quiet-note"><Check size={17} /><p>Alterações em gastos fixos afetam somente os próximos lançamentos. O histórico permanece intacto.</p></div>
  </div>;
}
