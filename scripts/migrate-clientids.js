#!/usr/bin/env node

/**
 * Script de migration des clientIds
 * Usage: node scripts/migrate-clientids.js
 * 
 * Ce script assigne un clientId unique à tous les clients qui n'en ont pas.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ Erreur: MONGODB_URI non définit dans .env.local');
  process.exit(1);
}

// Définir le schéma
const clientSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.Mixed, required: false },
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
  motDePasse: { type: String, select: false },
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
}, { timestamps: true });

async function migrateClientIds() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    const Model = mongoose.model('clients', clientSchema);

    // Trouver tous les clients sans clientId
    console.log('\n🔍 Recherche des clients sans clientId...');
    const clientsWithoutId = await Model.find({
      $or: [
        { clientId: { $exists: false } },
        { clientId: '' },
        { clientId: null },
      ],
    });

    console.log(`📊 Trouvés: ${clientsWithoutId.length} clients sans clientId`);

    if (clientsWithoutId.length === 0) {
      console.log('✅ Tous les clients ont déjà un clientId!');
      await mongoose.connection.close();
      process.exit(0);
    }

    const updates = [];
    const errors = [];

    console.log('\n⚙️  Migration en cours...');
    for (const client of clientsWithoutId) {
      try {
        // Générer un clientId unique
        const generatedClientId = `EV-00${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)
          .toUpperCase()}`;

        // Mettre à jour le client
        await Model.findByIdAndUpdate(
          client._id,
          { clientId: generatedClientId },
          { new: true }
        );

        updates.push({
          _id: client._id.toString(),
          client: client.client,
          section: client.section,
          clientId: generatedClientId,
        });

        console.log(
          `  ✓ ${client.client} (${client.section}): ${generatedClientId}`
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erreur inconnue';
        errors.push({
          _id: client._id.toString(),
          client: client.client,
          error: errorMessage,
        });
        console.log(
          `  ✗ ${client.client} (${client.section}): ${errorMessage}`
        );
      }
    }

    console.log('\n📈 Résumé de la migration:');
    console.log(`  ✅ Mises à jour réussies: ${updates.length}`);
    console.log(`  ❌ Erreurs: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Erreurs détaillées:');
      errors.forEach((error) => {
        console.log(`  - ${error.client}: ${error.error}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Migration terminée!');
    process.exit(0);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('❌ Erreur:', errorMessage);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrateClientIds();
