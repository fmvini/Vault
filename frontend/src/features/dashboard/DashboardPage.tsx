import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Dumbbell,
  HeartPulse,
  House,
  Lightbulb,
  Plane,
  Search,
  Utensils,
  Wifi
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { categories, fixedExpenses, flowData, goals, transactions } from "../../lib/demo";
import { formatMoney, formatShortDate } from "../../lib/format";

const iconMap = {
  plane: Plane,
  house: House,
  study: Lightbulb,
  card: CreditCard,
  heart: HeartPulse,
  wifi: Wifi,
  fitness: Dumbbell
};

function MoneySummary({ label, value, delta, tone }: { label: string; value: number; delta: string; tone: "mint" | "rose" | "ink" }) {
  const Icon = tone === "rose" ? ArrowDownRight : ArrowUpRight;
  return (
    <div className={`money-summary ${tone}`}>
      <span>{label}</span>
      <strong>{formatMoney(value)}</strong>
      <small><Icon size={14} />{delta}</small>
    </div>
  );
}

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="spectral-line" aria-hidden="true" />
      <section className="dashboard-heading">
        <div>
          <h1>Visão geral</h1>
          <p>Seu dinheiro em equilíbrio, mais escolhas para o seu amanhã.</p>
        </div>
        <button className="period-button"><ChevronRight className="chevron-left" size={16} /><span>Setembro 2026</span><CalendarDays size={16} /><ChevronRight size={16} /></button>
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <section className="summary-strip" aria-label="Resumo financeiro do período">
            <MoneySummary label="Saldo" value={2460} delta="12% em relação a agosto" tone="ink" />
            <MoneySummary label="Receitas" value={6200} delta="8% no período" tone="mint" />
            <MoneySummary label="Gastos" value={3740} delta="5% no período" tone="rose" />
          </section>

          <section className="cashflow-section">
            <div className="section-title-row">
              <div><h2>Receitas e gastos ao longo do mês</h2><p>Movimento diário de setembro</p></div>
              <div className="chart-legend"><span className="mint-dot" />Receitas<span className="rose-dot" />Gastos</div>
            </div>
            <div className="cashflow-chart" aria-label="Gráfico de receitas e gastos ao longo do mês">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={flowData} margin={{ top: 18, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="mintArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9adbc5" stopOpacity={0.28} /><stop offset="100%" stopColor="#9adbc5" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e4e7e8" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#7c8695", fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#7c8695", fontSize: 11 }} />
                  <Tooltip contentStyle={{ border: "1px solid #dfe3e4", borderRadius: 12, boxShadow: "0 10px 32px rgba(45,55,60,.1)" }} formatter={(value: number) => formatMoney(value)} />
                  <Area isAnimationActive={false} type="monotone" dataKey="income" stroke="none" fill="url(#mintArea)" />
                  <Line isAnimationActive={false} type="monotone" dataKey="income" stroke="#6fc5ad" strokeWidth={2.2} dot={false} activeDot={{ r: 5, fill: "#6fc5ad" }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="expense" stroke="#d985a0" strokeWidth={2.2} dot={false} activeDot={{ r: 5, fill: "#d985a0" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="lower-insights">
            <section className="category-section">
              <div className="section-title-row"><h2>Distribuição dos gastos</h2><button>Ver detalhes <ChevronRight size={15} /></button></div>
              <div className="category-content">
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie isAnimationActive={false} data={categories} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={1}>{categories.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center"><strong>{formatMoney(3740)}</strong><span>gastos no mês</span></div>
                </div>
                <ul className="category-list">
                  {categories.map((category) => (
                    <li key={category.name}><span className="category-color" style={{ background: category.color }} /><span>{category.name}</span><em>{Math.round(category.value / 3740 * 100)}%</em><strong>{formatMoney(category.value)}</strong></li>
                  ))}
                </ul>
              </div>
            </section>
            <section className="insight-section">
              <div className="insight-item"><span className="insight-icon"><Lightbulb size={21} /></span><p>Você economizou <strong>{formatMoney(460)}</strong> em relação a agosto.</p></div>
              <div className="insight-item"><span className="insight-icon"><CircleDollarSign size={21} /></span><p>Nesse ritmo, sua meta principal chega <strong>2 meses antes.</strong></p></div>
            </section>
          </div>

          <section className="transactions-section">
            <div className="section-title-row"><h2>Transações recentes</h2><button>Ver todas <ChevronRight size={15} /></button></div>
            <div className="transaction-table" role="table" aria-label="Transações recentes">
              <div className="transaction-row transaction-head" role="row"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Valor</span></div>
              {transactions.slice(0, 4).map((transaction) => (
                <div className="transaction-row" role="row" key={transaction.id}>
                  <span>{formatShortDate(transaction.transactionDate)}</span>
                  <span><span className="mini-icon"><Utensils size={14} /></span>{transaction.description}</span>
                  <span>{transaction.categoryName}</span>
                  <strong className={transaction.type}>{transaction.type === "expense" ? "−" : "+"} {formatMoney(transaction.amount)}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-observations">
          <section className="attention-block">
            <AlertCircle size={24} />
            <div><strong>Atenção</strong><p>Seu gasto com Alimentação está 28% acima da média dos últimos 3 meses.</p></div>
            <ChevronRight size={18} />
          </section>
          <section className="goals-section">
            <div className="section-title-row"><h2>Metas</h2><button>Ver todas <ChevronRight size={15} /></button></div>
            <div className="goal-list">
              {goals.map((goal) => {
                const GoalIcon = iconMap[goal.icon as keyof typeof iconMap] || CircleDollarSign;
                const percentage = Math.round(goal.current / goal.limit * 100);
                return <div className="goal-item" key={goal.id}><span className="round-icon"><GoalIcon size={19} /></span><div><strong>{goal.name}</strong><p>{formatMoney(goal.current)} de {formatMoney(goal.limit)}</p><div className="progress"><span style={{ width: `${percentage}%` }} /></div></div><em>{percentage}%</em></div>;
              })}
            </div>
          </section>
          <section className="due-section">
            <div className="section-title-row"><h2>Próximos vencimentos</h2><button>Ver todos <ChevronRight size={15} /></button></div>
            <div className="due-list">
              {fixedExpenses.map((expense) => {
                const DueIcon = iconMap[expense.icon as keyof typeof iconMap] || CreditCard;
                return <div className="due-item" key={expense.id}><span className="round-icon"><DueIcon size={18} /></span><div><strong>{expense.name}</strong><p>{formatShortDate(expense.dueDate)}</p></div><strong>{formatMoney(expense.amount)}</strong></div>;
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

