import { useQuery } from '@tanstack/react-query';

interface User {
  email: string;
  role: string;
}

export function useUser() {
  return useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        throw new Error('Non authentifié');
      }
      const data = await res.json();
      return data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}