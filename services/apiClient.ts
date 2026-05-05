/**
 * API Client - Service Layer for HTTP requests
 * Centralized axios/fetch configuration with error handling
 */

import { ClientRecord } from '@/types/client';
import { parseJsonSafe } from '@/lib/utils';

const API_BASE = '';

// Helper for fetch with error handling
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const parsed = await parseJsonSafe(response);

  if (!response.ok) {
    const error = (parsed as any) || { error: 'Unknown error' };
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return parsed as T;
}

// Client API endpoints
export const clientApi = {
  // Get clients with pagination, filters, and search
  getClients: (params: {
    section: string;
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string>;
    sortKey?: string;
    sortDir?: 'asc' | 'desc';
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params.section) queryParams.set('section', params.section);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.search) queryParams.set('search', params.search);
    if (params.sortKey) queryParams.set('sortKey', params.sortKey);
    if (params.sortDir) queryParams.set('sortDir', params.sortDir);
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value) queryParams.set(`filter_${key}`, value);
      });
    }

    return fetchApi<{
      clients: ClientRecord[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/api/clients?${queryParams.toString()}`);
  },

  // Get client counts by section
  getCounts: () => {
    return fetchApi<Record<string, number>>('/api/clients/counts');
  },

  // Create new client
  create: (data: Partial<ClientRecord>) => {
    return fetchApi<ClientRecord>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update client
  update: (id: string, data: Partial<ClientRecord>) => {
    return fetchApi<ClientRecord>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete client
  delete: (id: string) => {
    return fetchApi<void>(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },
};

// Import/Export API
export const importExportApi = {
  import: (formData: FormData) => {
    return fetch('/api/import', {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Import failed' }));
        throw new Error(error.error || 'Import failed');
      }
      return res.json();
    });
  },

  export: (format: 'csv' | 'json' = 'csv') => {
    return fetchApi<{ data: string; filename: string }>(`/api/export?format=${format}`);
  },
};

export default { client: clientApi, importExport: importExportApi };
