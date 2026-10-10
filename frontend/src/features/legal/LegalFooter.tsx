import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from './constants';
import { useCookieConsent } from './cookieConsent';

export function LegalFooter() {
  const openCookies = useCookieConsent((state) => state.open);
  return <footer className="legal-footer"><nav aria-label="Informações legais e suporte">
    <Link to="/termos-de-uso">Termos de Uso</Link>
    <Link to="/politica-de-privacidade">Privacidade</Link>
    <Link to="/politica-de-cookies">Política de Cookies</Link>
    <button type="button" onClick={openCookies}>Preferências de cookies</button>
    <a href={'mailto:' + SUPPORT_EMAIL}>Contatar suporte</a>
  </nav></footer>;
}
