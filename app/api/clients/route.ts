import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import mongoose from 'mongoose';
import { ClientSchema } from '@/lib/clientModel';
import { clientSchema } from '@/lib/validation';
import { clientCollectionName } from '@/lib/sectionConfig';
import { rateLimit } from '@/lib/rateLimit';

// Rate limiting: 100 requêtes par minute pour les endpoints clients
const clientsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

/**
 * Interface pour les données de client mappées
 */
interface MappedClient {
  [key: string]: unknown;
  client?: string;
  section?: string;
  statut?: string;
  dateEnvoi?: string;
  dateEstimative?: string;
  financement?: string;
  noDp?: string;
  ville?: string;
  portail?: string;
  identifiant?: string;
  motDePasse?: string;
  type?: string;
  pvChantier?: string;
  pvChantierDate?: string;
  datePV?: string;
  typeConsuel?: string;
  dateDerniereDemarche?: string;
  commentaires?: string;
  numeroContrat?: string;
  dateMiseEnService?: string;
}

/**
 * Fonction de mappage pour transformer les champs français en anglais
 * Utilisée pour les données importées depuis un fichier Excel/CSV
 */
function mapImportedFields(doc: MappedClient): MappedClient {
  const fieldMapping: Record<string, string> = {
    Client: 'client',
    Nom: 'client',
    nom: 'client',
    "Date d'envoi DP": 'dateEnvoi',
    'Attente DP': 'dateEstimative',
    Financement: 'financement',
    Status: 'statut',
    'Numéro DP': 'noDp',
    Ville: 'ville',
    'Site DP': 'portail',
    'Email utilisé': 'identifiant',
    'Mot de passe': 'motDePasse',
    'PV Chantier': 'pvChantierDate',
    'Date PV': 'datePV',
    'Type de consuel demandé': 'typeConsuel',
    'Date dernière démarche': 'dateDerniereDemarche',
    Commentaires: 'commentaires',
    'Date Estimatives': 'dateEstimative',
    'Numéro de contrat': 'numeroContrat',
    'Date de Mise en service raccordement': 'dateMiseEnService',
  };

  const mapped: MappedClient = { ...doc };

  // Mapper les champs français vers anglais
  for (const [frenchKey, englishKey] of Object.entries(fieldMapping)) {
    if (mapped[frenchKey] !== undefined) {
      mapped[englishKey] = mapped[frenchKey];
      delete mapped[frenchKey];
    }
  }

  // Convertir les dates du format français (DD/MM/YYYY) au format ISO
  const convertFrenchDateToISO = (
    dateStr: string | undefined
  ): string | undefined => {
    if (!dateStr) return undefined;
    // Si déjà au format ISO ou contient des tirets, retourner tel quel
    if (dateStr.includes('-') || dateStr.includes('T')) return dateStr;

    // Format français: DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  mapped.dateEnvoi = convertFrenchDateToISO(
    mapped.dateEnvoi as string | undefined
  );
  mapped.dateEstimative = convertFrenchDateToISO(
    mapped.dateEstimative as string | undefined
  );
  mapped.pvChantierDate = convertFrenchDateToISO(
    mapped.pvChantierDate as string | undefined
  );
  mapped.datePV = convertFrenchDateToISO(mapped.datePV as string | undefined);
  mapped.dateDerniereDemarche = convertFrenchDateToISO(
    mapped.dateDerniereDemarche as string | undefined
  );
  mapped.dateMiseEnService = convertFrenchDateToISO(
    mapped.dateMiseEnService as string | undefined
  );

  // Si pas de section, déterminer selon le statut
  if (!mapped.section) {
    if (mapped.statut === 'Accord favorable') {
      mapped.section = 'dp-accordes';
    } else if (mapped.statut === 'Refus') {
      mapped.section = 'dp-refuses';
    } else if (mapped.statut === 'ABF') {
      mapped.section = 'dp-en-cours';
    } else {
      mapped.section = 'dp-en-cours';
    }
  }

  return mapped;
}

export async function GET(request: Request) {
  // Appliquer le rate limiting
  const rateLimitResult = await clientsRateLimit(request as any);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MONGODB_URI not configured' },
        { status: 500 }
      );
    }
    await connectToDatabase();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100); // Max 100
    const section = url.searchParams.get('section');
    const search = url.searchParams.get('search') || '';
    const sortKey = url.searchParams.get('sortKey') || 'client';
    const sortDir = (url.searchParams.get('sortDir') || 'asc') as 'asc' | 'desc';
    const skip = (page - 1) * limit;
    
    // Build query
    const query: Record<string, unknown> = {};

    if (section) {
      // Pour sunlib et otovo, on filtre par financement plutôt que par section
      // Et on utilise un GROUP BY pour éviter les doublons (un même client dans plusieurs sections)
      if (section === 'sunlib') {
        query.financement = { $regex: '^Sunlib$', $options: 'i' };
      } else if (section === 'otovo') {
        query.financement = { $regex: '^Otovo$', $options: 'i' };
      } else {
        query.section = section;
      }
    }

    // Search query - text search on multiple fields
    if (search) {
      query.$or = [
        { client: { $regex: search, $options: 'i' } },
        { ville: { $regex: search, $options: 'i' } },
        { statut: { $regex: search, $options: 'i' } },
        { noDp: { $regex: search, $options: 'i' } },
        { commentaires: { $regex: search, $options: 'i' } },
      ];
    }

    // Additional filters
    const filterStatus = url.searchParams.get('filter_status');
    const filterVille = url.searchParams.get('filter_ville');
    const filterFinancement = url.searchParams.get('filter_financement');
    const filterDateFrom = url.searchParams.get('filter_dateFrom');
    const filterDateTo = url.searchParams.get('filter_dateTo');
    const clientId = url.searchParams.get('clientId');

    if (filterStatus) query.statut = { $regex: filterStatus, $options: 'i' };
    if (filterVille) query.ville = { $regex: filterVille, $options: 'i' };
    if (filterFinancement) query.financement = { $regex: filterFinancement, $options: 'i' };
    if (clientId) query.clientId = clientId;
    
    // Date range filter
    if (filterDateFrom || filterDateTo) {
      const dateQuery: Record<string, string> = {};
      if (filterDateFrom) dateQuery.$gte = filterDateFrom;
      if (filterDateTo) dateQuery.$lte = filterDateTo;
      query.dateEstimative = dateQuery;
    }

    try {
      const Model =
        mongoose.models[clientCollectionName] ||
        mongoose.model(
          clientCollectionName,
          ClientSchema,
          clientCollectionName
        );

      let allClients: any[];
      let totalCount: number;

      // Pour sunlib et otovo, utiliser une agrégation pour éviter les doublons par clientId
      if (section === 'sunlib' || section === 'otovo') {
        const aggregation = await Model.aggregate([
          { $match: query },
          {
            $group: {
              _id: { client: '$client', financement: '$financement' },
              doc: { $first: '$$ROOT' }
            }
          },
          {
            $replaceRoot: { newRoot: '$doc' }
          },
          { $sort: { [sortKey]: sortDir === 'asc' ? 1 : -1 } },
          { $skip: skip },
          { $limit: limit }
        ]);

        // Pour le total, on compte les clientId distincts
        const countAggregation = await Model.aggregate([
          { $match: query },
          {
            $group: {
              _id: { client: '$client', financement: '$financement' }
            }
          },
          { $count: 'total' }
        ]);

        totalCount = countAggregation[0]?.total || 0;
        allClients = aggregation.map((doc) => mapImportedFields(doc as MappedClient));
      } else {
        totalCount = await Model.countDocuments(query);

        // Build sort object
        const sortObj: Record<string, 1 | -1> = {};
        sortObj[sortKey] = sortDir === 'asc' ? 1 : -1;

        // Inclure le mot de passe pour les sections DP sauf DP Accordés et DP Refus
        let queryBuilder = Model.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit);

        if (
          section &&
          section.startsWith('dp') &&
          section !== 'dp-accordes' &&
          section !== 'dp-refuses'
        ) {
          queryBuilder = queryBuilder.select('+motDePasse');
        }

        const docs = await queryBuilder.lean();
        allClients = docs.map((doc) => mapImportedFields(doc as MappedClient));
      }

      return NextResponse.json({
        clients: allClients,
        total: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      });
    } catch (err: any) {
      console.error('MongoDB Error in GET /api/clients:', err);
      console.error('Error stack:', err.stack);
      return NextResponse.json(
        {
          error: `Erreur MongoDB lors de la récupération des clients`,
          details: err.message,
          stack: err.stack,
          name: err.name,
          mongodb_uri: process.env.MONGODB_URI ? 'defined' : 'undefined',
          section: section || 'none',
          query: JSON.stringify(query),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('General Error in GET /api/clients:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: error.message || 'Erreur serveur',
        stack: error.stack,
        name: error.name,
        mongodb_uri: process.env.MONGODB_URI ? 'defined' : 'undefined',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Appliquer le rate limiting
  const rateLimitResult = await clientsRateLimit(request as any);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MONGODB_URI not configured' },
        { status: 500 }
      );
    }
    await connectToDatabase();
    const data = await request.json();

    const parseResult = clientSchema.safeParse(data);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation échouée', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    if (!data.section) {
      return NextResponse.json({ error: 'Section inconnue' }, { status: 400 });
    }

    try {
      const Model =
        mongoose.models[clientCollectionName] ||
        mongoose.model(
          clientCollectionName,
          ClientSchema,
          clientCollectionName
        );

      const stageDate =
        data.dateEnvoi ||
        data.dateDerniereDemarche ||
        data.dateMiseEnService ||
        data.datePV ||
        data.pvChantierDate ||
        '';

      // Générer un clientId unique si non fourni
      const clientId = data.clientId || `CLI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const createPayload = {
        ...data,
        clientId,
        stages: {
          [data.section]: {
            statut: data.statut || '',
            date: stageDate,
            updatedAt: new Date(),
          },
        },
      };

      const client = await Model.create(createPayload);

      // Si le client est dans dp-accordes avec statut Accord tacite ou Accord favorable,
      // créer une copie dans installation
      if (
        data.section === 'dp-accordes' &&
        (data.statut === 'Accord tacite' || data.statut === 'Accord favorable')
      ) {
        try {
          const installationPayload = {
            ...data,
            section: 'installation',
            dateEstimative: '', // Vider la date de pose lors du passage en Installation
            stages: {
              ...createPayload.stages,
              installation: {
                statut: 'En cours',
                date: new Date().toISOString(),
                updatedAt: new Date(),
              },
            },
          };
          await Model.create(installationPayload);
        } catch (installError: unknown) {
          // Ne pas bloquer la création principale si la copie échoue
          console.error(
            'Erreur lors de la copie vers installation:',
            installError
          );
        }
      }

      return NextResponse.json(client);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur inconnue';
      return NextResponse.json(
        {
          error: `Erreur MongoDB lors de la création`,
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
