import axios from 'axios';
import { create } from 'zustand';
import type { UserProfile } from '../../types';
import { apiBaseURL } from '../../lib/api';

export const PREVIEW_STORAGE_KEY = 'vault-preview-session';

export interface PreviewSession {
  access_token: string;
  token_type: 'bearer';
  expires_at: string;
  is_preview: true;
  user: UserProfile;
}

function readSession(): PreviewSession | null {
  try {
    const value = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as PreviewSession;
    if (!session.access_token || !session.user?.id || session.is_preview !== true || !Number.isFinite(Date.parse(session.expires_at))) return null;
    return session;
  } catch {
    return null;
  }
}

interface PreviewState {
  session: PreviewSession | null;
  status: 'idle' | 'loading' | 'ready' | 'expired' | 'error';
  error: string;
  start: () => Promise<void>;
  expire: (token: string) => void;
  leave: () => void;
  setUser: (user: UserProfile) => void;
}

const stored = readSession();
// A dedicated unauthenticated client never attaches the account's token.
const bootstrap = axios.create({ baseURL: apiBaseURL, timeout: 30_000 });
let pending: Promise<void> | null = null;
let generation = 0;

export const usePreviewStore = create<PreviewState>((set, get) => ({
  session: stored,
  status: stored ? Date.parse(stored.expires_at) > Date.now() ? 'ready' : 'expired' : 'idle',
  error: '',
  start: () => {
    if (pending) return pending;
    const requestGeneration = ++generation;
    set({ status: 'loading', error: '' });
    pending = (async () => {
      try {
        const { data } = await bootstrap.post<PreviewSession>('/preview/session');
        if (!data.access_token || !data.user?.id || data.is_preview !== true || !(Date.parse(data.expires_at) > Date.now())) throw new Error('Invalid preview session');
        if (generation !== requestGeneration) return;
        sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(data));
        set({ session: data, status: 'ready' });
      } catch (cause) {
        if (generation !== requestGeneration) return;
        const limited = axios.isAxiosError(cause) && cause.response?.status === 429;
        set({ status: 'error', error: limited
          ? 'Muitas demonstrações foram abertas. Aguarde um pouco e tente novamente.'
          : 'Não foi possível preparar a demonstração. Verifique sua conexão e tente novamente.' });
      } finally {
        if (generation === requestGeneration) pending = null;
      }
    })();
    return pending;
  },
  expire: (token) => {
    if (get().session?.access_token === token && get().status === 'ready') set({ status: 'expired' });
  },
  leave: () => {
    generation++;
    pending = null;
    sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    set({ session: null, status: 'idle', error: '' });
  },
  setUser: (user) => {
    const session = get().session;
    if (!session) return;
    const updated = { ...session, user };
    sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(updated));
    set({ session: updated });
  }
}));

export function createPreviewApi(session: PreviewSession) {
  const client = axios.create({
    baseURL: apiBaseURL,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
  });
  client.interceptors.request.use((config) => {
    if (Date.parse(session.expires_at) <= Date.now() || usePreviewStore.getState().session?.access_token !== session.access_token || usePreviewStore.getState().status !== 'ready') {
      usePreviewStore.getState().expire(session.access_token);
      throw new axios.CanceledError('A demonstração expirou ou foi encerrada.');
    }
    return config;
  });
  client.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) usePreviewStore.getState().expire(session.access_token);
    return Promise.reject(error);
  });
  return client;
}
