import { BarChart3, CalendarRange } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";

export function ReportsPage() {
  return <div className="feature-page"><PageHeader title="Análises" description="Leituras comparativas para entender a evolução do seu dinheiro." /><section className="empty-analysis"><BarChart3 /><h2>Seu comparativo ganha forma com o tempo</h2><p>Quando houver três meses completos, o FinTrack mostrará tendências consistentes sem confundir variação pontual com hábito.</p><button className="secondary-button"><CalendarRange size={16} />Ver mês atual</button></section></div>;
}
