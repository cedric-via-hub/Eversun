'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientRecord, Section } from '@/types/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DatePicker from '@/components/ui/DatePicker';
import Select from '@/components/ui/Select';
import AutocompleteInput from '@/components/ui/AutocompleteInput';
import Badge from '@/components/ui/Badge';
import FileUpload, { type UploadedFile } from '@/components/ui/FileUpload';
import { cn, parseJsonSafe } from '@/lib/utils';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useClientTemplates } from '@/hooks/useClientTemplates';
import {
  installationStatuts,
  financementOptions,
  pvChantierStatusOptions,
  consuelTypes,
  consuelStatuts,
  raccordementStatuts,
} from '@/lib/sectionConfig';
import {
  FloppyDisk,
  X,
  User,
  Buildings,
  Calendar,
  FileText,
  Lightning,
  Info,
  CheckCircle,
  CaretDown,
  MapPin,
  Shield,
  Globe,
  Key,
  Clock,
  House,
  Gear,
} from '@phosphor-icons/react';

interface ClientFormProps {
  /** Section dans laquelle le formulaire est utilisé */
  section: Section;
  /** Client à modifier (null pour un nouveau client) */
  client?: ClientRecord | null;
  /** Fonction appelée lors de la sauvegarde du formulaire */
  onSave: (record: ClientRecord) => void;
  /** Fonction appelée lors de la fermeture du formulaire */
  onClose: () => void;
}

const dpStatuts = [
  "En cours d'instruction",
  'ABF',
  'Accord favorable',
  'Accord tacite',
  'Refus',
];
const daactStatuts = ['En attente', 'Validé', 'Refusé'];

// Validation rules based on section
const getValidationRules = (section: Section) => {
  const rules: Record<string, any> = {
    client: { required: true },
  };

  if (!section.startsWith('dp') && section !== 'daact') {
    rules.financement = { required: true };
  }

  if (section.startsWith('dp')) {
    rules.statut = { required: true };
  }

  return rules;
};

export default function ClientForm({
  section,
  client,
  onSave,
  onClose,
}: ClientFormProps) {
  const validationRules = getValidationRules(section);
  const { errors: validationErrors, validateField, validateForm: validateFormHook, clearFieldError } = useFormValidation(validationRules);
  const { getTemplates, applyTemplate } = useClientTemplates();
  const availableTemplates = getTemplates(section);

  const [form, setForm] = useState<ClientRecord>({
    ...(typeof client?.id === 'number' ? { id: client.id } : {}),

    section,
    client: client?.client || '',
    statut: client?.statut || 'Demande à effectuer',
    dateEnvoi: client?.dateEnvoi ?? '',
    dateEstimative: client?.dateEstimative ?? '',
    financement: client?.financement ?? '',
    noDp: client?.noDp ?? '',
    ville: client?.ville ?? '',
    portail: client?.portail ?? '',
    identifiant: client?.identifiant ?? '',
    motDePasse: client?.motDePasse ?? '',
    type: client?.type ?? '',
    pvChantier: client?.pvChantier ?? '',
    pvChantierDate: client?.pvChantierDate ?? '',
    datePV: client?.datePV ?? '',
    typeConsuel: client?.typeConsuel ?? '',
    dateDerniereDemarche: client?.dateDerniereDemarche ?? '',
    commentaires: client?.commentaires ?? '',
    numeroContrat: client?.numeroContrat ?? '',
    dateMiseEnService: client?.dateMiseEnService ?? '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dpAccordesClients, setDpAccordesClients] = useState<string[]>([]);
  const [dpAccordesData, setDpAccordesData] = useState<
    Record<string, { noDp: string; ville: string }>
  >({});
  const [uploadedFilesBySection, setUploadedFilesBySection] = useState<
    Record<string, UploadedFile[]>
  >({});
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-save with debounce
  useEffect(() => {
    if (!isEditing || !client?._id) return;

    setSaveStatus('unsaved');
    
    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds)
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const { id, ...toSend } = form;
        const res = await fetch(`/api/clients/${client._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toSend),
        });
        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('unsaved');
        }
      } catch (error) {
        console.error('Auto-save error:', error);
        setSaveStatus('unsaved');
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [form, isEditing, client?._id]);

  useEffect(() => {
    // Fetch clients from DP Accordés section for autocomplete
    if (section === 'daact') {
      fetch('/api/clients?section=dp-accordes&limit=10000')
        .then((res) => res.json())
        .then((response) => {
          const data = response.data || response;
          const clients = Array.isArray(data)
            ? data.map((item: any) => item.client).filter(Boolean)
            : [];
          // Deduplicate client names
          const uniqueClients = [...new Set(clients)];
          setDpAccordesClients(uniqueClients);

          // Store client data for auto-population (use first occurrence for duplicates)
          const clientDataMap: Record<string, { noDp: string; ville: string }> =
            {};
          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              if (item.client && !clientDataMap[item.client]) {
                clientDataMap[item.client] = {
                  noDp: item.noDp || '',
                  ville: item.ville || '',
                };
              }
            });
          }
          setDpAccordesData(clientDataMap);
        })
        .catch((err) =>
          console.error(
            'Erreur lors du chargement des clients DP Accordés:',
            err
          )
        );
    }
  }, [section]);

  const isDp = section.startsWith('dp');
  const isInstallation = section === 'installation';
  const isConsuel = section.startsWith('consuel');
  const isRaccordement = section === 'raccordement';
  const isRaccordementMes = section === 'raccordement-mes';
  const isDaact = section === 'daact';
  const isSunlibOrOtovo = section === 'sunlib' || section === 'otovo';

  useEffect(() => {
    if (!isSunlibOrOtovo || !form.client) {
      setUploadedFilesBySection({});
      return;
    }

    let mounted = true;
    fetch(`/api/files?clientName=${encodeURIComponent(form.client)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const files = Array.isArray(data.files) ? (data.files as UploadedFile[]) : [];
        const grouped = files.reduce<Record<string, UploadedFile[]>>((acc, file) => {
          const sectionKey = file.section || 'unknown';
          acc[sectionKey] = [...(acc[sectionKey] || []), file];
          return acc;
        }, {});
        setUploadedFilesBySection(grouped);
      })
      .catch(() => {
        if (mounted) {
          setUploadedFilesBySection({});
        }
      });

    return () => {
      mounted = false;
    };
  }, [form.client, isSunlibOrOtovo]);

  const handleUploadedFiles = (sectionKey: string, files: UploadedFile[]) => {
    setUploadedFilesBySection((prev) => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), ...files],
    }));
  };

  const statutOptions = isDp
    ? dpStatuts.map((s) => ({ value: s, label: s }))
    : isInstallation
      ? installationStatuts.map((s) => ({ value: s, label: s }))
      : isConsuel
        ? consuelStatuts.map((s) => ({ value: s, label: s }))
        : isRaccordement
          ? raccordementStatuts.map((s) => ({ value: s, label: s }))
          : isDaact
            ? daactStatuts.map((s) => ({ value: s, label: s }))
            : [];

  useEffect(() => {
    if (!isEditing) {
      setForm({
        ...(client?._id ? { _id: client._id } : {}),
        ...(typeof client?.id === 'number' ? { id: client.id } : {}),
        section,
        client: client?.client || '',
        statut: client?.statut || 'Demande à effectuer',
        dateEnvoi: client?.dateEnvoi ?? '',
        dateEstimative: client?.dateEstimative ?? '',
        financement: client?.financement ?? '',
        noDp: client?.noDp ?? '',
        ville: client?.ville ?? '',
        portail: client?.portail ?? '',
        identifiant: client?.identifiant ?? '',
        motDePasse: client?.motDePasse ?? '',
        type: client?.type ?? '',
        pvChantier: client?.pvChantier ?? '',
        pvChantierDate: client?.pvChantierDate ?? '',
        typeConsuel: client?.typeConsuel ?? '',
        dateDerniereDemarche: client?.dateDerniereDemarche ?? '',
        datePV: client?.datePV ?? '',
        commentaires: client?.commentaires ?? '',
        numeroContrat: client?.numeroContrat ?? '',
        dateMiseEnService: client?.dateMiseEnService ?? '',
      });
    }
  }, [client, section, isEditing]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };

    previousActiveElementRef.current = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTabKey);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'unset';
      previousActiveElementRef.current?.focus();
    };
  }, [onClose]);

  const handleTemplateSelect = (templateId: string) => {
    const template = availableTemplates.find(t => t.id === templateId);
    if (template) {
      const newForm = applyTemplate(template, form);
      setForm(newForm);
      setSelectedTemplate(templateId);
      setIsEditing(true);
    }
  };

  const handleChange = (key: keyof ClientRecord, value: string) => {
    setIsEditing(true);
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (section.startsWith('dp') && key === 'dateEnvoi' && value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          d.setMonth(d.getMonth() + (prev.statut === 'ABF' ? 2 : 1));
          next.dateEstimative = d.toISOString().slice(0, 10);
        }
      }

      if (section.startsWith('dp') && key === 'statut') {
        if (value === 'ABF' && prev.dateEnvoi) {
          const d = new Date(prev.dateEnvoi);
          if (!isNaN(d.getTime())) {
            d.setMonth(d.getMonth() + 2);
            next.dateEstimative = d.toISOString().slice(0, 10);
          }
        }
      }

      // Automated Date Estimatives calculation for Consuel based on type
      if (
        section.startsWith('consuel') &&
        (key === 'typeConsuel' || key === 'dateDerniereDemarche')
      ) {
        const typeConsuel = key === 'typeConsuel' ? value : prev.typeConsuel;
        const dateDerniereDemarche =
          key === 'dateDerniereDemarche' ? value : prev.dateDerniereDemarche;

        if (typeConsuel && dateDerniereDemarche) {
          const d = new Date(dateDerniereDemarche);
          if (!isNaN(d.getTime())) {
            const weeksToAdd =
              typeConsuel === 'Bleu' ? 2 : typeConsuel === 'Violet' ? 4 : 0;
            d.setDate(d.getDate() + weeksToAdd * 7);
            next.dateEstimative = d.toISOString().slice(0, 10);
          }
        }
      }

      if (
        section === 'installation' &&
        key === 'statut' &&
        value === 'En attente date de pose'
      ) {
        next.pvChantier = 'En attente';
      }

      if (
        section === 'installation' &&
        key === 'dateEstimative' &&
        prev.statut === 'En attente date de pose'
      ) {
        next.pvChantier = 'En attente';
      }

      return next;
    });

    // Real-time validation
    validateField(key, value);
  };

  const formatDateInput = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISO = new Date(d.getTime() - tzOffset)
      .toISOString()
      .slice(0, 10);
    return localISO;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called with form:', form);

    if (!validateFormHook(form)) {
      console.log('Validation failed:', validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { id, ...rest } = form;

      let finalSection = section;

      // Consuel: visé → finalisé
      if (section === 'consuel-en-cours' && form.statut === 'Consuel visé') {
        finalSection = 'consuel-finalise';
      }
      // Consuel: retour en cours si pas visé
      if (section === 'consuel-finalise' && form.statut !== 'Consuel visé') {
        finalSection = 'consuel-en-cours';
      }

      // Raccordement: MES → raccordement-mes
      if (section === 'raccordement' && form.statut === 'Mis en service') {
        finalSection = 'raccordement-mes';
      }
      // Raccordement: retour si pas MES
      if (section === 'raccordement-mes' && form.statut !== 'Mis en service') {
        finalSection = 'raccordement';
      }

      // DP: Accord → dp-accordes
      if (section.startsWith('dp') && (form.statut === 'Accord favorable' || form.statut === 'Accord tacite')) {
        finalSection = 'dp-accordes';
      }
      // DP: Refus → dp-refuses
      else if (section.startsWith('dp') && form.statut === 'Refus') {
        finalSection = 'dp-refuses';
      }
      // DP: Autre statut (En cours, ABF) → dp-en-cours
      else if ((section === 'dp-accordes' || section === 'dp-refuses') &&
               form.statut !== 'Accord favorable' &&
               form.statut !== 'Accord tacite' &&
               form.statut !== 'Refus') {
        finalSection = 'dp-en-cours';
      }

      const formToSend: ClientRecord = {
        ...rest,
        section: finalSection,
        statut: form.statut ?? '',
        dateEnvoi: formatDateInput(form.dateEnvoi ?? ''),
        dateEstimative: formatDateInput(form.dateEstimative ?? ''),
        pvChantier: form.pvChantier ?? '',
        pvChantierDate: formatDateInput(form.pvChantierDate ?? ''),
        datePV: formatDateInput(form.datePV ?? ''),
        dateDerniereDemarche: formatDateInput(form.dateDerniereDemarche ?? ''),
        dateMiseEnService: formatDateInput(form.dateMiseEnService ?? ''),
        numeroContrat: form.numeroContrat ?? '',
        typeConsuel: form.typeConsuel ?? '',
        commentaires: form.commentaires ?? '',
      };

      setIsEditing(false);
      onSave(formToSend);
      onClose();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const financementOptionsList = financementOptions.map((f) => ({
    value: f,
    label: f,
  }));
  const typeOptions = consuelTypes.map((t) => ({ value: t, label: t }));

  const getSectionIcon = () => {
    if (isDp) return <FileText className="h-5 w-5" />;
    if (isConsuel) return <Lightning className="h-5 w-5" weight="bold" />;
    if (isRaccordement) return <Buildings className="h-5 w-5" weight="bold" />;
    return <User className="h-5 w-5" />;
  };

  const getSectionColor = () => {
    if (isDp)
      return 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800';
    if (isConsuel)
      return 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800';
    if (isRaccordement)
      return 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-800';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-3xl max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={client ? 'Modifier le dossier' : 'Ajouter un dossier'}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-600 dark:bg-slate-700 text-white">
              {getSectionIcon()}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {client ? 'Modifier le dossier' : 'Nouveau dossier'}
              </h2>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {section.replace(/-/g, ' ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {client && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700">
                {saveStatus === 'saving' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-amber-600 dark:text-amber-400">Enregistrement...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" weight="fill" />
                    <span className="text-emerald-600 dark:text-emerald-400">Enregistré</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-orange-600 dark:text-orange-400">Non enregistré</span>
                  </>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
            >
              <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {!client && availableTemplates.length > 0 && (
            <div className="mb-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">Templates rapides</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTemplateSelect('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    !selectedTemplate
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                  }`}
                >
                  Personnalisé
                </button>
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedTemplate === template.id
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            {section.startsWith('consuel') &&
              form.statut === 'Consuel visé' && (
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded p-1.5">
                  <div className="flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                    <span className="text-[11px] font-semibold text-primary-800 dark:text-primary-200">
                      Déplacement vers "Consuel Finalisé"
                    </span>
                  </div>
                </div>
              )}
            {section === 'raccordement' &&
              form.statut === 'Mis en service' && (
                <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded p-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-success-600 dark:text-success-400" />
                    <span className="text-[11px] font-semibold text-success-800 dark:text-success-200">
                      Déplacement vers "Raccordement MES"
                    </span>
                  </div>
                </div>
              )}

            {!isDaact && (
              <>
                <div
                  id="form-general"
                  className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
                >
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-600 dark:bg-slate-600 text-white">
                    <User className="h-3 w-3" weight="bold" />
                  </div>
                  Informations Générales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {!isDp && (
                    <Select
                      label="Financement *"
                      value={form.financement}
                      onChange={(e) =>
                        handleChange('financement', e.target.value)
                      }
                      options={financementOptionsList}
                      placeholder="Sélectionner un financement"
                      required
                      error={validationErrors.financement}
                      icon={<Buildings className="h-4 w-4" weight="bold" />}
                    />
                  )}

                  <Input
                    label="Client *"
                    value={form.client}
                    onChange={(e) => handleChange('client', e.target.value)}
                    placeholder="Nom du client"
                    required
                    error={validationErrors.client}
                    icon={<User className="h-4 w-4" />}
                    name="client"
                  />

                  {isDp && (
                    <Select
                      label="Statut *"
                      value={form.statut}
                      onChange={(e) => handleChange('statut', e.target.value)}
                      options={statutOptions}
                      placeholder="Sélectionner un statut"
                      required
                      error={validationErrors.statut}
                    />
                  )}
                </div>
              </div>

              {isSunlibOrOtovo && (
                <div
                  id="form-uploads"
                  className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
                >
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-slate-600 dark:bg-slate-600 text-white">
                      <FileText className="h-3 w-3" weight="bold" />
                    </div>
                    Fichiers Sunlib / Otovo
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            Fichier pour DP
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Envoyer un fichier directement vers la section DP
                          </p>
                        </div>
                        {!form.client && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400">
                            Renseignez le client avant d&apos;uploader
                          </span>
                        )}
                      </div>
                      <FileUpload
                        clientName={form.client}
                        section="dp-en-cours"
                        inputId="file-upload-dp"
                        disabled={!form.client}
                        initialUploadedFiles={uploadedFilesBySection['dp-en-cours'] ?? []}
                        onUploadComplete={(files) => handleUploadedFiles('dp-en-cours', files)}
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            Fichier pour Consuel
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Envoyer un fichier directement vers la section Consuel
                          </p>
                        </div>
                        {!form.client && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400">
                            Renseignez le client avant d&apos;uploader
                          </span>
                        )}
                      </div>
                      <FileUpload
                        clientName={form.client}
                        section="consuel-en-cours"
                        inputId="file-upload-consuel"
                        disabled={!form.client}
                        initialUploadedFiles={uploadedFilesBySection['consuel-en-cours'] ?? []}
                        onUploadComplete={(files) => handleUploadedFiles('consuel-en-cours', files)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
            )}

            {isDp && (
              <div
                id="form-workflow"
                className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
              >
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-600 dark:bg-slate-600 text-white">
                    <Calendar className="h-3 w-3" weight="bold" />
                  </div>
                  Dates et financement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DatePicker
                    label="Date d'envoi"
                    value={form.dateEnvoi}
                    onChange={(value) => handleChange('dateEnvoi', value)}
                    icon={<Calendar className="h-4 w-4" />}
                    name="dateEnvoi"
                  />
                  <DatePicker
                    label="Date estimative"
                    value={form.dateEstimative}
                    onChange={(value) => handleChange('dateEstimative', value)}
                    helperText="Calculée automatiquement selon le statut"
                    icon={<Clock className="h-4 w-4" />}
                    name="dateEstimative"
                    disabled
                    readOnly
                  />
                  <Select
                    label="Financement"
                    value={form.financement}
                    onChange={(e) =>
                      handleChange('financement', e.target.value)
                    }
                    options={financementOptionsList}
                    placeholder="Sélectionner un financement"
                  />
                </div>
              </div>
            )}
            {isDp && (
              <div
                id="form-details"
                className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
              >
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-600 dark:bg-slate-600 text-white">
                    <Gear className="h-3 w-3" weight="bold" />
                  </div>
                  Détails du projet
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Numéro DP"
                    value={form.noDp}
                    onChange={(e) => handleChange('noDp', e.target.value)}
                    placeholder="Numéro de déclaration"
                    icon={<FileText className="h-4 w-4" />}
                    name="noDp"
                  />
                  <Input
                    label="Ville"
                    value={form.ville}
                    onChange={(e) => handleChange('ville', e.target.value)}
                    placeholder="Ville du projet"
                    icon={<MapPin className="h-4 w-4" />}
                    name="ville"
                  />
                  <Input
                    label="Portail"
                    value={form.portail}
                    onChange={(e) => handleChange('portail', e.target.value)}
                    placeholder="Nom du portail"
                    icon={<Globe className="h-4 w-4" />}
                    name="portail"
                  />
                  <Input
                    label="Identifiant"
                    value={form.identifiant}
                    onChange={(e) =>
                      handleChange('identifiant', e.target.value)
                    }
                    placeholder="Identifiant de connexion"
                    icon={<Shield className="h-4 w-4" />}
                    name="identifiant"
                  />
                  <Input
                    label="Mot de passe"
                    type="password"
                    value={form.motDePasse}
                    onChange={(e) => handleChange('motDePasse', e.target.value)}
                    placeholder="Mot de passe"
                    icon={<Key className="h-4 w-4" />}
                    name="motDePasse"
                  />
                </div>
              </div>
            )}


            {isInstallation && (
              <div
                id="form-installation"
                className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
              >
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-600 dark:bg-slate-600 text-white">
                    <House className="h-3 w-3" weight="bold" />
                  </div>
                  Détails Installation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select
                    label="Statut"
                    value={form.statut}
                    onChange={(e) => handleChange('statut', e.target.value)}
                    options={installationStatuts.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                    placeholder="Sélectionner un statut"
                  />
                  <Select
                    label="PV Chantier"
                    value={form.pvChantier}
                    onChange={(e) => handleChange('pvChantier', e.target.value)}
                    options={pvChantierStatusOptions.map((value) => ({
                      value,
                      label: value,
                    }))}
                    placeholder="Sélectionner un statut PV"
                  />
                  <DatePicker
                    label="Date de pose"
                    value={form.dateEstimative}
                    onChange={(value) => handleChange('dateEstimative', value)}
                    icon={<Calendar className="h-4 w-4" />}
                    name="dateEstimative"
                  />
                  <DatePicker
                    label="Date PV"
                    value={form.datePV}
                    onChange={(value) => handleChange('datePV', value)}
                    icon={<Calendar className="h-4 w-4" />}
                    name="datePV"
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Commentaires"
                      value={form.commentaires}
                      onChange={(e) =>
                        handleChange('commentaires', e.target.value)
                      }
                      placeholder="Ajouter des commentaires..."
                      icon={<FileText className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>
            )}

            {isConsuel && (
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-600 dark:bg-slate-600 text-white">
                    <Lightning className="h-3 w-3" weight="bold" />
                  </div>
                  Détails Consuel
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DatePicker
                    label="PV Chantier"
                    value={form.pvChantierDate}
                    onChange={(value) => handleChange('pvChantierDate', value)}
                    icon={<Calendar className="h-4 w-4" />}
                    name="pvChantierDate"
                  />
                  <Select
                    label="Statut"
                    value={form.statut}
                    onChange={(e) => handleChange('statut', e.target.value)}
                    options={consuelStatuts.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                    placeholder="Sélectionner un statut"
                  />
                  <Select
                    label="Type de consuel demandé"
                    value={form.typeConsuel}
                    onChange={(e) =>
                      handleChange('typeConsuel', e.target.value)
                    }
                    options={[
                      { value: 'Violet', label: 'Violet' },
                      { value: 'Bleu', label: 'Bleu' },
                    ]}
                    placeholder="Sélectionner un type"
                  />
                  <DatePicker
                    label="Date dernière démarche"
                    value={form.dateDerniereDemarche}
                    onChange={(value) =>
                      handleChange('dateDerniereDemarche', value)
                    }
                    icon={<Calendar className="h-4 w-4" />}
                    name="dateDerniereDemarche"
                  />
                  <DatePicker
                    label="Date Estimatives"
                    value={form.dateEstimative}
                    onChange={(value) => handleChange('dateEstimative', value)}
                    icon={<Clock className="h-4 w-4" />}
                    name="dateEstimative"
                    disabled
                    readOnly
                  />
                </div>
              </div>
            )}


            {(isConsuel || isRaccordement || isRaccordementMes) && !isDp && (
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-500" weight="bold" />
                  Commentaires
                </h3>
                <Input
                  label="Commentaires"
                  value={form.commentaires}
                  onChange={(e) => handleChange('commentaires', e.target.value)}
                  placeholder="Ajouter des commentaires..."
                  name="commentaires"
                />
              </div>
            )}

            {isRaccordement && (
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Buildings
                    className="h-3.5 w-3.5 text-slate-500"
                    weight="bold"
                  />
                  Raccordement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select
                    label="Statut"
                    value={form.statut}
                    onChange={(e) => handleChange('statut', e.target.value)}
                    options={raccordementStatuts.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                    placeholder="Sélectionner un statut"
                    error={validationErrors.statut}
                  />
                  <DatePicker
                    label="Date dernière démarche"
                    value={form.dateDerniereDemarche}
                    onChange={(value) =>
                      handleChange('dateDerniereDemarche', value)
                    }
                    icon={<Clock className="h-4 w-4" />}
                    name="dateDerniereDemarche"
                  />
                </div>
              </div>
            )}

            {isRaccordementMes && (
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <House className="h-3.5 w-3.5 text-slate-500" weight="bold" />
                  Mise en service
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Numéro de contrat"
                    value={form.numeroContrat}
                    onChange={(e) =>
                      handleChange('numeroContrat', e.target.value)
                    }
                    placeholder="Numéro de contrat"
                    icon={<FileText className="h-4 w-4" />}
                    name="numeroContrat"
                  />
                  <DatePicker
                    label="Date de Mise en service"
                    value={form.dateMiseEnService}
                    onChange={(value) =>
                      handleChange('dateMiseEnService', value)
                    }
                    icon={<Calendar className="h-4 w-4" />}
                    name="dateMiseEnService"
                  />
                </div>
              </div>
            )}

            {isDaact && (
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-600 dark:bg-slate-600 text-white">
                    <FileText className="h-3 w-3" weight="bold" />
                  </div>
                  DAACT
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <AutocompleteInput
                    label="Client"
                    value={form.client}
                    onChange={(e) => handleChange('client', e.target.value)}
                    placeholder="Nom du client"
                    required
                    icon={<User className="h-4 w-4" />}
                    name="client"
                    options={dpAccordesClients}
                    readOnlyAfterSelect={true}
                    onSelect={(selectedClient) => {
                      const clientData = dpAccordesData[selectedClient];
                      if (clientData) {
                        handleChange('noDp', clientData.noDp);
                        handleChange('ville', clientData.ville);
                      }
                    }}
                  />
                  <Input
                    label="Numéro DP"
                    value={form.noDp}
                    onChange={(e) => handleChange('noDp', e.target.value)}
                    placeholder="Numéro de déclaration"
                    icon={<FileText className="h-4 w-4" />}
                    name="noDp"
                    disabled
                    readOnly
                  />
                  <Input
                    label="Ville"
                    value={form.ville}
                    onChange={(e) => handleChange('ville', e.target.value)}
                    placeholder="Ville du projet"
                    icon={<MapPin className="h-4 w-4" />}
                    name="ville"
                    disabled
                    readOnly
                  />
                  <Select
                    label="Statut"
                    value={form.statut}
                    onChange={(e) => handleChange('statut', e.target.value)}
                    options={statutOptions}
                    placeholder="Sélectionner un statut"
                  />
                </div>
              </div>
            )}

            <div
              id="form-footer"
              className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700"
            >
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {form.statut === 'Accord favorable' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-[10px]">
                    → Déplacement vers "DP Accordés"
                  </span>
                )}
                {form.statut === 'Refus' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-[10px]">
                    → Déplacement vers "DP Refus"
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  icon={<X className="h-4 w-4" />}
                  className="px-4 py-2 text-sm"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  icon={
                    isSubmitting ? null : (
                      <FloppyDisk className="h-4 w-4" weight="bold" />
                    )
                  }
                  className="px-4 py-2 text-sm"
                >
                  {isSubmitting
                    ? 'Enregistrement...'
                    : client
                      ? 'Mettre à jour'
                      : 'Ajouter'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
