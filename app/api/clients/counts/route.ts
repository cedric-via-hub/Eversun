import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import mongoose from 'mongoose';
import { ClientSchema } from '@/lib/clientModel';

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MONGODB_URI not configured' },
        { status: 500 }
      );
    }
    await connectToDatabase();

    const collections = [
      { section: 'clients', name: 'clients' },
      { section: 'dp-en-cours', name: 'dp_in_progress' },
      { section: 'dp-accordes', name: 'dp_received' },
      { section: 'dp-refuses', name: 'dp_ko' },
      { section: 'daact', name: 'daact' },
      { section: 'consuel-en-cours', name: 'consuel_in_progress' },
      { section: 'consuel-finalise', name: 'consuel_finalised' },
      { section: 'raccordement', name: 'raccordement' },
      { section: 'raccordement-mes', name: 'raccordement_finalised' },
    ];

    const counts: Record<string, number> = {};

    for (const col of collections) {
      try {
        const Model =
          mongoose.models[col.name] ||
          mongoose.model(col.name, ClientSchema, col.name);
        const count = await Model.countDocuments().maxTimeMS(30000);
        counts[col.section] = count;
      } catch (err: any) {
        console.error(`Error counting ${col.name}:`, err);
        counts[col.section] = 0;
      }
    }

    return NextResponse.json({ counts });
  } catch (error: any) {
    console.error('Error fetching section counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch section counts', details: error.message },
      { status: 500 }
    );
  }
}
