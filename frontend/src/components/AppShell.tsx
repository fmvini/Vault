import {
  Bell,
  ChartNoAxesCombined,
  Leaf,
  CreditCard,
  House,
  Menu,
  Plus,
  Search,
  Settings,
  Tags,
  Target,
  WalletCards,
  X
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Visão geral", icon: House },
  { to: "/transactions", label: "Transações", icon: WalletCards },
  { to: "/fixed-expenses", label: "Gastos fixos", icon: CreditCard },
  { to: "/goals", label: "Metas", icon: Target },
  { to: "/categories", label: "Categorias", icon: Tags },
  { to: "/reports", label: "Relatórios", icon: ChartNoAxesCombined },
  { to: "/settings", label: "Configurações", icon: Settings }
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={mobileOpen ? "sidebar is-open" : "sidebar"}>
        <div className="brand-block">
          <NavLink className="brand" to="/" aria-label="FinTrack — início">
            <span className="brand-mark" aria-hidden="true"><Leaf size={27} fill="currentColor" strokeWidth={1.6} /></span>
            <span>FinTrack</span>
          </NavLink>
          <p>Mais vida para o seu dinheiro</p>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <nav className="primary-nav" aria-label="Navegação principal">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="new-transaction"><Plus size={18} />Nova transação</button>
        <div className="sidebar-note">
          <span className="note-rule" />
          <p>Disciplina hoje.<br />Mais liberdade amanhã.</p>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <div className="content-column">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu /></button>
          <label className="global-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Buscar</span>
            <input placeholder="Buscar transações, contas, categorias..." />
            <kbd>⌘ K</kbd>
          </label>
          <div className="account-actions">
            <button className="icon-button notification" aria-label="Notificações"><Bell size={19} /><span /></button>
            <span className="avatar" aria-hidden="true">MR</span>
            <div className="account-copy"><strong>Marina Ribeiro</strong><small>Boa tarde!</small></div>
          </div>
        </header>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  );
}


