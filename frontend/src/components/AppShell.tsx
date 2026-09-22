import {
  Bell,
  ChartNoAxesCombined,
  ChevronDown,
  Leaf,
  CreditCard,
  House,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Tags,
  Target,
  WalletCards,
  X
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/store";
import { api, isDemoMode } from "../lib/api";
import { getStoredTheme, saveTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";
import type { UserProfile } from "../types";

const navItems = [
  { to: "/", label: "Visão geral", icon: House },
  { to: "/transactions", label: "Transações", icon: WalletCards },
  { to: "/fixed-expenses", label: "Gastos fixos", icon: CreditCard },
  { to: "/goals", label: "Metas", icon: Target },
  { to: "/categories", label: "Categorias", icon: Tags },
  { to: "/reports", label: "Relatórios", icon: ChartNoAxesCombined },
  { to: "/settings", label: "Configurações", icon: Settings }
];

const demoUser: UserProfile = {
  name: "Marina Ribeiro",
  email: "marina@exemplo.com",
  default_currency: "BRL"
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "VA";
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => (await api.get<UserProfile>("/auth/me")).data,
    enabled: !isDemoMode,
    initialData: !isDemoMode && storedUser ? storedUser : undefined,
    retry: false
  });
  const currentUser = isDemoMode ? storedUser ?? demoUser : userQuery.data ?? storedUser;

  useEffect(() => {
    if (userQuery.data && !isDemoMode) setUser(userQuery.data);
  }, [setUser, userQuery.data]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = globalSearch.trim();
    navigate(term ? `/transactions?q=${encodeURIComponent(term)}` : "/transactions");
  };

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate("/login", { replace: true });
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    saveTheme(nextTheme);
  };

  return (
    <div className="app-shell">
      <aside className={mobileOpen ? "sidebar is-open" : "sidebar"}>
        <div className="brand-block">
          <NavLink className="brand" to="/" aria-label="Vault — início">
            <span className="brand-mark" aria-hidden="true"><Leaf size={27} fill="currentColor" strokeWidth={1.6} /></span>
            <span>Vault</span>
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
        <NavLink className="new-transaction" to="/transactions?new=1" onClick={() => setMobileOpen(false)}><Plus size={18} />Nova transação</NavLink>
        <div className="sidebar-note">
          <span className="note-rule" />
          <p>Disciplina hoje.<br />Mais liberdade amanhã.</p>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <div className="content-column">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu /></button>
          <form className="global-search" role="search" onSubmit={submitSearch}>
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="global-search-input">Buscar transações</label>
            <input ref={searchRef} id="global-search-input" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Buscar transações..." />
            <kbd>Ctrl K</kbd>
          </form>
          <div className="account-actions">
            <button
              className="theme-toggle"
              type="button"
              aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
              aria-pressed={theme === "dark"}
              title={theme === "light" ? "Usar modo escuro" : "Usar modo claro"}
              onClick={toggleTheme}
            >
              <span className="theme-toggle-track" aria-hidden="true">
                <Sun className="theme-icon theme-icon-sun" size={13} />
                <Moon className="theme-icon theme-icon-moon" size={13} />
                <span className="theme-toggle-thumb" />
              </span>
            </button>
            <button className="icon-button notification" aria-label="Notificações"><Bell size={19} /><span /></button>
            <details className="account-menu">
              <summary aria-label="Abrir menu da conta">
                <span className="avatar" aria-hidden="true">{getInitials(currentUser?.name || "")}</span>
                <span className="account-copy"><strong>{currentUser?.name || "Carregando conta"}</strong><small>{currentUser?.email || "Aguarde..."}</small></span>
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              <div className="account-popover">
                <NavLink to="/settings"><Settings size={16} />Configurações</NavLink>
                <button onClick={handleLogout}><LogOut size={16} />Sair da conta</button>
              </div>
            </details>
          </div>
        </header>
        {!isDemoMode && userQuery.isError && <div className="session-warning" role="alert"><span>Não foi possível atualizar os dados da sua conta.</span><button onClick={() => userQuery.refetch()}>Tentar novamente</button></div>}
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  );
}


