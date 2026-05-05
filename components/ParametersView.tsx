'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  CheckCircle,
  WarningCircle,
  FileText,
  CheckSquare,
  Lightning,
  House,
  ArrowLeft,
  X,
  Table,
  Code,
  Moon,
  Sun,
  Trash,
  Database,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { parseJsonSafe } from '@/lib/utils';

const exportSections = [
  {
    id: 'all',
    label: 'Toutes les sections',
    description: 'Exporter tous les clients de toutes les sections',
    icon: null,
    color: 'from-slate-500 to-slate-600',
  },
  {
    id: 'dp',
    label: 'Déclaration Préalable',
    description: 'DP En cours, DP Accordés, DP Refus, DAACT',
    icon: FileText,
    color: 'from-slate-500 to-slate-600',
  },
  {
    id: 'installation',
    label: 'Installation',
    description: 'Installation en cours',
    icon: House,
    color: 'from-slate-500 to-slate-600',
  },
  {
    id: 'consuel',
    label: 'Certification Consuel',
    description: 'Consuel En cours, Consuel Finalisé',
    icon: CheckSquare,
    color: 'from-slate-500 to-slate-600',
  },
  {
    id: 'raccordement',
    label: 'Raccordement',
    description: 'Raccordement et Mise En Service',
    icon: Lightning,
    color: 'from-slate-500 to-slate-600',
  },
];

const exportFormats = [
  {
    id: 'csv',
    label: 'CSV',
    description: 'Format tableur compatible Excel',
    icon: Table,
    color: 'from-slate-500 to-slate-600',
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Format structuré pour développeurs',
    icon: Code,
    color: 'from-slate-600 to-slate-700',
  },
];

type ExportStep = 'format' | 'section' | 'loading';

export default function ParametersView() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<ExportStep>('format');
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>('0 KB');

  // Calculate cache size
  const calculateCacheSize = () => {
    let totalSize = 0;

    // Calculate localStorage size
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }

    // Calculate sessionStorage size
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        totalSize += sessionStorage[key].length + key.length;
      }
    }

    // Convert to human-readable format
    if (totalSize < 1024) {
      return `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(2)} KB`;
    } else {
      return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  // Check dark mode on mount and calculate cache size
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    setCacheSize(calculateCacheSize());
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleClearCache = async () => {
    try {
      // Clear React Query cache
      localStorage.removeItem('clients-cache');
      sessionStorage.clear();
      
      // Reload the page to clear all caches
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const resetExport = () => {
    setCurrentStep('format');
    setSelectedFormat(null);
    setSelectedSection(null);
    setShowExportModal(false);
  };

  const handleFormatSelect = (format: string) => {
    setSelectedFormat(format);
    setCurrentStep('section');
  };

  const handleSectionSelect = async (section: string) => {
    setSelectedSection(section);
    setCurrentStep('loading');

    try {
      const sectionParam = section === 'all' ? '' : `?section=${section}`;
      const url = `/api/export/${selectedFormat}${sectionParam}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const timestamp = new Date().toISOString().split('T')[0];
      const sectionLabel = exportSections.find((s) => s.id === section)?.label.toLowerCase().replace(/\s+/g, '-') || 'all';
      link.download = `clients-${sectionLabel}-${timestamp}.${selectedFormat}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setMessage({
        type: 'success',
        text: `Export ${selectedFormat?.toUpperCase()} réussi !`,
      });
    } catch (error) {
      console.error('Export error:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors de l\'export des données',
      });
    } finally {
      setTimeout(() => {
        resetExport();
      }, 500);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const result = (await parseJsonSafe(response)) || {};

      if (response.ok) {
        setMessage({
          type: 'success',
          text: result.message || 'Fichier importé avec succès!',
        });
        event.target.value = '';
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Erreur lors de l\'import du fichier',
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors de l\'import du fichier',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Centre de téléchargement
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gérez l'import et l'export de vos données clients
          </p>
        </div>

        {/* Message d'alerte/succès */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" weight="fill" />
            ) : (
              <WarningCircle className="text-red-600 dark:text-red-400 flex-shrink-0" weight="fill" />
            )}
            <p
              className={`text-sm font-medium ${
                message.type === 'success'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Download className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Télécharger les données
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Exportez vos données clients par section au format CSV ou JSON
            </p>

            <button
              onClick={() => setShowExportModal(true)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Download weight="bold" className="w-5 h-5" />
              Télécharger les données
            </button>
          </div>

          {/* Upload Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Upload className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Importer des données
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Importez des données depuis un fichier Excel, CSV ou JSON
            </p>

            <div className="flex flex-col gap-4">
              <label className="relative block">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  accept=".xlsx,.xls,.csv,.json"
                  className="hidden"
                  aria-label="Uploader un fichier"
                />
                <div
                  className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  onClick={(e) => {
                    if (isLoading) {
                      e.preventDefault();
                      return;
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload weight="bold" className="w-5 h-5" />
                      Sélectionner un fichier
                    </>
                  )}
                </div>
              </label>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formats supportés : Excel (.xlsx, .xls), CSV (.csv), JSON (.json)
              </p>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Préférences
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" weight="fill" />
                ) : (
                  <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" weight="fill" />
                )}
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Mode sombre</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isDarkMode ? 'Activé' : 'Désactivé'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDarkMode ? 'bg-slate-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Clear Cache */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <ArrowsClockwise className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Vider le cache</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Taille : {cacheSize} • Rafraîchir les données
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClearCacheConfirm(true)}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Trash className="w-4 h-4" />
                Vider
              </button>
            </div>
          </div>
        </div>

        {/* Information Box */}
        <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold">Conseil :</span> Les exports incluent tous vos clients avec leurs informations complètes.
            Les imports doivent respecter le même format que les exports.
          </p>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {currentStep === 'format' ? (
                  <>
                    <div className="p-2 bg-slate-700 rounded-lg">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Choisir le format
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Étape 1 sur 2
                      </p>
                    </div>
                  </>
                ) : currentStep === 'section' ? (
                  <>
                    <button
                      onClick={() => setCurrentStep('format')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Choisir la section
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Étape 2 sur 2 • Format : {selectedFormat?.toUpperCase()}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-slate-700 rounded-lg">
                      <LoadingSpinner size="sm" className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Export en cours...
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Téléchargement en cours
                      </p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={resetExport}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {currentStep === 'format' && (
                <div className="space-y-3">
                  {exportFormats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => handleFormatSelect(format.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 group"
                    >
                      <div
                        className={`p-3 rounded-lg bg-gradient-to-r ${format.color} group-hover:scale-110 transition-transform duration-200`}
                      >
                        <format.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                          {format.label}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {format.description}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-slate-500 group-hover:bg-slate-500 transition-all duration-200" />
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 'section' && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {exportSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionSelect(section.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 group"
                    >
                      {section.icon ? (
                        <div
                          className={`p-3 rounded-lg bg-gradient-to-r ${section.color} group-hover:scale-110 transition-transform duration-200`}
                        >
                          <section.icon className="w-6 h-6 text-white" />
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-gradient-to-r from-slate-500 to-slate-600 group-hover:scale-110 transition-transform duration-200">
                          <Download className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                          {section.label}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {section.description}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-slate-500 group-hover:bg-slate-500 transition-all duration-200" />
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 'loading' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <LoadingSpinner size="lg" className="text-slate-600 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Préparation du fichier {selectedFormat?.toUpperCase()}...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Cache Confirmation Dialog */}
      {showClearCacheConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Trash className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Confirmer le vidage du cache
              </h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Cette action va vider toutes les données en cache et recharger la page. Les données non sauvegardées seront perdues.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowClearCacheConfirm(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setShowClearCacheConfirm(false);
                    handleClearCache();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Vider le cache
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
