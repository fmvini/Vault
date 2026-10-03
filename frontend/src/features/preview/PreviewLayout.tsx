import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { createWorkspaceQueryClient } from '../../lib/queryClient';
import { applyTheme, getStoredTheme, initializeTheme } from '../../lib/theme';
import { WorkspaceContext } from '../../lib/workspace';
import { useAuthStore } from '../auth/store';
import { createPreviewApi, usePreviewStore } from './store';
import type { PreviewSession } from './store';
import './preview.css';

function PreviewWorkspace({ session }: { session: PreviewSession }) {
  const client = useMemo(() => createWorkspaceQueryClient(), []);
  const api = useMemo(() => createPreviewApi(session), [session]);
  const setUser = usePreviewStore((state) => state.setUser);
  const leave = usePreviewStore((state) => state.leave);
  useEffect(() => () => { void client.cancelQueries(); client.clear(); }, [client]);
  const workspace = { api, user: session.user, setUser, logout: leave, isPreview: true, demoMode: false, path: (path: string) => `/preview${path === '/' ? '' : path}` };
  return <WorkspaceContext.Provider value={workspace}><QueryClientProvider client={client}><AppShell /></QueryClientProvider></WorkspaceContext.Provider>;
}

export function PreviewLayout() {
  const { session, status, error, start, expire, leave } = usePreviewStore();
  const accountToken = useAuthStore((state) => state.token);
  useEffect(() => {
    // Entering the route starts a demo. Leaving must not start one again while
    // the Link is still navigating away after the store becomes idle.
    if (usePreviewStore.getState().status === 'idle') void start();
  }, [start]);
  useEffect(() => {
    const previewTheme = sessionStorage.getItem('vault-preview-theme');
    applyTheme(previewTheme === 'light' || previewTheme === 'dark' ? previewTheme : getStoredTheme());
    return initializeTheme;
  }, []);
  useEffect(() => {
    if (!session || status !== 'ready') return;
    const check = () => { if (Date.parse(session.expires_at) <= Date.now()) expire(session.access_token); };
    const timeout = window.setTimeout(check, Math.max(0, Date.parse(session.expires_at) - Date.now()));
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { window.clearTimeout(timeout); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [session, status, expire]);

  if (status === 'ready' && session) return <PreviewWorkspace key={session.access_token} session={session} />;
  const expired = status === 'expired';
  const loading = status === 'loading' || status === 'idle';
  return <main className="preview-state" aria-busy={loading}>
    <Link className="brand" to="/preview" aria-label="Vault — demonstração"><span className="brand-mark"><img src="/vault-icon.svg" alt="" /></span>Vault</Link>
    <h1>{loading ? 'Preparando sua demonstração' : expired ? 'A demonstração expirou' : 'Demonstração indisponível'}</h1>
    <p role={loading ? 'status' : 'alert'}>{loading ? 'Criando um espaço isolado com dados fictícios. Você não precisa fazer login.' : expired ? 'Esta sessão temporária terminou. Reinicie para explorar uma nova demonstração com dados fictícios.' : error}</p>
    <p>Os dados da demonstração são temporários. Alterações não são transferidas para uma conta.</p>
    <div className="preview-state-actions">
      {!loading && <button className="primary-button compact" onClick={() => void start()}>{expired ? 'Reiniciar demonstração' : 'Tentar novamente'}</button>}
      <Link className="secondary-button" to={accountToken ? '/' : '/register'} onClick={leave}>{accountToken ? 'Ir para minha conta' : 'Criar minha conta'}</Link>
      <Link className="secondary-button" to={accountToken ? '/' : '/login'} onClick={leave}>Sair da demonstração</Link>
    </div>
  </main>;
}
