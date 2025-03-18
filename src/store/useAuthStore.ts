import type { User } from '@/types/db';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  admin: User | null;
  login: (admin: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      login: (admin) => set({ admin }),
      logout: () => set({ admin: null }),
    }),
    {
      name: 'auth-storage',
    },
  ),
);
