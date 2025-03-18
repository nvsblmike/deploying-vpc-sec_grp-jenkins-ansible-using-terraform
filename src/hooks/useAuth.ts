import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import type { User } from '@/types/db';

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  user: User;
}

export function useAuth() {
  const router = useRouter();
  const { login: setUser } = useAuthStore();

  const loginMutation = useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include', // Important: This is needed to include cookies in the request
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Store user data in Zustand store
      setUser(data.user);
      // Redirect to dashboard
      router.push('/dashboard');
    },
  });

  const logoutMutation = useMutation<void, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: This is needed to include cookies in the request
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Logout failed');
      }
    },
    onSuccess: () => {
      // Clear user data from Zustand store
      setUser(null);
      // Redirect to login page
      router.push('/login');
    },
  });

  return {
    login: loginMutation.mutateAsync,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
    logout: logoutMutation.mutateAsync,
  };
}
