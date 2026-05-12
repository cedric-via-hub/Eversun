import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import mongoose from 'mongoose';
import { ClientSchema } from '@/lib/clientModel';
import { clientCollectionName } from '@/lib/sectionConfig';

/**
 * Migrer les anciens clients sans clientId en leur en attribuant un
 * POST /api/clients/migrate
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const Model =
      mongoose.models[clientCollectionName] ||
      mongoose.model(clientCollectionName, ClientSchema, clientCollectionName);

    // Trouver tous les clients sans clientId ou avec clientId vide
    const clientsWithoutId = await Model.find({
      $or: [{ clientId: { $exists: false } }, { clientId: '' }, { clientId: null }],
    });

    console.log(`Found ${clientsWithoutId.length} clients without clientId`);

    const updates = [];
    const errors = [];

    for (const client of clientsWithoutId) {
      try {
        // Générer un clientId unique pour ce client
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
          _id: client._id,
          client: client.client,
          section: client.section,
          clientId: generatedClientId,
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erreur inconnue';
        errors.push({
          _id: client._id,
          client: client.client,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complétée: ${updates.length} clients mis à jour`,
      updated: updates,
      errors: errors,
      totalProcessed: clientsWithoutId.length,
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('Erreur lors de la migration:', errorMessage);
    return NextResponse.json(
      {
        error: 'Erreur lors de la migration des clientIds',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Vérifier le statut de la migration (combien de clients n'ont pas de clientId)
 * GET /api/clients/migrate
 */
export async function GET() {
  try {
    await connectToDatabase();

    const Model =
      mongoose.models[clientCollectionName] ||
      mongoose.model(clientCollectionName, ClientSchema, clientCollectionName);

    const totalClients = await Model.countDocuments();
    const clientsWithoutId = await Model.countDocuments({
      $or: [{ clientId: { $exists: false } }, { clientId: '' }, { clientId: null }],
    });

    return NextResponse.json({
      totalClients,
      clientsWithoutId,
      clientsWithId: totalClients - clientsWithoutId,
      migrationNeeded: clientsWithoutId > 0,
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json(
      {
        error: 'Erreur lors de la vérification du statut',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
