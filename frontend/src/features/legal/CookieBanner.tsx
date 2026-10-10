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
      <div className="cookie-copy"><h2 id="cookie-title"><Cookie size={18} aria-hidden="true" />Como usamos cookies</h2>
        <p id="cookie-description">Usamos armazenamento no navegador para manter sua sessão, lembrar o tema e salvar sua escolha de cookies. Os dados necessários ficam ativos; você pode aceitar ou rejeitar os opcionais.</p>
        <p>Não usamos cookies de publicidade ou análise. <Link to="/politica-de-cookies">Política de Cookies</Link>.</p>
      </div>
      <div className="cookie-actions"><button className="secondary-button" type="button" onClick={() => choose('rejected')}>Rejeitar opcionais</button><button className="secondary-button" type="button" onClick={() => choose('accepted')}>Aceitar opcionais</button></div>
    </section>
  </>;
}
