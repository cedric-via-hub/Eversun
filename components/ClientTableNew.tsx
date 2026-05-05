'use client';

import { useState, memo, lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import Badge from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';
import {
  MagnifyingGlass,
  Pencil,
  ArrowSquareOut,
  X,
  Eye,
  EyeSlash,
  Calendar,
  Key,
  WarningCircle,
  Clock,
  CaretDown,
  List,
  Globe,
  Trash,
} from '@phosphor-icons/react';
import { ClientRecord } from '@/types/client';
import {
  formatDateFR,
  getStatutBadgeColor,
  getFinancementBadgeColor,
  getTypeConsuelBadgeColor,
} from '@/lib/clientTableUtils';
import PaginationControls from '@/components/PaginationControls';
import DatePicker from '@/components/ui/DatePicker';
import FilterChips from '@/components/ui/FilterChips';
import { useClients, useUpdateClient } from '@/hooks/useClients';
import Button from '@/components/ui/Button';

// Lazy load modal
const ClientModal = lazy(() => import('@/components/ClientModal'));

interface ClientTableNewProps {
  section: string;
  onEdit: (client: ClientRecord) => void;
  onDelete?: (client: ClientRecord) => void;
  onRefresh?: (refetchFn: () => void) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

function ClientTableNew({ section, onEdit, onDelete, onRefresh, searchQuery: externalSearchQuery, onSearchChange }: ClientTableNewProps) {
  // Pagination & sorting state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [sortKey, setSortKey] = useState<string>('client');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  
  // Search & filters state
  const [internalSearch, setInternalSearch] = useState('');
  const isExternalSearch = externalSearchQuery !== undefined;
  const search = isExternalSearch ? externalSearchQuery : internalSearch;
  const setSearch = (value: string) => {
    if (isExternalSearch && onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearch(value);
    }
  };
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVille, setFilterVille] = useState('');
  const [filterFinancement, setFilterFinancement] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Modal state
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // React Query hooks
  const filters = {
    ...(filterStatus && { status: filterStatus }),
    ...(filterVille && { ville: filterVille }),
    ...(filterFinancement && { financement: filterFinancement }),
    ...(filterDateFrom && { dateFrom: filterDateFrom }),
    ...(filterDateTo && { dateTo: filterDateTo }),
  };

  const { data, isLoading, error, refetch } = useClients({
    section,
    page,
    limit: rowsPerPage,
    search,
    filters,
    sortKey,
    sortDir,
    enabled: true,
  });

  const updateClient = useUpdateClient();

  // Derived values
  const clients = data?.clients ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.total ?? 0;

  // Store refetch in a ref to expose it to parent
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Expose refetch function to parent via onRefresh callback
  useEffect(() => {
    if (onRefresh) {
      onRefresh(() => refetchRef.current({}));
    }
  }, [onRefresh]);

  // Column definitions
  const getColumns = () => {
    const cols: Array<{ key: keyof ClientRecord; label: string }> = [];
    const isDp = section.startsWith('dp');
    const isConsuel = section.startsWith('consuel');
    const isRaccordement = section.startsWith('raccordement');

    if (section === 'sunlib' || section === 'otovo') {
      cols.push(
        { key: 'clientId', label: 'N° Badge' },
        { key: 'client', label: 'Client' },
        { key: 'ville', label: 'Ville' }
      );
    } else if (isDp) {
      cols.push(
        { key: 'clientId', label: 'N° Badge' },
        { key: 'client', label: 'Client' },
        { key: 'dateEnvoi', label: "Date d'envoi" },
        { key: 'dateEstimative', label: 'Date estimative' },
        { key: 'financement', label: 'Financement' },
        { key: 'statut', label: 'Statut' },
        { key: 'noDp', label: 'N° DP' },
        { key: 'ville', label: 'Ville' }
      );
      if (!section.includes('accordes') && !section.includes('refuses')) {
        cols.push({ key: 'portail', label: 'Portail' });
        cols.push({ key: 'identifiant', label: 'Identifiant' });
        cols.push({ key: 'motDePasse', label: 'Mot de passe' });
      }
    } else if (section === 'daact') {
      cols.push(
        { key: 'clientId', label: 'N° Badge' },
        { key: 'client', label: 'Client' },
        { key: 'dateEnvoi', label: "Date d'envoi" },
        { key: 'statut', label: 'Statut' },
        { key: 'commentaires', label: 'Commentaires' }
      );
    } else if (section === 'installation') {
      cols.push(
        { key: 'clientId', label: 'N° Badge' },
        { key: 'client', label: 'Client' },
        { key: 'dateEstimative', label: 'Date de pose prévu' },
        { key: 'statut', label: 'Statut' },
        { key: 'commentaires', label: 'Commentaires' }
      );
    } else if (isConsuel) {
      cols.push(
        { key: 'clientId', label: 'N° Badge' },
        { key: 'client', label: 'Client' },
        { key: 'dateEnvoi', label: "Date d'envoi" },
        { key: 'statut', label: 'Statut' },
        { key: 'typeConsuel', label: 'Type Consuel' },
        { key: 'commentaires', label: 'Commentaires' }
      );
    } else if (isRaccordement) {
      cols.push(
        { key: 'clientId', label: 'N° Badge' },
        { key: 'client', label: 'Client' },
        { key: 'statut', label: 'Statut' },
        { key: 'numeroContrat', label: 'N° Contrat' },
        { key: 'dateMiseEnService', label: 'Date MES' },
        { key: 'commentaires', label: 'Commentaires' }
      );
    }

    return cols;
  };

  const columns = getColumns();
  const isDp = section.startsWith('dp');

  // Handlers
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === page || isPageTransitioning) return;
    setTransitionDirection(newPage > page ? 'right' : 'left');
    setIsPageTransitioning(true);
    setTimeout(() => {
      setPage(newPage);
      setTimeout(() => setIsPageTransitioning(false), 75);
    }, 75);
  };

  const handleRowClick = (client: ClientRecord) => {
    setSelectedClient(client);
    setShowPassword(false);
  };

  const resetFilters = () => {
    setFilterStatus('');
    setFilterVille('');
    setFilterFinancement('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
    setPage(1);
  };

  // Active filters for FilterChips
  const activeFilters = [
    ...(search ? [{ key: 'search', label: 'Recherche', value: search }] : []),
    ...(filterStatus ? [{ key: 'status', label: 'Statut', value: filterStatus }] : []),
    ...(filterVille ? [{ key: 'ville', label: 'Ville', value: filterVille }] : []),
    ...(filterFinancement ? [{ key: 'financement', label: 'Finance', value: filterFinancement }] : []),
    ...(filterDateFrom ? [{ key: 'dateFrom', label: 'Date de', value: filterDateFrom }] : []),
    ...(filterDateTo ? [{ key: 'dateTo', label: 'Date à', value: filterDateTo }] : []),
  ];

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <WarningCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 dark:text-red-400">Erreur lors du chargement des données</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {updateMessage && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          updateMessage.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        }`}>
          <div className="flex items-center justify-between">
            <span>{updateMessage.message}</span>
            <button onClick={() => setUpdateMessage(null)} className="text-current hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Statut</label>
                <input
                  type="text"
                  placeholder="Filtrer par statut"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Ville</label>
                <input
                  type="text"
                  placeholder="Filtrer par ville"
                  value={filterVille}
                  onChange={(e) => setFilterVille(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Financement</label>
                <input
                  type="text"
                  placeholder="Filtrer par financement"
                  value={filterFinancement}
                  onChange={(e) => setFilterFinancement(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date (de)</label>
                <DatePicker
                  value={filterDateFrom}
                  onChange={setFilterDateFrom}
                  placeholderText="JJ/MM/AAAA"
                  className="h-10 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <FilterChips
            filters={activeFilters}
            onRemove={(key) => {
              if (key === 'search') setSearch('');
              if (key === 'status') setFilterStatus('');
              if (key === 'ville') setFilterVille('');
              if (key === 'financement') setFilterFinancement('');
              if (key === 'dateFrom') setFilterDateFrom('');
              if (key === 'dateTo') setFilterDateTo('');
            }}
            onResetAll={resetFilters}
          />
        )}

        {/* Rows per page */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 glass-card rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover-lift">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-700 text-white">
              <List className="h-4 w-4" weight="bold" />
            </div>
            <label className="text-slate-900 dark:text-white font-semibold text-sm">
              Lignes par page
            </label>
          </div>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Total: {totalItems} résultat(s)
          </span>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl glass-card shadow-lg overflow-hidden transition-all duration-150 hover-lift ${
        isPageTransitioning
          ? `opacity-0 transform ${transitionDirection === 'right' ? 'translate-x-[-20px]' : 'translate-x-[20px]'}`
          : 'opacity-100 transform translate-x-0'
      }`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-slate-900 dark:text-slate-100">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-300 dark:border-slate-600">
                {columns.map((col, idx) => (
                  <th
                    key={col.key as string}
                    className={`px-4 py-3 font-bold text-left cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all whitespace-nowrap text-[10px] uppercase tracking-wider text-slate-700 dark:text-slate-300 group ${
                      idx === 0 ? 'sticky left-0 bg-slate-50 dark:bg-slate-800' : ''
                    }`}
                    onClick={() => handleSort(col.key as string)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {sortKey === col.key && (
                        <span className="text-slate-600 dark:text-slate-400 font-bold">
                          {sortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                      {sortKey !== col.key && (
                        <CaretDown className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100" weight="bold" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center">
                    <div className="animate-pulse space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    Aucun résultat trouvé
                  </td>
                </tr>
              ) : (
                clients.map((client, index) => (
                  <tr
                    key={client._id || client.id || index}
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all cursor-pointer ${
                      index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'
                    }`}
                    onClick={() => handleRowClick(client)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key as string}
                        className={`px-3 py-2 whitespace-nowrap text-xs ${
                          col.key === 'client' ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {col.key === 'client' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRowClick(client); }}
                            className="text-left w-full font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white underline-offset-2 hover:underline"
                          >
                            {client.client || '-'}
                          </button>
                        ) : col.key === 'portail' && isDp && client.portail?.startsWith('http') ? (
                          <a
                            href={client.portail}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-white text-xs hover:bg-slate-800"
                          >
                            <Globe className="w-3 h-3" />
                            Lien
                          </a>
                        ) : col.key === 'identifiant' && client.identifiant ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
                            <Key className="w-3 h-3" />
                            {client.identifiant}
                          </span>
                        ) : col.key === 'motDePasse' && client.motDePasse ? (
                          <span className="font-mono text-xs">{showPassword ? client.motDePasse : '••••••'}</span>
                        ) : col.key === 'statut' && client.statut ? (
                          <Badge className={getStatutBadgeColor(client.statut)}>{client.statut}</Badge>
                        ) : col.key === 'financement' && client.financement ? (
                          <Badge className={getFinancementBadgeColor(client.financement)}>{client.financement}</Badge>
                        ) : col.key === 'typeConsuel' && client.typeConsuel ? (
                          <Badge className={getTypeConsuelBadgeColor(client.typeConsuel)}>{client.typeConsuel}</Badge>
                        ) : ['dateEnvoi', 'dateEstimative', 'dateDerniereDemarche', 'dateMiseEnService', 'datePV', 'pvChantierDate'].includes(col.key as string) && client[col.key] ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Calendar className="w-3 h-3 text-slate-500" weight="fill" />
                            {formatDateFR(client[col.key] as string)}
                          </span>
                        ) : (
                          <span>{(client[col.key] as string) || '-'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="Modifier" position="top">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover-lift"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        {onDelete && (
                          <Tooltip content="Supprimer" position="top">
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(client); }}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 hover-lift"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4">
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isPageTransitioning={isPageTransitioning}
        />
      </div>

      {/* Modal */}
      {selectedClient && (
        <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
          <ClientModal
            selectedClient={selectedClient}
            onClose={() => setSelectedClient(null)}
            onEdit={onEdit}
            section={section}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        </Suspense>
      )}
    </div>
  );
}

export default memo(ClientTableNew);
