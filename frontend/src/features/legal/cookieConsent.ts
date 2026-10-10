import { create } from 'zustand';
import { LEGAL_VERSION } from './constants';

export const COOKIE_CONSENT_KEY = 'vault-cookie-consent';
export type CookieChoice = 'accepted' | 'rejected';

function readChoice(): CookieChoice | null {
  try {
    const value = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY) || 'null');
    return value?.version === LEGAL_VERSION && (value.choice === 'accepted' || value.choice === 'rejected') ? value.choice : null;
  } catch { return null; }
}

interface CookieConsentState {
  choice: CookieChoice | null;
  isOpen: boolean;
  storageError: boolean;
  open: () => void;
  close: () => void;
  choose: (choice: CookieChoice) => void;
}

const initialChoice = readChoice();
export const useCookieConsent = create<CookieConsentState>((set) => ({
  choice: initialChoice,
  isOpen: initialChoice === null,
  storageError: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  choose: (choice) => {
    let storageError = false;
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ choice, version: LEGAL_VERSION, updated_at: new Date().toISOString() }));
    } catch { storageError = true; }
    set({ choice, isOpen: false, storageError });
  }
}));

// Optional tracking must consult this gate before it is ever loaded.
export function optionalCookiesAllowed(): boolean {
  return useCookieConsent.getState().choice === 'accepted';
}
