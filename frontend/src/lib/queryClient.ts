import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export function createWorkspaceQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => count < 1 && !(axios.isAxiosError(error) && error.response?.status === 401) && !axios.isCancel(error),
        refetchOnWindowFocus: false
      }
    }
  });
}
