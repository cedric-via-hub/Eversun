'use client';

import { useMemo, useState, useEffect, useRef, lazy, Suspense } from 'react';
import ClientTableNew from '@/components/ClientTableNew';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import UndoToast from '@/components/ui/UndoToast';
import PageTransition from '@/components/ui/PageTransition';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ClientRecord, Section } from '@/types/client';

const ClientForm = lazy(() => import('@/components/ClientForm'));
import { toast, useToastStore } from '@/store/useToastStore';
import { useAppStore } from '@/store/useAppStore';
import { useUndoStore } from '@/store/useUndoStore';
import { useClientCounts } from '@/hooks/useClients';
import {
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Circle,
  Lightning,
  Flag,
  ArrowClockwise,
  MagnifyingGlass,
  Buildings,
  House,
  MapPin,
  Clock,
  CheckSquare,
  SunHorizon,
  DropHalf,
} from '@phosphor-icons/react';

interface ClientSectionProps {
  /** Section à afficher */
  section: Section;
}

export default function ClientSection({ section }: ClientSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const refreshTableRef = useRef<(() => void) | null>(null);
  const { setSectionCounts, addNotification } = useAppStore();
  const { pushUndoAction, undoLastAction } = useUndoStore();
  const { addToast } = useToastStore();
  
  // Use React Query for client counts
  const { data: sectionCountsData, isLoading: countsLoading, refetch: refetchCounts } = useClientCounts();
  
  // Map section counts for display
  const sectionCount = sectionCountsData?.[section] || 0;

  // Écouter l'événement forceRefresh pour rafraîchir quand l'utilisateur revient sur l'onglet
  useEffect(() => {
    const handleForceRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<{ section: string }>;
      if (customEvent.detail.section === section) {
        refetchCounts();
        // Recharger aussi les clients
        setLoading(true);
        // Pour sunlib et otovo, on récupère tous les clients car on filtre par financement
        const apiUrl = (section === 'sunlib' || section === 'otovo')
          ? '/api/clients?limit=1000'
          : `/api/clients?section=${section}&limit=100`;
        fetch(apiUrl)
          .then((res) => res.json())
          .then((response) => {
            const data = response.data || response;
            setClients(
              Array.isArray(data)
                ? data.map((item) => ({ ...item, id: item._id || item.id }))
                : []
            );
            setLoading(false);
          })
          .catch((err) => {
            console.error('Erreur de rechargement:', err);
            setLoading(false);
          });
      }
    };

    window.addEventListener('forceRefresh', handleForceRefresh);
    return () => window.removeEventListener('forceRefresh', handleForceRefresh);
  }, [section, refetchCounts]);

  // Créer une copie du client dans la section Consuel En Cours (depuis Installation)
  // La date PV est automatiquement copiée dans pvChantierDate
  const createConsuelCopy = async (record: ClientRecord) => {
    try {
      // Générer un clientId si le client n'en a pas (clients existants avant la mise à jour)
      const clientId = record.clientId || `CLI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const consuelRecord = {
        ...record,
        clientId,
        section: 'consuel-en-cours' as Section,
        statut: 'Demande à effectuer',
        // Copier automatiquement la date PV de Installation vers pvChantierDate dans Consuel
        pvChantierDate: record.datePV || record.pvChantierDate || '',
        pvChantier: 'Reçu',
      };
      // Retirer _id pour créer une nouvelle entrée
      const { _id, id, ...toSend } = consuelRecord;

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`${record.client} ajouté à Consuel En Cours (ID: ${result.clientId || clientId})`);
        refetchCounts();
      }
    } catch (error) {
      console.error('Erreur création Consuel:', error);
    }
  };

  // Créer une copie du client dans la section Raccordement (même clientId)
  const createRaccordementCopy = async (record: ClientRecord) => {
    try {
      // Générer un clientId si le client n'en a pas (clients existants avant la mise à jour)
      const clientId = record.clientId || `CLI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Vérifier si une copie existe déjà dans Raccordement
      const existingRes = await fetch(`/api/clients?section=raccordement&clientId=${encodeURIComponent(clientId)}`);
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        const existingClients = existingData.data || existingData;
        if (Array.isArray(existingClients) && existingClients.length > 0) {
          // Une copie existe déjà, ne pas créer de doublon
          return;
        }
      }

      const raccordementRecord = {
        ...record,
        clientId,
        section: 'raccordement' as Section,
        statut: 'Raccordement à faire',
      };
      // Retirer _id pour créer une nouvelle entrée
      const { _id, id, ...toSend } = raccordementRecord;

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`${record.client} ajouté à Raccordement (ID: ${result.clientId || clientId})`);
        refetchCounts();
      }
    } catch (error) {
      console.error('Erreur création Raccordement:', error);
    }
  };

  // Vérifier les dates estimatives pour DP En Cours et déclencher des notifications
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dpEnCoursClients = clients.filter(
      (c) => c.section === 'dp-en-cours' && c.dateEstimative
    );

    dpEnCoursClients.forEach((client) => {
      if (client.dateEstimative) {
        const estimatedDate = new Date(client.dateEstimative);
        estimatedDate.setHours(0, 0, 0, 0);

        const diffTime = estimatedDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Si la date estimative est demain (diffDays === 1)
        if (diffDays === 1) {
          const notificationMessage = `Accord tacite de ${client.client} - Date estimative: ${new Date(client.dateEstimative).toLocaleDateString('fr-FR')}`;
          addNotification(notificationMessage);
        }
      }
    });
  }, [clients, addNotification]);

  const sectionTitle = useMemo(() => {
    const titles: { [key in Section]: string } = {
      clients: 'Clients',
      'dp-en-cours': 'Déclaration Préalable – En cours',
      'dp-accordes': 'Déclaration Préalable – Accordés',
      'dp-refuses': 'Déclaration Préalable – Refus',
      daact: "Déclaration attestant l'achèvement et la conformité des travaux",
      installation: 'Installation – En cours',
      'consuel-en-cours': 'Consuel – En cours',
      'consuel-finalise': 'Consuel – Finalisé',
      raccordement: 'Raccordement',
      'raccordement-mes': 'Raccordement – Mise En Service',
      parameters: 'Centre de téléchargement',
      sunlib: 'Clients Sunlib',
      otovo: 'Clients Otovo',
    };
    return titles[section];
  }, [section]);

  const sectionIcon = useMemo(() => {
    const icons: { [key in Section]: React.ReactNode } = {
      clients: <Buildings className="h-6 w-6" weight="bold" />,
      'dp-en-cours': <FileText className="h-6 w-6" weight="bold" />,
      'dp-accordes': <CheckCircle className="h-6 w-6" weight="bold" />,
      'dp-refuses': <XCircle className="h-6 w-6" weight="bold" />,
      daact: <CheckSquare className="h-6 w-6" weight="bold" />,
      installation: <House className="h-6 w-6" weight="bold" />,
      'consuel-en-cours': <Circle className="h-6 w-6" weight="bold" />,
      'consuel-finalise': <CheckCircle className="h-6 w-6" weight="bold" />,
      raccordement: <Lightning className="h-6 w-6" weight="bold" />,
      'raccordement-mes': <Flag className="h-6 w-6" weight="bold" />,
      parameters: <FileText className="h-6 w-6" weight="bold" />,
      sunlib: <SunHorizon className="h-6 w-6" weight="bold" />,
      otovo: <DropHalf className="h-6 w-6" weight="bold" />,
    };
    return icons[section];
  }, [section]);

  const sectionColor = useMemo(() => {
    const colors: { [key in Section]: string } = {
      clients: 'from-teal-500 to-cyan-500',
      'dp-en-cours': 'from-teal-500 to-cyan-500',
      'dp-accordes': 'from-emerald-500 to-green-500',
      'dp-refuses': 'from-red-500 to-rose-500',
      daact: 'from-emerald-500 to-green-500',
      installation: 'from-sky-500 to-indigo-500',
      'consuel-en-cours': 'from-teal-500 to-cyan-500',
      'consuel-finalise': 'from-emerald-500 to-green-500',
      raccordement: 'from-teal-500 to-cyan-500',
      'raccordement-mes': 'from-emerald-500 to-green-500',
      parameters: 'from-slate-500 to-slate-600',
      sunlib: 'from-amber-500 to-orange-500',
      otovo: 'from-blue-500 to-indigo-500',
    };
    return colors[section];
  }, [section]);

  const sectionItems = useMemo(() => {
    let items: ClientRecord[];

    if (section === 'clients') {
      items = clients;
    } else if (section === 'sunlib') {
      items = clients.filter((clientItem) =>
        clientItem.financement?.toLowerCase() === 'sunlib'
      );
    } else if (section === 'otovo') {
      items = clients.filter((clientItem) =>
        clientItem.financement?.toLowerCase() === 'otovo'
      );
    } else {
      items = clients.filter((clientItem) => clientItem.section === section);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        Object.values(item).some(
          (value) =>
            value &&
            typeof value === 'string' &&
            value.toLowerCase().includes(query)
        )
      );
    }

    return items;
  }, [clients, section, searchQuery]);

  const totalDpEnCours = clients.filter(
    (c) => c.section === 'dp-en-cours'
  ).length;
  const totalDpAccordes = clients.filter(
    (c) => c.section === 'dp-accordes'
  ).length;
  const totalDpRefus = clients.filter((c) => c.section === 'dp-refuses').length;
  const totalConsuelEnCours = clients.filter(
    (c) => c.section === 'consuel-en-cours'
  ).length;
  const totalConsuelFinalise = clients.filter(
    (c) => c.section === 'consuel-finalise'
  ).length;
  const totalRaccordementEnCours = clients.filter(
    (c) => c.section === 'raccordement'
  ).length;
  const totalRaccordementFinalise = clients.filter(
    (c) => c.section === 'raccordement-mes'
  ).length;

  // Calculate status counts for the current section
  const getStatusCounts = () => {
    const counts: Record<string, number> = {};
    sectionItems.forEach((item) => {
      const key = item.statut || 'Non défini';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const onSave = async (record: ClientRecord) => {
    const toSave = { ...record };
    const oldSection = section;
    let newSection = record.section;

    if (
      section === 'dp-en-cours' &&
      (record.statut === 'Accord favorable' ||
        record.statut === 'Accord tacite')
    ) {
      toSave.section = 'dp-accordes';
      newSection = 'dp-accordes';
    }
    if (section === 'dp-en-cours' && record.statut === 'Refus') {
      toSave.section = 'dp-refuses';
      newSection = 'dp-refuses';
    }
    if (
      section === 'consuel-en-cours' &&
      record.statut === 'Consuel visé'
    ) {
      toSave.section = 'consuel-finalise';
      newSection = 'consuel-finalise';
    }
    if (section === 'installation' && record.pvChantier === 'Reçu') {
      toSave.section = 'consuel-en-cours';
      newSection = 'consuel-en-cours';
      // Copier automatiquement la date PV vers pvChantierDate pour Consuel
      if (record.datePV) {
        toSave.pvChantierDate = record.datePV;
      }
    }

    if (record._id) {
      // NOTE: Le client est déplacé automatiquement vers Consuel En Cours
      // quand pvChantier = 'Reçu' - la datePV est copiée dans pvChantierDate ci-dessus

      // Créer une copie dans Raccordement si Consuel Finalisé
      if (section === 'consuel-en-cours' && newSection === 'consuel-finalise') {
        await createRaccordementCopy(record);
      }

      // Le client conserve son ObjectId (_id) quand il change de section
      const previousClients = [...clients];
      const optimisticRecord = { ...toSave, _id: record._id };

      if (oldSection !== newSection) {
        setClients((prev) => prev.filter((item) => item._id !== record._id));
      } else {
        setClients((prev) =>
          prev.map((item) =>
            item._id === record._id ? optimisticRecord : item
          )
        );
      }

      const { id, ...toSend } = toSave;
      try {
        const res = await fetch(`/api/clients/${record._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toSend),
        });
        if (res.ok) {
          const saved = await res.json();
          if (oldSection !== newSection) {
            toast.success(
              `${record.client} a été déplacé vers ${newSection.replace('-', ' ').toUpperCase()}`
            );
            pushUndoAction({
              type: 'move',
              data: {
                client: saved,
                oldSection,
                newSection,
              },
              description: `Déplacement de ${record.client} vers ${newSection}`,
            });
            refetchCounts();
          } else {
            setClients((prev) =>
              prev.map((item) => (item._id === saved._id ? saved : item))
            );
            toast.success(`${record.client} a été mis à jour avec succès`);
            pushUndoAction({
              type: 'edit',
              data: {
                client: saved,
                previousState: record,
              },
              description: `Modification de ${record.client}`,
            });
            refetchCounts();
          }
        } else {
          setClients(previousClients);
          const error = await res.json();
          toast.error(
            `Impossible de mettre à jour ${record.client}: ${error.error || 'Erreur inconnue'}`
          );
        }
      } catch (error) {
        setClients(previousClients);
        console.error('Erreur lors de la mise à jour:', error);
        toast.error('Erreur de connexion au serveur');
      }

      return;
    }

    const previousClients = [...clients];
    const tempId = `temp-${Date.now()}`;
    const optimisticRecord = { ...toSave, _id: tempId };
    setClients((prev) => [...prev, optimisticRecord]);

    const { id, _id, ...toSend } = toSave;
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSend),
      });
      if (res.ok) {
        const saved = await res.json();
        setClients((prev) =>
          prev.map((item) => (item._id === tempId ? saved : item))
        );
        toast.success(`${saved.client} a été créé avec succès`);
        pushUndoAction({
          type: 'delete',
          data: {
            client: saved,
          },
          description: `Création de ${saved.client}`,
        });
        refetchCounts();
      } else {
        setClients(previousClients);
        const error = await res.json();
        toast.error(
          `Impossible de créer le dossier: ${error.error || 'Erreur inconnue'}`
        );
      }
    } catch (error) {
      setClients(previousClients);
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur de connexion au serveur');
    }
  };

  const onDelete = async (_id: string, clientName?: string) => {
    try {
      // Get the client data before deletion for undo
      const clientToDelete = clients.find(c => (c._id || c.id) === _id);
      
      const res = await fetch(`/api/clients/${_id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`${clientName || 'Client'} a été supprimé avec succès`, 3000);
        if (clientToDelete) {
          pushUndoAction({
            type: 'delete',
            data: {
              client: clientToDelete,
            },
            description: `Suppression de ${clientName || 'Client'}`,
          });
        }
        refetchCounts(); // Refresh section counts
        // Refresh the table data via the refetch function
        if (refreshTableRef.current) {
          refreshTableRef.current();
        }
      } else {
        const error = await res.json();
        toast.error(
          `Impossible de supprimer: ${error.error || 'Erreur inconnue'}`
        );
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur de connexion au serveur');
    }
  };

  const openAddForm = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const openEditForm = (client: ClientRecord) => {
    setEditingClient(client);
    setShowForm(true);
  };

  // Ajouter une fonction pour forcer le rechargement des données
  const forceRefresh = () => {
    // Appeler la fonction refetch de ClientTableNew si disponible
    if (refreshTableRef.current) {
      refreshTableRef.current();
    }
    // Rafraîchir aussi les compteurs
    refetchCounts();
  };

  const handleUndo = async () => {
    const action = undoLastAction();
    if (!action) return;

    try {
      switch (action.type) {
        case 'move':
          // Restore the client to the old section
          const { client, oldSection } = action.data;
          if (client._id && oldSection) {
            const { id, ...toSend } = { ...client, section: oldSection };
            await fetch(`/api/clients/${client._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(toSend),
            });
            toast.success(`Client restauré dans ${oldSection}`);
            refetchCounts();
            if (refreshTableRef.current) refreshTableRef.current();
          }
          break;
        case 'edit':
          // Restore the previous state
          const { client: editedClient, previousState } = action.data;
          if (editedClient._id && previousState) {
            const { id, ...toSend } = previousState;
            await fetch(`/api/clients/${editedClient._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(toSend),
            });
            toast.success('Modification annulée');
            if (refreshTableRef.current) refreshTableRef.current();
          }
          break;
        case 'delete':
          // Recreate the deleted client
          const { client: deletedClient } = action.data;
          const { _id, id, ...toSend } = deletedClient;
          const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toSend),
          });
          if (res.ok) {
            toast.success('Client restauré');
            refetchCounts();
            if (refreshTableRef.current) refreshTableRef.current();
          }
          break;
      }
    } catch (error) {
      console.error('Erreur lors de l\'undo:', error);
      toast.error('Impossible d\'annuler l\'action');
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-secondary gradient-mesh">
      <div className="fixed bottom-4 right-4 z-50">
        <UndoToast onUndo={handleUndo} />
      </div>
      <PageTransition>
        {/* Header de section moderne */}
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 md:p-4 mb-4 shadow-md">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-700 text-white transition-colors duration-200">
              {sectionIcon}
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                {sectionTitle}
              </h1>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-56">
              <MagnifyingGlass
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500"
                weight="bold"
              />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 h-9 text-sm shadow-none hover:shadow-none"
                aria-label="Rechercher un dossier"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={forceRefresh}
                variant="outline"
                loading={countsLoading}
                icon={<ArrowClockwise className="w-3 h-3" weight="bold" />}
                title="Rafraîchir"
                className="rounded-md px-3 py-1.5 text-xs"
              >
                Rafraîchir
              </Button>
              {section !== 'dp-accordes' &&
                section !== 'dp-refuses' &&
                section !== 'consuel-finalise' &&
                section !== 'raccordement-mes' && (
                  <Button
                    onClick={openAddForm}
                    icon={<Plus className="w-3 h-3" weight="bold" />}
                    variant="primary"
                    className="rounded-md px-3 py-1.5 text-xs btn-gradient hover-glow ripple"
                  >
                    Nouveau
                  </Button>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu - ClientTableNew gère son propre état */}
      <div className="bg-white dark:bg-slate-800 glass-card rounded-lg p-4 shadow-md hover-lift">
        <ClientTableNew
          section={section}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={openEditForm}
          onDelete={(client) => {
            const clientId = client._id || client.id;
            if (clientId) {
              setDeleteConfirm({ id: String(clientId), name: client.client || 'N/A' });
            }
          }}
          onRefresh={(fn) => { refreshTableRef.current = fn; }}
        />
      </div>

      {/* Modal du formulaire */}
      {showForm && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
            <LoadingSpinner size="lg" text="Chargement du formulaire..." />
          </div>
        }>
          <ClientForm
            section={section}
            client={editingClient}
            onSave={onSave}
            onClose={() => {
              setShowForm(false);
              setEditingClient(null);
            }}
          />
        </Suspense>
      )}

      {/* Dialog de confirmation de suppression */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Confirmer la suppression"
          message={`Êtes-vous sûr de vouloir supprimer le client "${deleteConfirm.name}" ? Cette action est irréversible.`}
          onConfirm={() => {
            onDelete(deleteConfirm.id, deleteConfirm.name);
            setDeleteConfirm(null);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
      </PageTransition>
    </div>
  );
}
