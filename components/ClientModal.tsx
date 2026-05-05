'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  X,
  Eye,
  EyeSlash,
  Calendar,
  Buildings,
  FileText,
  Key,
  Lightning,
  CheckCircle,
  ChatCircle,
  Flag,
  House,
  Clock,
  PencilSimple,
  Trash,
  MapPin,
  ArrowRight,
  Tag,
} from '@phosphor-icons/react';
import { ClientRecord } from '@/types/client';
import { formatDateFR } from '@/lib/clientTableUtils';
import { toast } from '@/store/useToastStore';

interface ClientModalProps {
  selectedClient: ClientRecord | null;
  onClose: () => void;
  onEdit: (client: ClientRecord) => void;
  onDelete?: (id: string) => void;
  section: string;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}

const sectionColors: Record<string, { bg: string; text: string; gradient: string }> = {
  'dp-en-cours': { bg: 'bg-amber-500', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-500' },
  'dp-accordes': { bg: 'bg-emerald-500', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-500' },
  'dp-refuses': { bg: 'bg-rose-500', text: 'text-rose-600', gradient: 'from-rose-500 to-pink-500' },
  'daact': { bg: 'bg-violet-500', text: 'text-violet-600', gradient: 'from-violet-500 to-purple-500' },
  'installation': { bg: 'bg-cyan-500', text: 'text-cyan-600', gradient: 'from-cyan-500 to-blue-500' },
  'consuel-en-cours': { bg: 'bg-amber-500', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-500' },
  'consuel-finalise': { bg: 'bg-emerald-500', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-500' },
  'raccordement': { bg: 'bg-blue-500', text: 'text-blue-600', gradient: 'from-blue-500 to-indigo-500' },
  'raccordement-mes': { bg: 'bg-emerald-500', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-500' },
};

const getSectionColor = (section: string) => {
  return sectionColors[section] || { bg: 'bg-slate-500', text: 'text-slate-600', gradient: 'from-slate-500 to-gray-500' };
};

const getSectionLabel = (section: string) => {
  const labels: Record<string, string> = {
    'dp-en-cours': 'Déclaration Préalable - En cours',
    'dp-accordes': 'Déclaration Préalable - Accordée',
    'dp-refuses': 'Déclaration Préalable - Refusée',
    'daact': 'DAACT',
    'installation': 'Installation',
    'consuel-en-cours': 'Consuel - En cours',
    'consuel-finalise': 'Consuel - Finalisé',
    'raccordement': 'Raccordement',
    'raccordement-mes': 'Raccordement - MES',
  };
  return labels[section] || section;
};

export default function ClientModal({
  selectedClient,
  onClose,
  onEdit,
  onDelete,
  section,
  showPassword,
  setShowPassword,
}: ClientModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedClient) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    previousActiveElementRef.current = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      previousActiveElementRef.current?.focus();
    };
  }, [onClose, selectedClient]);

  const getUrgencyInfo = () => {
    if (!selectedClient?.dateEstimative) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const estimatedDate = new Date(selectedClient.dateEstimative);
    estimatedDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (estimatedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return { label: 'En retard', color: 'text-rose-600 bg-rose-50 border-rose-200', urgent: true, diffDays };
    }
    if (diffDays === 0) {
      return { label: "Aujourd'hui", color: 'text-red-600 bg-red-50 border-red-200', urgent: true, diffDays };
    }
    if (diffDays <= 3) {
      return { label: 'Urgent', color: 'text-orange-600 bg-orange-50 border-orange-200', urgent: true, diffDays };
    }
    if (diffDays <= 7) {
      return { label: 'Proche', color: 'text-amber-600 bg-amber-50 border-amber-200', urgent: false, diffDays };
    }
    return { label: 'À venir', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', urgent: false, diffDays };
  };

  const urgency = getUrgencyInfo();
  const colors = getSectionColor(section);

  const handleEdit = () => {
    if (selectedClient) onEdit(selectedClient);
  };

  const handleDelete = () => {
    if (selectedClient?._id && onDelete) {
      if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
        onDelete(selectedClient._id);
        onClose();
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié dans le presse-papier`);
  };

  return (
    <AnimatePresence>
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-in Panel */}
          <motion.div
            ref={modalRef}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-5xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={`Dossier ${selectedClient.client || 'client'}`}
          >
            {/* Modern Header with Gradient */}
            <div className={`relative bg-gradient-to-r ${colors.gradient} p-5 text-white`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="h-8 w-8 text-white" weight="bold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-white truncate">
                      {selectedClient.client}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur text-white">
                        {getSectionLabel(section)}
                      </span>
                      {(selectedClient.clientId || selectedClient._id || selectedClient.id) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur text-white">
                          N° Badge: {selectedClient.clientId || selectedClient._id || selectedClient.id}
                        </span>
                      )}
                      {selectedClient.statut && !section.startsWith('consuel') && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedClient.statut.includes('Accord') ? 'bg-emerald-400/30 text-white' :
                          selectedClient.statut.includes('Refus') ? 'bg-rose-400/30 text-white' :
                          'bg-white/20 text-white'
                        }`}>
                          {selectedClient.statut}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    className="p-2.5 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 transition-all duration-200"
                    title="Modifier"
                  >
                    <PencilSimple className="h-5 w-5 text-white" weight="bold" />
                  </button>
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className="p-2.5 rounded-xl bg-white/10 backdrop-blur hover:bg-rose-500/50 transition-all duration-200"
                      title="Supprimer"
                    >
                      <Trash className="h-5 w-5 text-white" weight="bold" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 transition-all duration-200 ml-2"
                    title="Fermer"
                  >
                    <X className="h-5 w-5 text-white" weight="bold" />
                  </button>
                </div>
              </div>

              {/* Quick Info Chips */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                {urgency && !section.startsWith('consuel') && section !== 'dp-refuses' && section !== 'dp-accordes' && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${urgency.color}`}>
                    <Clock className="h-3.5 w-3.5" weight="bold" />
                    {urgency.label} ({urgency.diffDays}j)
                  </div>
                )}
                {selectedClient.financement && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur text-white border border-white/30">
                    <Tag className="h-3.5 w-3.5" weight="bold" />
                    {selectedClient.financement}
                  </div>
                )}
                {selectedClient.ville && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 backdrop-blur text-white/90 border border-white/20">
                    <MapPin className="h-3.5 w-3.5" weight="bold" />
                    {selectedClient.ville}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
              <div className="p-5 space-y-4">
                {/* KPI Cards - Modern Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {selectedClient.dateEstimative && section !== 'consuel-finalise' && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-xl ${colors.bg} bg-opacity-10`}>
                          <Calendar className={`h-4 w-4 ${colors.text}`} weight="bold" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {section === 'installation' ? 'Date de pose' : 'Date estimative'}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatDateFR(selectedClient.dateEstimative)}
                      </p>
                    </motion.div>
                  )}

                  {selectedClient.dateEnvoi && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                          <ArrowRight className="h-4 w-4 text-blue-600" weight="bold" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Date d&apos;envoi</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatDateFR(selectedClient.dateEnvoi)}
                      </p>
                    </motion.div>
                  )}

                  {selectedClient.noDp && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                          <FileText className="h-4 w-4 text-violet-600" weight="bold" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Numéro DP</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {selectedClient.noDp}
                      </p>
                    </motion.div>
                  )}

                  {section.startsWith('consuel') && selectedClient.typeConsuel && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                          <Lightning className="h-4 w-4 text-amber-600" weight="bold" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Type Consuel</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {selectedClient.typeConsuel}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Portal Credentials Section */}
                {section.startsWith('dp') && section !== 'dp-accordes' && section !== 'dp-refuses' && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Key className="h-4 w-4 text-slate-500" weight="bold" />
                        Identifiants Portail
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {selectedClient.portail && (
                          <div className="group">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Portail</label>
                            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                              <Buildings className="h-4 w-4 text-slate-400" weight="bold" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{selectedClient.portail}</span>
                            </div>
                          </div>
                        )}
                        {selectedClient.identifiant && (
                          <div className="group">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Identifiant</label>
                            <button
                              onClick={() => copyToClipboard(selectedClient.identifiant!, 'Identifiant')}
                              className="w-full flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                            >
                              <User className="h-4 w-4 text-slate-400" weight="bold" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{selectedClient.identifiant}</span>
                            </button>
                          </div>
                        )}
                        {selectedClient.motDePasse && (
                          <div className="group">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Mot de passe</label>
                            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                              <Key className="h-4 w-4 text-slate-400" weight="bold" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white flex-1">
                                {showPassword ? selectedClient.motDePasse : '••••••••'}
                              </span>
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              >
                                {showPassword ? (
                                  <EyeSlash className="h-4 w-4 text-slate-500" weight="bold" />
                                ) : (
                                  <Eye className="h-4 w-4 text-slate-500" weight="bold" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Consuel Section */}
                {section.startsWith('consuel') && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Lightning className="h-4 w-4 text-amber-500" weight="bold" />
                        Informations Consuel
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
                        {selectedClient.pvChantierDate && (
                          <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                              <CheckCircle className="h-4 w-4 text-emerald-600" weight="bold" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">PV Chantier</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDateFR(selectedClient.pvChantierDate)}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.statut && (
                          <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Flag className="h-4 w-4 text-blue-600" weight="bold" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Statut</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedClient.statut}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.typeConsuel && (
                          <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                              <Lightning className="h-4 w-4 text-amber-600" weight="bold" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Type</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedClient.typeConsuel}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.dateDerniereDemarche && (
                          <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                              <Calendar className="h-4 w-4 text-violet-600" weight="bold" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Dernière démarche</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDateFR(selectedClient.dateDerniereDemarche)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Raccordement Section */}
                {section === 'raccordement' && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Flag className="h-4 w-4 text-blue-500" weight="bold" />
                        Raccordement
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
                        {selectedClient.typeConsuel && (
                          <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                              <Lightning className="h-4 w-4 text-amber-600" weight="bold" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Type de consuel</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedClient.typeConsuel}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.statut && (
                          <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Flag className="h-4 w-4 text-blue-600" weight="bold" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Statut</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedClient.statut}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Raccordement MES Section */}
                {section === 'raccordement-mes' && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <House className="h-4 w-4 text-emerald-500" weight="bold" />
                        Mise en Service
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
                        {selectedClient.numeroContrat && (
                          <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                              <FileText className="h-4 w-4 text-violet-600" weight="bold" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Numéro de contrat</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedClient.numeroContrat}</p>
                            </div>
                          </div>
                        )}
                        {selectedClient.dateMiseEnService && (
                          <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                              <Calendar className="h-4 w-4 text-emerald-600" weight="bold" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Date de MES</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDateFR(selectedClient.dateMiseEnService)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Comments Section */}
                {(section.startsWith('consuel') || section === 'raccordement' || section === 'raccordement-mes') && selectedClient.commentaires && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <ChatCircle className="h-4 w-4 text-slate-500" weight="bold" />
                        Commentaires
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {selectedClient.commentaires}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  ID: {selectedClient.clientId || selectedClient._id || selectedClient.id}
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 font-medium text-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
