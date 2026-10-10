import { useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../auth/store';
import { LegalFooter } from './LegalFooter';
import { SUPPORT_EMAIL } from './constants';

export function NotFoundPage({ preview = false }: { preview?: boolean }) {
  const token = useAuthStore((state) => state.token);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Página não encontrada | Vault';
    return () => { document.title = previousTitle; };
  }, []);
  const destination = preview ? '/preview' : token ? '/' : '/login';
  return <div className="public-page not-found-page"><main className="not-found-content">
    <Link className="brand" to={destination}><span className="brand-mark" aria-hidden="true"><img className="brand-mark-light" src="/vault-icon.svg" alt="" /><img className="brand-mark-dark" src="/vault-icon-dark.svg" alt="" /></span>Vault</Link>
    <p className="not-found-code" aria-label="Erro 404">404</p>
    <h1>Esta página ficou fora do planejamento.</h1>
    <p>O endereço pode ter mudado ou a página não existe. Retome sua organização pelo início.</p>
    <div className="not-found-actions"><Link className="primary-button" to={destination}>{preview ? 'Voltar à demonstração' : token ? 'Voltar à visão geral' : 'Ir para o login'}<ArrowRight size={17} aria-hidden="true" /></Link><a className="secondary-button" href={'mailto:' + SUPPORT_EMAIL}><ArrowLeft size={16} aria-hidden="true" />Contatar suporte</a></div>
    <a className="support-email" href={'mailto:' + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>
  </main><LegalFooter /></div>;
}
