import { createContext, useContext } from 'react';
import type { AxiosInstance } from 'axios';
import { api, isDemoMode } from './api';
import { useAuthStore } from '../features/auth/store';
import type { UserProfile } from '../types';

interface Workspace {
  api: AxiosInstance;
  user: UserProfile | null;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  isPreview: boolean;
  demoMode: boolean;
  path: (path: string) => string;
}

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const preview = useContext(WorkspaceContext);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  return preview ?? { api, user, setUser, logout, isPreview: false, demoMode: isDemoMode, path: (path) => path };
}
