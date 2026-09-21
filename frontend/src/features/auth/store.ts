import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("fintrack-token"),
  setToken: (token) => {
    localStorage.setItem("fintrack-token", token);
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("fintrack-token");
    set({ token: null });
  }
}));
