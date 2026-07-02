import { create } from 'zustand';
import type { UserAccount } from '../types/iso';
import { fetchAuthConfig, usesClerkAuthentication } from '../lib/authConfig';
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from '../lib/api';
import { isClerkEnabled } from '../lib/clerk';

interface AuthStore {
  user: UserAccount | null;
  initialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: UserAccount | null) => void;
  syncSession: (user: UserAccount | null, error?: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  initialized: false,
  error: null,

  initialize: async () => {
    const shouldUseClerkAuth = isClerkEnabled && (await usesClerkAuthentication());

    if (shouldUseClerkAuth) {
      set({
        initialized: false,
        error: null,
      });
      return;
    }

    const user = await getCurrentUser();
    set({
      user,
      initialized: true,
      error: null,
    });
  },

  login: async (email, password) => {
    const shouldUseClerkAuth = isClerkEnabled && (await usesClerkAuthentication());

    if (shouldUseClerkAuth) {
      set({
        error: 'El inicio de sesion se gestiona con Clerk.',
      });
      return false;
    }

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
    const authConfig = await fetchAuthConfig().catch(() => null);
    const shouldUseClerkAuth =
      isClerkEnabled && (authConfig ? authConfig.mode === 'clerk' : true);

    if (!shouldUseClerkAuth) {
      await logoutRequest();
    }
    set({
      user: null,
      initialized: true,
      error: null,
    });
  },

  setUser: (user) => {
    set({ user });
  },

  syncSession: (user, error = null) => {
    set({
      user,
      initialized: true,
      error,
    });
  },
}));
