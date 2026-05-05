/**
 * React Query Hooks for Client Data
 * Provides cached, synchronized data fetching with automatic refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { clientApi, importExportApi } from '@/services/apiClient';
import { ClientRecord } from '@/types/client';
import { useAppStore } from '@/store/useAppStore';

// Query keys for cache management
export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => 
    [...clientKeys.lists(), filters] as const,
  counts: () => [...clientKeys.all, 'counts'] as const,
  detail: (id: string) => [...clientKeys.all, 'detail', id] as const,
};

/**
 * Hook for fetching paginated clients with filters
 */
interface UseClientsParams {
  section: string;
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, string>;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  enabled?: boolean;
}

export function useClients({
  section,
  page = 1,
  limit = 20,
  search = '',
  filters = {},
  sortKey = 'client',
  sortDir = 'asc',
  enabled = true,
}: UseClientsParams) {
  return useQuery({
    queryKey: clientKeys.list({
      section,
      page,
      limit,
      search,
      filters,
      sortKey,
      sortDir,
    }),
    queryFn: () =>
      clientApi.getClients({
        section,
        page,
        limit,
        search,
        filters,
        sortKey,
        sortDir,
      }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching client counts by section
 */
export function useClientCounts() {
  const setSectionCounts = useAppStore((state) => state.setSectionCounts);

  const query = useQuery({
    queryKey: clientKeys.counts(),
    queryFn: clientApi.getCounts,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update store when data changes
  useEffect(() => {
    if (query.data) {
      const counts = query.data as unknown as Record<string, number>;
      setSectionCounts(counts);
    }
  }, [query.data, setSectionCounts]);

  return query;
}

/**
 * Hook for creating a new client
 */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientApi.create,
    onSuccess: () => {
      // Invalidate and refetch clients list and counts
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.counts() });
    },
  });
}

/**
 * Hook for updating a client
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientRecord> }) =>
      clientApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific client and lists
      queryClient.invalidateQueries({
        queryKey: clientKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.counts() });
    },
  });
}

/**
 * Hook for deleting a client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.counts() });
    },
  });
}

/**
 * Hook for importing clients
 */
export function useImportClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importExportApi.import,
    onSuccess: () => {
      // Invalidate all client data after import
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}
