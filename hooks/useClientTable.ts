import { useState, useMemo, useEffect } from 'react';
import { ClientRecord } from '@/types/client';

interface UseClientTableFiltersProps {
  items: ClientRecord[];
  section: string;
}

export function useClientTableFilters({ items, section }: UseClientTableFiltersProps) {
  // Load cached filters
  const loadCachedFilters = () => {
    try {
      const cached = localStorage.getItem(`clientTable-filters-${section}`);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  };

  const cachedFilters = loadCachedFilters();

  const [search, setSearch] = useState(cachedFilters.search || '');
  const [sortKey, setSortKey] = useState<string>(cachedFilters.sortKey || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(cachedFilters.sortDir || 'asc');

  // Filters
  const [showFilters, setShowFilters] = useState(cachedFilters.showFilters || false);
  const [filterStatus, setFilterStatus] = useState<string>(cachedFilters.filterStatus || '');
  const [filterVille, setFilterVille] = useState<string>(cachedFilters.filterVille || '');
  const [filterPrestataire, setFilterPrestataire] = useState<string>(cachedFilters.filterPrestataire || '');
  const [filterFinancement, setFilterFinancement] = useState<string>(cachedFilters.filterFinancement || '');
  const [filterDateFrom, setFilterDateFrom] = useState<string>(cachedFilters.filterDateFrom || '');
  const [filterDateTo, setFilterDateTo] = useState<string>(cachedFilters.filterDateTo || '');

  // Save filters to cache
  useEffect(() => {
    const filtersToCache = {
      search,
      sortKey,
      sortDir,
      showFilters,
      filterStatus,
      filterVille,
      filterPrestataire,
      filterFinancement,
      filterDateFrom,
      filterDateTo,
    };
    try {
      localStorage.setItem(`clientTable-filters-${section}`, JSON.stringify(filtersToCache));
    } catch (error) {
      console.warn('Failed to cache filters:', error);
    }
  }, [search, sortKey, sortDir, showFilters, filterStatus, filterVille, filterPrestataire, filterFinancement, filterDateFrom, filterDateTo, section]);

  const filteredItems = useMemo(() => {
    // Early return for empty items
    if (!items.length) return [];

    let filtered = [...items];

    // Apply search filter first (most restrictive)
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((item) =>
        Object.values(item).some(
          (value) =>
            value &&
            String(value).toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply other filters only if we have results
    if (filtered.length > 0) {
      // Status filter
      if (filterStatus) {
        filtered = filtered.filter((item) => item.statut === filterStatus);
      }

      // Ville filter
      if (filterVille) {
        filtered = filtered.filter((item) =>
          item.ville?.toLowerCase().includes(filterVille.toLowerCase())
        );
      }

      // Prestataire filter
      if (filterPrestataire) {
        filtered = filtered.filter((item) =>
          item.prestataire?.toLowerCase().includes(filterPrestataire.toLowerCase())
        );
      }

      // Financement filter
      if (filterFinancement) {
        filtered = filtered.filter((item) =>
          item.financement?.toLowerCase().includes(filterFinancement.toLowerCase())
        );
      }

      // Date range filter
      if (filterDateFrom) {
        filtered = filtered.filter((item) => {
          const date = item.dateEnvoi || item.dateEstimative;
          return date && new Date(date) >= new Date(filterDateFrom);
        });
      }

      if (filterDateTo) {
        filtered = filtered.filter((item) => {
          const date = item.dateEnvoi || item.dateEstimative;
          return date && new Date(date) <= new Date(filterDateTo);
        });
      }
    }

    // Sorting (only if we have items to sort)
    if (sortKey && filtered.length > 0) {
      filtered.sort((a, b) => {
        const aVal = a[sortKey as keyof ClientRecord];
        const bVal = b[sortKey as keyof ClientRecord];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [items, search, filterStatus, filterVille, filterPrestataire, filterFinancement, filterDateFrom, filterDateTo, sortKey, sortDir]);

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterVille('');
    setFilterPrestataire('');
    setFilterFinancement('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSortKey('');
    setSortDir('asc');
  };

  return {
    // State
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    showFilters,
    setShowFilters,
    filterStatus,
    setFilterStatus,
    filterVille,
    setFilterVille,
    filterPrestataire,
    setFilterPrestataire,
    filterFinancement,
    setFilterFinancement,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    // Computed
    filteredItems,
    // Actions
    resetFilters,
  };
}

interface UseClientTablePaginationProps {
  totalItems: number;
}

export function useClientTablePagination({ totalItems }: UseClientTablePaginationProps) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);

  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const handlePageChange = (newPage: number) => {
    if (newPage === page) return;
    
    setIsPageTransitioning(true);
    setTransitionDirection(newPage > page ? 'right' : 'left');
    
    setTimeout(() => {
      setPage(newPage);
      setIsPageTransitioning(false);
      setTransitionDirection(null);
    }, 300);
  };

  return {
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    isPageTransitioning,
    setIsPageTransitioning,
    transitionDirection,
    setTransitionDirection,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
  };
}
