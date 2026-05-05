import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import mongoose from 'mongoose';
import { ClientSchema } from '@/lib/clientModel';
import { clientCollectionName } from '@/lib/sectionConfig';
import { rateLimit } from '@/lib/rateLimit';

// Rate limiting: 50 requêtes par minute pour les opérations sur un client spécifique
const clientRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,
});

interface StageData {
  statut?: string;
  date?: string;
  updatedAt?: Date;
}

interface ExistingDocument {
  section?: string;
  statut?: string;
  client?: string;
  _id?: unknown;
  stages?: Record<string, StageData>;
  toObject?: () => Record<string, unknown>;
}

function buildStageUpdate(
  data: Record<string, unknown>,
  existing: ExistingDocument
) {
  const section = (data.section as string) || existing.section;
  const stageDate =
    (data.dateEnvoi as string) ||
    (data.dateDerniereDemarche as string) ||
    (data.dateMiseEnService as string) ||
    (data.datePV as string) ||
    (data.pvChantierDate as string) ||
    '';

  return {
    ...(existing.stages || {}),
    [section as string]: {
      statut: (data.statut as string) || existing.statut || '',
      date: stageDate,
      updatedAt: new Date(),
    },
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Appliquer le rate limiting
  const rateLimitResult = await clientRateLimit(request as any);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const data = await request.json();

    const Model =
      mongoose.models[clientCollectionName] ||
      mongoose.model(clientCollectionName, ClientSchema, clientCollectionName);

    const existing = await Model.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const payload = { ...data };
    const currentSection =
      (data.section as string) || (existing as ExistingDocument).section;
    const currentStatut =
      (data.statut as string) || (existing as ExistingDocument).statut || '';
    const currentPvChantier =
      (data.pvChantier as string) ||
      ((existing as any).pvChantier as string) ||
      '';
    const currentRaccordement =
      (data.raccordement as string) ||
      ((existing as any).raccordement as string) ||
      '';

    const normalizedStatut = currentStatut.trim();
    const isDpAccordTransition =
      (existing.section === 'dp-en-cours' || payload.section === 'dp-accordes') &&
      (normalizedStatut === 'Accord favorable' ||
        normalizedStatut === 'Accord tacite');
    const isDpRefusTransition =
      (existing.section === 'dp-en-cours' || payload.section === 'dp-refuses') &&
      normalizedStatut === 'Refus';

    if (isDpAccordTransition) {
      payload.section = 'dp-accordes';
    } else if (isDpRefusTransition) {
      payload.section = 'dp-refuses';
    }

    if (currentSection === 'installation' && currentPvChantier === 'Reçu') {
      payload.section = 'daact';
      payload.statut = payload.statut || 'DAACT à faire';
    }

    if (
      currentSection === 'consuel-en-cours' &&
      currentStatut.trim().toLowerCase() === 'consuel visé'
    ) {
      payload.section = 'consuel-finalise';
    }

    if (
      currentSection === 'raccordement' &&
      currentRaccordement === 'Mise en service'
    ) {
      payload.section = 'raccordement-mes';
    }

    const updatedStages = buildStageUpdate(payload, existing as ExistingDocument);
    const updated = await Model.findByIdAndUpdate(
      id,
      { ...payload, stages: updatedStages },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Si le client est dans dp-accordes avec statut Accord tacite ou Accord favorable,
    // créer une copie dans installation
    const newSection = payload.section || (existing as ExistingDocument).section;
    const newStatut = payload.statut || (existing as ExistingDocument).statut;
    const newPvChantier =
      (payload.pvChantier as string) ||
      (updated as any).pvChantier ||
      (existing as any).pvChantier;
    const clientId =
      data.clientId ||
      (updated as any).clientId ||
      (existing as any).clientId;

    if (
      newSection === 'dp-accordes' &&
      (newStatut === 'Accord tacite' || newStatut === 'Accord favorable')
    ) {
      try {
        const installationQuery: Record<string, unknown> = {
          section: 'installation',
        };
        if (clientId) {
          installationQuery.clientId = clientId;
        } else {
          installationQuery.client = (existing as ExistingDocument).client;
        }

        const existingInInstallation = await Model.findOne(installationQuery).lean();

        if (!existingInInstallation) {
          const installationPayload = {
            ...updated.toObject(),
            _id: undefined,
            section: 'installation',
            dateEstimative: '', // Vider la date de pose lors du passage en Installation
            stages: {
              ...updated.stages,
              installation: {
                statut: 'En cours',
                date: new Date().toISOString(),
                updatedAt: new Date(),
              },
            },
          };
          await Model.create(installationPayload);
        }
      } catch (installError: unknown) {
        // Ne pas bloquer la copie vers installation si elle échoue
        console.error(
          'Erreur lors de la copie vers installation:',
          installError
        );
      }
    }

    if (existing.section === 'installation' && currentPvChantier === 'Reçu') {
      try {
        const consuelQuery: Record<string, unknown> = {
          section: 'consuel-en-cours',
        };
        if (clientId) {
          consuelQuery.clientId = clientId;
        } else {
          consuelQuery.client = (existing as ExistingDocument).client;
        }

        const existingInConsuel = await Model.findOne(consuelQuery).lean();
        if (!existingInConsuel) {
          const consuelPayload = {
            ...updated.toObject(),
            _id: undefined,
            section: 'consuel-en-cours',
            stages: {
              ...updated.stages,
              'consuel-en-cours': {
                statut: updated.statut || 'En cours',
                date: new Date().toISOString(),
                updatedAt: new Date(),
              },
            },
          };
          await Model.create(consuelPayload);
        }
      } catch (copyError: unknown) {
        console.error('Erreur lors de la copie vers Consuel En Cours:', copyError);
      }
    }

    if (
      newSection === 'consuel-en-cours' &&
      newPvChantier === 'Reçu'
    ) {
      try {
        const query: Record<string, unknown> = { section: 'daact' };
        if (clientId) {
          query.clientId = clientId;
        } else {
          query.client = (existing as ExistingDocument).client;
        }

        const existingInDaact = await Model.findOne(query).lean();
        if (!existingInDaact) {
          const daactPayload = {
            ...updated.toObject(),
            _id: undefined,
            section: 'daact',
            statut: 'DAACT à faire',
            stages: {
              ...updated.stages,
              daact: {
                statut: 'DAACT à faire',
                date: new Date().toISOString(),
                updatedAt: new Date(),
              },
            },
          };
          await Model.create(daactPayload);
        }
      } catch (copyError: unknown) {
        console.error('Erreur lors de la copie vers DAACT:', copyError);
      }
    }

    if (
      updated.section === 'consuel-finalise' &&
      (((data.statut as string)?.trim().toLowerCase() === 'consuel visé') ||
        (updated.statut as string)?.trim().toLowerCase() === 'consuel visé')
    ) {
      try {
        const query: Record<string, unknown> = {
          section: 'raccordement',
          $or: [],
        };
        if (clientId) {
          query.$or = [
            { clientId },
            { client: (existing as ExistingDocument).client },
          ];
        } else {
          query.$or = [{ client: (existing as ExistingDocument).client }];
        }

        const existingInRaccordement = await Model.findOne(query).lean();
        if (!existingInRaccordement) {
          const raccordementPayload = {
            ...updated.toObject(),
            _id: undefined,
            section: 'raccordement',
            statut: 'Raccordement à faire',
            raccordement: 'Demande transmise',
            stages: {
              ...updated.stages,
              raccordement: {
                statut: 'Raccordement à faire',
                date: new Date().toISOString(),
                updatedAt: new Date(),
              },
            },
          };
          await Model.create(raccordementPayload);
        }
      } catch (copyError: unknown) {
        console.error('Erreur lors de la copie vers raccordement:', copyError);
      }
    }

    // Nettoyer les doublons dans toutes les sections
    try {
      const sections = [
        'dp-en-cours',
        'dp-accordes',
        'dp-refuses',
        'installation',
        'daact',
        'consuel-en-cours',
        'consuel-finalise',
        'raccordement',
        'raccordement-mes',
      ];

      for (const section of sections) {
        // Trouver tous les documents dans cette section
        const docs = await Model.find({ section }).sort({ updatedAt: -1 });

        // Grouper par clientId ou client
        const grouped: Record<string, any[]> = {};
        docs.forEach((doc) => {
          const key = doc.clientId || doc.client;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(doc);
        });

        // Pour chaque groupe, garder seulement le plus récent, supprimer les autres
        for (const key in grouped) {
          const group = grouped[key];
          if (group.length > 1) {
            const toDelete = group.slice(1).map((d) => d._id);
            await Model.deleteMany({ _id: { $in: toDelete } });
          }
        }
      }
    } catch (cleanupError: unknown) {
      console.error('Erreur lors du nettoyage des doublons:', cleanupError);
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Appliquer le rate limiting
  const rateLimitResult = await clientRateLimit(request as any);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const data = await request.json();

    const Model =
      mongoose.models[clientCollectionName] ||
      mongoose.model(clientCollectionName, ClientSchema, clientCollectionName);

    const existing = await Model.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const payload = { ...data };
    const currentSection =
      (data.section as string) || (existing as ExistingDocument).section;
    const currentStatut =
      (data.statut as string) || (existing as ExistingDocument).statut || '';
    const currentPvChantier =
      (data.pvChantier as string) ||
      ((existing as any).pvChantier as string) ||
      '';
    const currentRaccordement =
      (data.raccordement as string) ||
      ((existing as any).raccordement as string) ||
      '';

    const normalizedStatut = currentStatut.trim();
    const isDpAccordTransition =
      (existing.section === 'dp-en-cours' || payload.section === 'dp-accordes') &&
      (normalizedStatut === 'Accord favorable' ||
        normalizedStatut === 'Accord tacite');
    const isDpRefusTransition =
      (existing.section === 'dp-en-cours' || payload.section === 'dp-refuses') &&
      normalizedStatut === 'Refus';

    // DP EN COURS transitions
    if (isDpAccordTransition) {
      payload.section = 'dp-accordes';
    } else if (isDpRefusTransition) {
      payload.section = 'dp-refuses';
    }

    // INSTALLATION transitions
    if (currentSection === 'installation' && currentPvChantier === 'Reçu') {
      payload.section = 'daact';
      payload.statut = payload.statut || 'DAACT à faire';
    }

    // CONSUEL EN COURS transitions
    if (
      currentSection === 'consuel-en-cours' &&
      currentStatut.trim().toLowerCase() === 'consuel visé'
    ) {
      payload.section = 'consuel-finalise';
    }

    // RACCORDEMENT transitions
    if (
      currentSection === 'raccordement' &&
      currentRaccordement === 'Mise en service'
    ) {
      payload.section = 'raccordement-mes';
    }

    const updatedStages = buildStageUpdate(payload, existing as ExistingDocument);
    const updated = await Model.findByIdAndUpdate(
      id,
      { ...payload, stages: updatedStages },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Si le client est dans dp-accordes avec statut Accord tacite ou Accord favorable,
    // créer une copie dans installation
    const newSection = payload.section || (existing as ExistingDocument).section;
    const newStatut = payload.statut || (existing as ExistingDocument).statut;
    const clientId =
      data.clientId ||
      (updated as any).clientId ||
      (existing as any).clientId;

    if (
      newSection === 'dp-accordes' &&
      (newStatut === 'Accord tacite' || newStatut === 'Accord favorable')
    ) {
      try {
        const installationQuery: Record<string, unknown> = {
          section: 'installation',
        };
        if (clientId) {
          installationQuery.clientId = clientId;
        } else {
          installationQuery.client = (existing as ExistingDocument).client;
        }

        const existingInInstallation = await Model.findOne(installationQuery).lean();

        if (!existingInInstallation) {
          const installationPayload = {
            ...updated.toObject(),
            _id: undefined,
            section: 'installation',
            dateEstimative: '', // Vider la date de pose lors du passage en Installation
            stages: {
              ...updated.stages,
              installation: {
                statut: 'En cours',
                date: new Date().toISOString(),
                updatedAt: new Date(),
              },
            },
          };
          await Model.create(installationPayload);
        }
      } catch (installError: unknown) {
        // Ne pas bloquer la mise à jour principale si la copie échoue
        console.error(
          'Erreur lors de la copie vers installation:',
          installError
        );
      }
    }

    if (
      existing.section === 'installation' &&
      currentPvChantier === 'Reçu'
    ) {
      try {
        const consuelQuery: Record<string, unknown> = {
          section: 'consuel-en-cours',
        };
        if (clientId) {
          consuelQuery.clientId = clientId;
        } else {
          consuelQuery.client = (existing as ExistingDocument).client;
        }

        const existingInConsuel = await Model.findOne(consuelQuery).lean();
        if (!existingInConsuel) {
          const consuelPayload = {
            ...updated.toObject(),
            _id: undefined,
            section: 'consuel-en-cours',
            stages: {
              ...updated.stages,
              'consuel-en-cours': {
                statut: updated.statut || 'En cours',
                date: new Date().toISOString(),
                updatedAt: new Date(),
              },
            },
          };
          await Model.create(consuelPayload);
        }
      } catch (copyError: unknown) {
        console.error('Erreur lors de la copie vers Consuel En Cours:', copyError);
      }
    }

    if (
      updated.section === 'consuel-finalise' &&
      (((data.statut as string)?.trim().toLowerCase() === 'consuel visé') ||
        (updated.statut as string)?.trim().toLowerCase() === 'consuel visé')
    ) {
      try {
        const query: Record<string, unknown> = {
          section: 'raccordement',
          $or: [],
        };
        if (clientId) {
          query.$or = [
            { clientId },
            { client: (existing as ExistingDocument).client },
          ];
        } else {
          query.$or = [{ client: (existing as ExistingDocument).client }];
        }

        const existingInRaccordement = await Model.findOne(query).lean();
        if (!existingInRaccordement) {
          const raccordementPayload = {
            ...updated.toObject(),
            _id: undefined,
            section: 'raccordement',
            statut: 'Raccordement à faire',
            raccordement: 'Demande transmise',
            stages: {
              ...updated.stages,
              raccordement: {
                statut: 'Raccordement à faire',
                date: new Date().toISOString(),
                updatedAt: new Date(),
              },
            },
          };
          await Model.create(raccordementPayload);
        }
      } catch (copyError: unknown) {
        console.error('Erreur lors de la copie vers raccordement:', copyError);
      }
    }

    // Nettoyer les doublons dans toutes les sections
    try {
      const sections = [
        'dp-en-cours',
        'dp-accordes',
        'dp-refuses',
        'installation',
        'daact',
        'consuel-en-cours',
        'consuel-finalise',
        'raccordement',
        'raccordement-mes',
      ];

      for (const section of sections) {
        // Trouver tous les documents dans cette section
        const docs = await Model.find({ section }).sort({ updatedAt: -1 });

        // Grouper par clientId ou client
        const grouped: Record<string, any[]> = {};
        docs.forEach((doc) => {
          const key = doc.clientId || doc.client;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(doc);
        });

        // Pour chaque groupe, garder seulement le plus récent, supprimer les autres
        for (const key in grouped) {
          const group = grouped[key];
          if (group.length > 1) {
            const toDelete = group.slice(1).map((d) => d._id);
            await Model.deleteMany({ _id: { $in: toDelete } });
          }
        }
      }
    } catch (cleanupError: unknown) {
      console.error('Erreur lors du nettoyage des doublons:', cleanupError);
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Appliquer le rate limiting
  const rateLimitResult = await clientRateLimit(request as any);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    await connectToDatabase();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Erreur de connexion à la base de données';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  const { id } = await params;

  const Model =
    mongoose.models[clientCollectionName] ||
    mongoose.model(clientCollectionName, ClientSchema, clientCollectionName);

  try {
    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erreur lors de la suppression';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
