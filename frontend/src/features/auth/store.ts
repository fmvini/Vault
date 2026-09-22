import { create } from "zustand";
import type { UserProfile } from "../../types";

function readStoredUser(): UserProfile | null {
  const value = localStorage.getItem("vault-user");
  if (!value) return null;
  try {
    return JSON.parse(value) as UserProfile;
  } catch {
    localStorage.removeItem("vault-user");
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  setSession: (token: string, user?: UserProfile) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("fintrack-token"),
  user: readStoredUser(),
  setSession: (token, user) => {
    localStorage.setItem("fintrack-token", token);
    if (user) {
      localStorage.setItem("vault-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("vault-user");
    }
    set({ token, user: user ?? null });
  },
  setUser: (user) => {
    localStorage.setItem("vault-user", JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem("fintrack-token");
    localStorage.removeItem("vault-user");
    set({ token: null, user: null });
  }
}));
