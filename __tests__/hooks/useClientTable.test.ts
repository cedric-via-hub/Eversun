import { renderHook, act, waitFor } from '@testing-library/react';
import { useClientTableFilters, useClientTablePagination } from '@/hooks/useClientTable';
import { ClientRecord } from '@/types/client';

describe('useClientTableFilters', () => {
  const mockItems: ClientRecord[] = [
    {
      _id: '1',
      client: 'Test Client 1',
      statut: 'accordé',
      ville: 'Paris',
      prestataire: 'Eversun',
      financement: 'Sunlib',
      dateEnvoi: '2024-01-15',
    },
    {
      _id: '2',
      client: 'Test Client 2',
      statut: 'refusé',
      ville: 'Lyon',
      prestataire: 'Projet Solaire',
      financement: 'Otovo',
      dateEnvoi: '2024-02-20',
    },
  ] as ClientRecord[];

  it('returns all items when no filters are applied', () => {
    const { result } = renderHook(() =>
      useClientTableFilters({ items: mockItems, section: 'clients' })
    );

    expect(result.current.filteredItems).toHaveLength(2);
  });

  it('filters by search term', () => {
    const { result } = renderHook(() =>
      useClientTableFilters({ items: mockItems, section: 'clients' })
    );

    act(() => {
      result.current.setSearch('Paris');
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].ville).toBe('Paris');
  });

  it('filters by status', () => {
    const { result } = renderHook(() =>
      useClientTableFilters({ items: mockItems, section: 'clients' })
    );

    act(() => {
      result.current.setFilterStatus('accordé');
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].statut).toBe('accordé');
  });

  it('filters by city', () => {
    const { result } = renderHook(() =>
      useClientTableFilters({ items: mockItems, section: 'clients' })
    );

    act(() => {
      result.current.setFilterVille('Lyon');
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].ville).toBe('Lyon');
  });

  it('resets all filters', () => {
    const { result } = renderHook(() =>
      useClientTableFilters({ items: mockItems, section: 'clients' })
    );

    act(() => {
      result.current.setSearch('Paris');
      result.current.setFilterStatus('accordé');
      result.current.setFilterVille('Paris');
    });

    expect(result.current.filteredItems).toHaveLength(1);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filteredItems).toHaveLength(2);
  });
});

describe('useClientTablePagination', () => {
  it('calculates total pages correctly', () => {
    const { result } = renderHook(() =>
      useClientTablePagination({ totalItems: 25 })
    );

    expect(result.current.totalPages).toBe(3); // 25 items / 10 per page = 3 pages
  });

  it('handles page change', async () => {
    const { result } = renderHook(() =>
      useClientTablePagination({ totalItems: 25 })
    );

    act(() => {
      result.current.handlePageChange(2);
    });

    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });
  });

  it('does not change page if same page is selected', () => {
    const { result } = renderHook(() =>
      useClientTablePagination({ totalItems: 25 })
    );

    const initialPage = result.current.page;

    act(() => {
      result.current.handlePageChange(1);
    });

    expect(result.current.page).toBe(initialPage);
  });

  it('calculates correct start and end indices', async () => {
    const { result } = renderHook(() =>
      useClientTablePagination({ totalItems: 25 })
    );

    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(10);

    act(() => {
      result.current.handlePageChange(2);
    });

    await waitFor(() => {
      expect(result.current.startIndex).toBe(10);
      expect(result.current.endIndex).toBe(20);
    });
  });
});
