'use client';

import { useState, useEffect } from 'react';
import {
  User,
  CheckCircle,
  Clock,
  Buildings,
  Flag,
  MagnifyingGlass,
  X,
  TrendUp,
  Faders,
  ChartBar,
  Users,
  Lightning,
  FileText,
  Calendar,
  MapPin,
  ArrowRight,
  Circle,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, parseJsonSafe } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

interface ClientStage {
  section: string;
  statut?: string;
  date?: string;
  noDp?: string;
  financement?: string;
  typeConsuel?: string;
  clientId?: string;
}

interface AggregatedClient {
  name: string;
  stages: Record<string, ClientStage>;
  ville?: string;
  financement?: string;
  clientId?: string;
}

export default function ClientAggregationView() {
  const [clients, setClients] = useState<AggregatedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [filterFinancement, setFilterFinancement] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'progress' | 'name' | 'date'>('progress');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [downloadFormat, setDownloadFormat] = useState<'excel' | 'csv' | 'json' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { setSectionCounts } = useAppStore();

  // Check for download parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const downloadParam = urlParams.get('download');
    if (downloadParam === 'excel' || downloadParam === 'csv' || downloadParam === 'json') {
      setDownloadFormat(downloadParam);
    }
  }, []);

  const handleDownload = async (format: 'excel' | 'csv' | 'json') => {
    setIsDownloading(true);

    try {
      const response = await fetch(`/api/export/${format}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Erreur lors du téléchargement ${format.toUpperCase()}`);
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const fileExtensions: Record<string, string> = {
        excel: 'xlsx',
        csv: 'csv',
        json: 'json',
      };

      link.setAttribute('download', `clients_${timestamp}.${fileExtensions[format]}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Clear download format and update URL
      setDownloadFormat(null);
      const urlWithoutDownload = window.location.pathname + window.location.search.replace(/[?&]download=[^&]*/, '');
      window.history.replaceState({}, '', urlWithoutDownload);

    } catch (error) {
      console.error(`Error downloading ${format}:`, error);
      alert(`Erreur lors de l'export ${format.toUpperCase()}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const cancelDownload = () => {
    setDownloadFormat(null);
    const urlWithoutDownload = window.location.pathname + window.location.search.replace(/[?&]download=[^&]*/, '');
    window.history.replaceState({}, '', urlWithoutDownload);
  };

  const fetchSectionCounts = async () => {
    try {
      const res = await fetch('/api/clients/counts');
      const response = (await parseJsonSafe(res)) || {};
      if ((response as any).counts) {
        setSectionCounts(response.counts);
      }
    } catch (error) {
      console.error('Error fetching section counts:', error);
    }
  };

  useEffect(() => {
    fetchAllClients();
    fetchSectionCounts();
  }, []);

  // Rafraîchir les données quand l'utilisateur revient sur l'onglet
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAllClients();
        fetchSectionCounts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchAllClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clients/sync');
      const response = (await parseJsonSafe(res)) || {};
      const data = (response as any).data || response;

      if (Array.isArray(data)) {
        const aggregatedClients: AggregatedClient[] = data.map((item: any) => ({
          name: item.client,
          ville: item.ville,
          financement: item.financement,
          clientId: item.clientId,
          stages: item.stages || {},
        }));
        setClients(aggregatedClients);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Vérifie si un stage est finalisé (vert)
  const isStageCompleted = (sectionKey: string, stage?: ClientStage) => {
    if (!stage) return false;
    
    const status = stage.statut?.toLowerCase() || '';
    
    // DP Accordés - toujours finalisé
    if (sectionKey === 'dp-accordes') return true;
    
    // Consuel Finalisé - toujours finalisé
    if (sectionKey === 'consuel-finalise') return true;
    
    // Raccordement MES - toujours finalisé
    if (sectionKey === 'raccordement-mes') return true;
    
    // DAACT - validé si statut contient validé/fait/ok/transmis
    if (sectionKey === 'daact') {
      if (status.includes('validé') || status.includes('fait') || status.includes('ok') || 
          status.includes('transmis')) return true;
    }
    
    // Raccordement - validé si statut contient service/transmis
    if (sectionKey === 'raccordement') {
      if (status.includes('service') || status.includes('mis en service')) return true;
    }
    
    return false;
  };

  // Vérifie si un stage est en cours/en attente (orange)
  const isStageInProgress = (sectionKey: string, stage?: ClientStage) => {
    if (!stage) return false;
    if (isStageCompleted(sectionKey, stage)) return false;
    
    const status = stage.statut?.toLowerCase() || '';
    
    // DP En Cours - ABF ou En cours d'instruction
    if (sectionKey === 'dp-en-cours') {
      if (status.includes('abf') || status.includes('instruction') || status.includes('cours')) return true;
    }
    
    // Consuel En Cours - Traitement en cours
    if (sectionKey === 'consuel-en-cours') {
      if (status.includes('traitement') || status.includes('cours') || status.includes('avis')) return true;
    }
    
    // DAACT - n'importe quel statut non validé = en cours
    if (sectionKey === 'daact' && stage.statut) return true;
    
    // Raccordement - Demande transmise = en cours
    if (sectionKey === 'raccordement') {
      if (status.includes('transmis') || status.includes('demande')) return true;
    }
    
    return false;
  };

  // Détermine le statut à afficher pour un stage
  const getStageStatus = (sectionKey: string, stage?: ClientStage): 'completed' | 'inprogress' | 'empty' => {
    if (!stage) return 'empty';
    if (isStageCompleted(sectionKey, stage)) return 'completed';
    if (isStageInProgress(sectionKey, stage)) return 'inprogress';
    return 'empty';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500 text-white border-emerald-600';
      case 'inprogress':
        return 'bg-amber-500 text-white border-amber-600';
      default:
        return 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700';
    }
  };

  // Calcule la progression réelle du client
  const getProgressForClient = (client: AggregatedClient) => {
    let completed = 0;
    let inProgress = 0;
    
    // Vérifier DP (en cours ou accordé)
    const dpStage = client.stages['dp-accordes'] || client.stages['dp-en-cours'];
    if (isStageCompleted('dp-accordes', client.stages['dp-accordes'])) completed++;
    else if (isStageInProgress('dp-en-cours', client.stages['dp-en-cours'])) inProgress++;
    
    // Vérifier DAACT
    if (isStageCompleted('daact', client.stages['daact'])) completed++;
    else if (isStageInProgress('daact', client.stages['daact'])) inProgress++;
    
    // Vérifier Consuel (en cours ou finalisé)
    if (isStageCompleted('consuel-finalise', client.stages['consuel-finalise'])) completed++;
    else if (isStageInProgress('consuel-en-cours', client.stages['consuel-en-cours'])) inProgress++;
    
    // Vérifier Raccordement (en cours ou MES)
    if (isStageCompleted('raccordement-mes', client.stages['raccordement-mes'])) completed++;
    else if (isStageInProgress('raccordement', client.stages['raccordement'])) inProgress++;
    
    const totalStages = 4; // 4 étapes majeures
    const progressValue = (completed * 100 + inProgress * 50) / totalStages; // 100% pour terminé, 50% pour en cours
    
    return { 
      completed, 
      inProgress,
      total: totalStages, 
      percentage: Math.round(progressValue)
    };
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.ville?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.clientId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterCompleted) {
      const progress = getProgressForClient(client);
      return progress.percentage === 100;
    }
    
    if (filterFinancement !== 'all') {
      if (filterFinancement === 'sunlib') {
        return client.financement?.toLowerCase().includes('sunlib');
      } else if (filterFinancement === 'otovo') {
        return client.financement?.toLowerCase().includes('otovo');
      } else if (filterFinancement === 'upfront') {
        return client.financement?.toLowerCase().includes('upfront');
      }
    }
    
    return true;
  }).sort((a, b) => {
    if (sortBy === 'progress') {
      const progressA = getProgressForClient(a).percentage;
      const progressB = getProgressForClient(b).percentage;
      return sortOrder === 'asc' ? progressA - progressB : progressB - progressA;
    } else if (sortBy === 'name') {
      return sortOrder === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      {/* Download Modal */}
      {downloadFormat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Télécharger les données clients
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Voulez-vous télécharger tous les clients au format {downloadFormat.toUpperCase()} ?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDownload}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  disabled={isDownloading}
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDownload(downloadFormat)}
                  disabled={isDownloading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <CheckCircle weight="bold" className="w-4 h-4" />
                      Télécharger
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 p-2 max-w-7xl mx-auto">
      {/* Header avec Stats - Design sobre */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
              <Users className="h-6 w-6 text-slate-600 dark:text-slate-300" weight="bold" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Vue Clients
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} • Vue d'ensemble
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stats mini - design sobre */}
            <div className="hidden sm:flex items-center gap-3 mr-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" weight="fill" />
                <span className="text-xs font-medium text-emerald-700">
                  {filteredClients.filter(c => getProgressForClient(c).percentage === 100).length} terminés
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-amber-600" weight="fill" />
                <span className="text-xs font-medium text-amber-700">
                  {filteredClients.filter(c => {
                    const p = getProgressForClient(c);
                    return p.percentage > 0 && p.percentage < 100;
                  }).length} en cours
                </span>
              </div>
            </div>
            
            {/* Filter by Financement */}
            <div className="relative">
              <select
                value={filterFinancement}
                onChange={(e) => setFilterFinancement(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-600 cursor-pointer"
              >
                <option value="all">Tous</option>
                <option value="sunlib">Sunlib</option>
                <option value="otovo">Otovo</option>
                <option value="upfront">Upfront</option>
              </select>
              <ArrowRight className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
            
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
              )}
            >
              {viewMode === 'cards' ? (
                <>
                  <ChartBar className="h-3.5 w-3.5" weight="bold" />
                  Tableau
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" weight="bold" />
                  Cartes
                </>
              )}
            </button>
            
            {/* Sort by */}
            <button
              onClick={() => {
                if (sortBy === 'progress') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('progress');
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                sortBy === 'progress' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
              )}
            >
              <TrendUp className={cn('h-3.5 w-3.5', sortBy === 'progress' && sortOrder === 'desc' && 'rotate-180')} weight="bold" />
              Progression
            </button>
            
            <button
              onClick={() => {
                if (sortBy === 'name') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('name');
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                sortBy === 'name' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
              )}
            >
              <User className={cn('h-3.5 w-3.5', sortBy === 'name' && sortOrder === 'desc' && 'rotate-180')} weight="bold" />
              Nom
            </button>
            
            {/* Filter - design sobre */}
            <button
              onClick={() => setFilterCompleted(!filterCompleted)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                filterCompleted 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
              )}
            >
              <Faders className="h-3.5 w-3.5" weight="bold" />
              {filterCompleted ? 'Tous' : 'Terminés'}
            </button>
            
            {/* Search - design sobre */}
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-600 w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" weight="bold" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend sobre */}
      <div className="flex items-center gap-6 text-xs px-2">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle className="h-2 w-2 text-white" weight="bold" />
          </div>
          <span className="text-slate-600 dark:text-slate-400">Validé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center">
            <Clock className="h-2 w-2 text-white" weight="bold" />
          </div>
          <span className="text-slate-600 dark:text-slate-400">En cours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
          <span className="text-slate-600 dark:text-slate-400">Non démarré</span>
        </div>
      </div>

      {/* Clients Grid or Table */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
          {filteredClients.map((client, index) => {
            const progress = getProgressForClient(client);
            
            return (
              <motion.div
                key={`${client.name}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 overflow-hidden group"
              >
              {/* Client Header - sobre */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300',
                      progress.percentage === 100 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : progress.percentage > 0
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-slate-200 dark:bg-slate-700'
                    )}>
                      <User className={cn(
                        'h-6 w-6',
                        progress.percentage === 100 
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : progress.percentage > 0
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400'
                      )} weight="bold" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate">
                        {client.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        {client.ville && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {client.ville}
                          </span>
                        )}
                        {client.financement && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                            {client.financement}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Circle */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="relative w-14 h-14">
                      <svg className="w-14 h-14 transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-slate-100 dark:text-slate-700"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          className={cn(
                            'transition-all duration-700',
                            progress.percentage === 100 ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'
                          )}
                          strokeDasharray={`${progress.percentage * 1.51} 151`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={cn(
                          'text-sm font-semibold',
                          progress.percentage === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                        )}>
                          {progress.percentage}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {progress.completed}/{progress.total} étapes
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Stages Grid - 4 étapes améliorées */}
              <div className="p-4">
                <div className="grid grid-cols-4 gap-3">
                  {/* DP */}
                  {(() => {
                    const finalStage = client.stages['dp-accordes'];
                    const inProgressStage = client.stages['dp-en-cours'];
                    const isCompleted = isStageCompleted('dp-accordes', finalStage);
                    const isInProgress = isStageInProgress('dp-en-cours', inProgressStage);
                    const stage = finalStage || inProgressStage;
                    const status = isCompleted ? 'completed' : isInProgress ? 'inprogress' : 'empty';
                    
                    return (
                      <div
                        className={cn(
                          'relative rounded-lg p-2 border transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600',
                          status === 'completed' && 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800',
                          status === 'inprogress' && 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800',
                          status === 'empty' && 'bg-slate-50 border-slate-100 dark:bg-slate-800/20 dark:border-slate-700'
                        )}
                      >
                        <div className="flex flex-col items-center text-center gap-1">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center',
                            status === 'completed' && 'bg-emerald-500 text-white',
                            status === 'inprogress' && 'bg-amber-500 text-white',
                            status === 'empty' && 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-500'
                          )}>
                            {status === 'completed' ? (
                              <CheckCircle className="h-3.5 w-3.5" weight="bold" />
                            ) : status === 'inprogress' ? (
                              <Clock className="h-3.5 w-3.5" weight="bold" />
                            ) : (
                              <Circle className="h-3.5 w-3.5" weight="light" />
                            )}
                          </div>
                          <span className={cn(
                            'text-[10px] font-semibold leading-tight',
                            status === 'completed' && 'text-emerald-700 dark:text-emerald-500',
                            status === 'inprogress' && 'text-amber-700 dark:text-amber-500',
                            status === 'empty' && 'text-slate-400'
                          )}>DP</span>
                          {stage?.statut && status !== 'empty' && (
                            <span className="text-[8px] text-slate-500 dark:text-slate-500 truncate w-full px-0.5 leading-tight">{stage.statut}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* DAACT */}
                  {(() => {
                    const stage = client.stages['daact'];
                    const isCompleted = isStageCompleted('daact', stage);
                    const isInProgress = isStageInProgress('daact', stage);
                    const status = isCompleted ? 'completed' : isInProgress ? 'inprogress' : 'empty';
                    
                    return (
                      <div
                        className={cn(
                          'relative rounded-lg p-2 border transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600',
                          status === 'completed' && 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800',
                          status === 'inprogress' && 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800',
                          status === 'empty' && 'bg-slate-50 border-slate-100 dark:bg-slate-800/20 dark:border-slate-700'
                        )}
                      >
                        <div className="flex flex-col items-center text-center gap-1">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center',
                            status === 'completed' && 'bg-emerald-500 text-white',
                            status === 'inprogress' && 'bg-amber-500 text-white',
                            status === 'empty' && 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-500'
                          )}>
                            {status === 'completed' ? (
                              <CheckCircle className="h-3.5 w-3.5" weight="bold" />
                            ) : status === 'inprogress' ? (
                              <Clock className="h-3.5 w-3.5" weight="bold" />
                            ) : (
                              <Circle className="h-3.5 w-3.5" weight="light" />
                            )}
                          </div>
                          <span className={cn(
                            'text-[10px] font-semibold leading-tight',
                            status === 'completed' && 'text-emerald-700 dark:text-emerald-500',
                            status === 'inprogress' && 'text-amber-700 dark:text-amber-500',
                            status === 'empty' && 'text-slate-400'
                          )}>DAACT</span>
                          {stage?.statut && status !== 'empty' && (
                            <span className="text-[8px] text-slate-500 dark:text-slate-500 truncate w-full px-0.5 leading-tight">{stage.statut}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Consuel */}
                  {(() => {
                    const finalStage = client.stages['consuel-finalise'];
                    const inProgressStage = client.stages['consuel-en-cours'];
                    const isCompleted = isStageCompleted('consuel-finalise', finalStage);
                    const isInProgress = isStageInProgress('consuel-en-cours', inProgressStage);
                    const stage = finalStage || inProgressStage;
                    const status = isCompleted ? 'completed' : isInProgress ? 'inprogress' : 'empty';
                    
                    return (
                      <div
                        className={cn(
                          'relative rounded-lg p-2 border transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600',
                          status === 'completed' && 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800',
                          status === 'inprogress' && 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800',
                          status === 'empty' && 'bg-slate-50 border-slate-100 dark:bg-slate-800/20 dark:border-slate-700'
                        )}
                      >
                        <div className="flex flex-col items-center text-center gap-1">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center',
                            status === 'completed' && 'bg-emerald-500 text-white',
                            status === 'inprogress' && 'bg-amber-500 text-white',
                            status === 'empty' && 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-500'
                          )}>
                            {status === 'completed' ? (
                              <CheckCircle className="h-3.5 w-3.5" weight="bold" />
                            ) : status === 'inprogress' ? (
                              <Clock className="h-3.5 w-3.5" weight="bold" />
                            ) : (
                              <Circle className="h-3.5 w-3.5" weight="light" />
                            )}
                          </div>
                          <span className={cn(
                            'text-[10px] font-semibold leading-tight',
                            status === 'completed' && 'text-emerald-700 dark:text-emerald-500',
                            status === 'inprogress' && 'text-amber-700 dark:text-amber-500',
                            status === 'empty' && 'text-slate-400'
                          )}>Consuel</span>
                          {stage?.statut && status !== 'empty' && (
                            <span className="text-[8px] text-slate-500 dark:text-slate-500 truncate w-full px-0.5 leading-tight">{stage.statut}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Raccordement / MES */}
                  {(() => {
                    const finalStage = client.stages['raccordement-mes'];
                    const inProgressStage = client.stages['raccordement'];
                    const isCompleted = isStageCompleted('raccordement-mes', finalStage);
                    const isInProgress = isStageInProgress('raccordement', inProgressStage);
                    const stage = finalStage || inProgressStage;
                    const status = isCompleted ? 'completed' : isInProgress ? 'inprogress' : 'empty';
                    
                    return (
                      <div
                        className={cn(
                          'relative rounded-lg p-2 border transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600',
                          status === 'completed' && 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800',
                          status === 'inprogress' && 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800',
                          status === 'empty' && 'bg-slate-50 border-slate-100 dark:bg-slate-800/20 dark:border-slate-700'
                        )}
                      >
                        <div className="flex flex-col items-center text-center gap-1">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center',
                            status === 'completed' && 'bg-emerald-500 text-white',
                            status === 'inprogress' && 'bg-amber-500 text-white',
                            status === 'empty' && 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-500'
                          )}>
                            {status === 'completed' ? (
                              <CheckCircle className="h-3.5 w-3.5" weight="bold" />
                            ) : status === 'inprogress' ? (
                              <Clock className="h-3.5 w-3.5" weight="bold" />
                            ) : (
                              <Circle className="h-3.5 w-3.5" weight="light" />
                            )}
                          </div>
                          <span className={cn(
                            'text-[10px] font-semibold leading-tight',
                            status === 'completed' && 'text-emerald-700 dark:text-emerald-500',
                            status === 'inprogress' && 'text-amber-700 dark:text-amber-500',
                            status === 'empty' && 'text-slate-400'
                          )}>{isCompleted ? 'MES' : 'Racc.'}</span>
                          {stage?.statut && status !== 'empty' && (
                            <span className="text-[8px] text-slate-500 dark:text-slate-500 truncate w-full px-0.5 leading-tight">{stage.statut}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
      ) : (
        // Table View
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Ville</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Financement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Progression</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">DP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">DAACT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Consuel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Raccordement</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client, index) => {
                const progress = getProgressForClient(client);
                const dpStage = client.stages['dp-accordes'] || client.stages['dp-en-cours'];
                const daactStage = client.stages['daact'];
                const consuelStage = client.stages['consuel-finalise'] || client.stages['consuel-en-cours'];
                const raccordementStage = client.stages['raccordement-mes'] || client.stages['raccordement'];

                return (
                  <tr key={`${client.name}-${index}`} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{client.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{client.ville || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{client.financement || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${progress.percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{progress.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn('w-2 h-2 rounded-full', isStageCompleted('dp-accordes', client.stages['dp-accordes']) ? 'bg-emerald-500' : isStageInProgress('dp-en-cours', client.stages['dp-en-cours']) ? 'bg-amber-500' : 'bg-slate-300')} />
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn('w-2 h-2 rounded-full', isStageCompleted('daact', daactStage) ? 'bg-emerald-500' : isStageInProgress('daact', daactStage) ? 'bg-amber-500' : 'bg-slate-300')} />
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn('w-2 h-2 rounded-full', isStageCompleted('consuel-finalise', client.stages['consuel-finalise']) ? 'bg-emerald-500' : isStageInProgress('consuel-en-cours', client.stages['consuel-en-cours']) ? 'bg-amber-500' : 'bg-slate-300')} />
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn('w-2 h-2 rounded-full', isStageCompleted('raccordement-mes', client.stages['raccordement-mes']) ? 'bg-emerald-500' : isStageInProgress('raccordement', client.stages['raccordement']) ? 'bg-amber-500' : 'bg-slate-300')} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State amélioré */}
      {filteredClients.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 mb-4 shadow-inner">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Aucun client trouvé
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery 
              ? `Aucun résultat pour "${searchQuery}". Essayez une autre recherche.`
              : filterCompleted 
                ? "Aucun projet terminé. Les projets en cours apparaîtront ici."
                : "Commencez par ajouter des clients dans les différentes sections."
            }
          </p>
        </motion.div>
      )}
    </div>
    </>
  );
}
