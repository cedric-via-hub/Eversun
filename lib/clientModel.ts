import mongoose from 'mongoose';
import { Section } from '@/types/client';
import { encrypt, decrypt } from './encryption';
import logger from '@/lib/logger';

export const ClientSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.Mixed, required: false },
  /** Identifiant unique persistant du client à travers toutes les sections */
  clientId: { type: String, required: true, index: true, trim: true },
  section: {
    type: String,
    required: true,
    enum: [
      'clients',
      'dp-en-cours',
      'dp-accordes',
      'dp-refuses',
      'daact',
      'installation',
      'consuel-en-cours',
      'consuel-finalise',
      'raccordement',
      'raccordement-mes',
    ],
  },
  client: { type: String, required: true },
  statut: String,
  dateEnvoi: String,
  dateEstimative: String,
  financement: String,
  noDp: String,
  ville: String,
  portail: String,
  identifiant: String,
  motDePasse: { type: String, select: false }, // Masqué par défaut dans les requêtes
  type: String,
  pvChantier: String,
  pvChantierDate: String,
  datePV: String,
  typeConsuel: String,
  dateDerniereDemarche: String,
  commentaires: String,
  numeroContrat: String,
  dateMiseEnService: String,
  stages: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Hook pre-save pour chiffrer le motDePasse avant sauvegarde
ClientSchema.pre('save', async function (next) {
  if (this.motDePasse && this.isModified('motDePasse')) {
    try {
      this.motDePasse = encrypt(this.motDePasse);
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Hook post-find pour déchiffrer le motDePasse après récupération
ClientSchema.post('find', function (docs: any[]) {
  if (Array.isArray(docs)) {
    docs.forEach((doc) => {
      if (doc.motDePasse) {
        try {
          doc.motDePasse = decrypt(doc.motDePasse);
        } catch (error) {
          logger.error(
            { error },
            'Erreur lors du déchiffrement du mot de passe'
          );
        }
      }
    });
  }
});

ClientSchema.post('findOne', function (doc: any) {
  if (doc && doc.motDePasse) {
    try {
      doc.motDePasse = decrypt(doc.motDePasse);
    } catch (error) {
      logger.error({ error }, 'Erreur lors du déchiffrement du mot de passe');
    }
  }
});

export interface IClient extends mongoose.Document {
  section: Section;
  client: string;
  clientId?: string;
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

export const ClientModel =
  mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
