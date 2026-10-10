import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import { useCookieConsent } from './cookieConsent';

export function CookieBanner() {
  const { choice, isOpen, storageError, choose, close } = useCookieConsent();
  const banner = useRef<HTMLElement>(null);
  const wasOpen = useRef(isOpen);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      banner.current?.focus();
    } else if (!isOpen && wasOpen.current && previousFocus.current) {
      previousFocus.current?.focus();
    }
    wasOpen.current = isOpen;
  }, [isOpen]);
  return <>
    {storageError && <p className="cookie-storage-notice" role="status">Sua escolha vale nesta visita. O navegador não permitiu salvá-la para as próximas visitas.</p>}
    <section ref={banner} hidden={!isOpen} className="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-description" tabIndex={-1} onKeyDown={(event) => { if (event.key === 'Escape' && choice) close(); }}>
      {choice && <button className="cookie-close" type="button" onClick={close} aria-label="Fechar preferências de cookies"><X size={18} /></button>}
      <div className="cookie-copy"><h2 id="cookie-title"><Cookie size={20} aria-hidden="true" />Você escolhe o que fica no navegador</h2>
        <p id="cookie-description">Cookies são pequenos arquivos que lembram informações da sua visita. O Vault também usa armazenamento local para manter sua sessão, o tema e esta escolha. Os dados necessários ao funcionamento permanecem ativos; os opcionais dependem da sua permissão.</p>
        <p>Atualmente, o Vault não usa cookies de publicidade ou análise de navegação. <Link to="/politica-de-cookies">Entenda a Política de Cookies</Link>.</p>
      </div>
      <div className="cookie-actions"><button className="secondary-button" type="button" onClick={() => choose('rejected')}>Rejeitar opcionais</button><button className="secondary-button" type="button" onClick={() => choose('accepted')}>Aceitar opcionais</button></div>
    </section>
  </>;
}
