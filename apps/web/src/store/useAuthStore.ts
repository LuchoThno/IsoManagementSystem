import { create } from 'zustand';
import type { UserAccount } from '../types/iso';
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from '../lib/api';

interface AuthStore {
  user: UserAccount | null;
  initialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: UserAccount | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  initialized: false,
  error: null,

  initialize: async () => {
    const user = await getCurrentUser();
    set({
      user,
      initialized: true,
      error: null,
    });
  },

  login: async (email, password) => {
    try {
      const user = await loginRequest(email, password);
      set({
        user,
        initialized: true,
        error: null,
      });
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'No fue posible iniciar sesion',
      });
      return false;
    }
  },

  logout: async () => {
    await logoutRequest();
    set({
      user: null,
      error: null,
    });
  },

  setUser: (user) => {
    set({ user });
  },
}));
