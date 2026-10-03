import { Link } from 'react-router-dom';
import { useAuthStore } from '../auth/store';
import { usePreviewStore } from './store';

export function PreviewBanner() {
  const session = usePreviewStore((state) => state.session);
  const start = usePreviewStore((state) => state.start);
  const leave = usePreviewStore((state) => state.leave);
  const accountToken = useAuthStore((state) => state.token);
  return <section className="preview-banner" aria-label="Demonstração do Vault">
    <div><strong>Demonstração · dados fictícios temporários</strong><p>Explore e edite livremente. {session && <>Esta sessão expira às <time dateTime={session.expires_at}>{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(session.expires_at))}</time>.</>} Nada será transferido para sua conta.</p></div>
    <div className="preview-banner-actions">
      <Link to={accountToken ? '/' : '/register'} onClick={leave}>{accountToken ? 'Ir para minha conta' : 'Criar minha conta'}</Link>
      <button onClick={() => { if (window.confirm('Restaurar os dados fictícios? Suas alterações nesta demonstração serão descartadas.')) void start(); }}>Restaurar demo</button>
      <Link to={accountToken ? '/' : '/login'} onClick={leave}>Sair da demonstração</Link>
    </div>
  </section>;
}
