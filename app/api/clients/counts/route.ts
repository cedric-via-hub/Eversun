import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import mongoose from 'mongoose';
import { ClientSchema } from '@/lib/clientModel';
import { clientCollectionName } from '@/lib/sectionConfig';

export const revalidate = 10; // Cache 10 secondes
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MONGODB_URI not configured' },
        { status: 500 }
      );
    }
    await connectToDatabase();

    const Model =
      mongoose.models[clientCollectionName] ||
      mongoose.model(clientCollectionName, ClientSchema, clientCollectionName);

    const aggregation = await Model.aggregate([
      {
        $group: {
          _id: '$section',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts: Record<string, number> = {
      'clients': 0,
      'dp-en-cours': 0,
      'dp-accordes': 0,
      'dp-refuses': 0,
      'daact': 0,
      'installation': 0,
      'consuel-en-cours': 0,
      'consuel-finalise': 0,
      'raccordement': 0,
      'raccordement-mes': 0,
      'parameters': 0,
      'sunlib': 0,
      'otovo': 0,
    };

    aggregation.forEach((group: any) => {
      counts[group._id || 'unknown'] = group.count;
    });

    // Ajouter les comptes pour Sunlib et Otovo (filtrage par financement)
    // On compte les clients distincts par nom et financement pour éviter les doublons
    const sunlibAggregation = await Model.aggregate([
      { $match: { financement: { $regex: '^Sunlib$', $options: 'i' } } },
      { $group: { _id: { client: '$client', financement: '$financement' } } },
      { $count: 'total' }
    ]);
    const otovoAggregation = await Model.aggregate([
      { $match: { financement: { $regex: '^Otovo$', $options: 'i' } } },
      { $group: { _id: { client: '$client', financement: '$financement' } } },
      { $count: 'total' }
    ]);

    counts['sunlib'] = sunlibAggregation[0]?.total || 0;
    counts['otovo'] = otovoAggregation[0]?.total || 0;

    return NextResponse.json({ counts });
  } catch (error: any) {
    console.error('Error fetching section counts:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Failed to fetch section counts',
        details: error.message,
        stack: error.stack,
        name: error.name,
        mongodb_uri: process.env.MONGODB_URI ? 'defined' : 'undefined',
      },
      { status: 500 }
    );
  }
}
