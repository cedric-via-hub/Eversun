import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import mongoose from 'mongoose';
import { ClientSchema } from '@/lib/clientModel';

const sectionToCollection = {
  'dp-en-cours': 'dp_in_progress',
  'dp-accordes': 'dp_received',
  'dp-refuses': 'dp_ko',
  'daact': 'daact',
  'consuel-en-cours': 'consuel_in_progress',
  'consuel-finalise': 'consuel_finalised',
  raccordement: 'raccordement',
  'raccordement-mes': 'raccordement_finalised',
};

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    const { section, client, statut, noDp, ville, dateEnvoi, dateDerniereDemarche, dateMiseEnService } = data;

    if (!client) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    // Use the clients collection
    const Model = mongoose.models.clients || mongoose.model('clients', ClientSchema, 'clients');

    // Find or create the client record
    let clientRecord = await Model.findOne({ client });

    if (!clientRecord) {
      clientRecord = new Model({
        section: 'clients',
        client,
        ville: ville || '',
        noDp: noDp || '',
      });
    }

    // Update the specific stage data
    const stageKey = section;
    const dateField = dateEnvoi || dateDerniereDemarche || dateMiseEnService;

    if (stageKey) {
      // Store stage information in the client record as object
      if (!clientRecord.stages) {
        clientRecord.stages = {};
      }
      (clientRecord.stages as any)[stageKey] = {
        statut: statut || '',
        date: dateField || '',
        updatedAt: new Date(),
      };
    }

    // Update ville and noDp if provided
    if (ville) clientRecord.ville = ville;
    if (noDp) clientRecord.noDp = noDp;

    await clientRecord.save();

    return NextResponse.json({ success: true, data: clientRecord });
  } catch (error: any) {
    console.error('Error syncing client data:', error);
    return NextResponse.json(
      { error: 'Failed to sync client data', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const clientName = searchParams.get('client');
    const syncAll = searchParams.get('syncAll') === 'true';

    const Model = mongoose.models.clients || mongoose.model('clients', ClientSchema, 'clients');

    if (syncAll) {
      // Sync all clients from all sections to the clients collection
      const collections = [
        { section: 'dp-en-cours', name: 'dp_in_progress' },
        { section: 'dp-accordes', name: 'dp_received' },
        { section: 'dp-refuses', name: 'dp_ko' },
        { section: 'daact', name: 'daact' },
        { section: 'consuel-en-cours', name: 'consuel_in_progress' },
        { section: 'consuel-finalise', name: 'consuel_finalised' },
        { section: 'raccordement', name: 'raccordement' },
        { section: 'raccordement-mes', name: 'raccordement_finalised' },
      ];

      for (const col of collections) {
        try {
          const SectionModel = mongoose.models[col.name] || mongoose.model(col.name, ClientSchema, col.name);
          const records = await SectionModel.find();

          for (const record of records) {
            if (!record.client) continue;

            let clientRecord = await Model.findOne({ client: record.client });

            if (!clientRecord) {
              clientRecord = new Model({
                section: 'clients',
                client: record.client,
                ville: record.ville || '',
                noDp: record.noDp || '',
                stages: {},
              });
            }

            // Update stage information
            if (!clientRecord.stages) {
              clientRecord.stages = {};
            }

            const dateField = record.dateEnvoi || record.dateDerniereDemarche || record.dateMiseEnService;

            (clientRecord.stages as any)[col.section] = {
              statut: record.statut || '',
              date: dateField || '',
              updatedAt: new Date(),
            };

            // Update ville and noDp if not set
            if (!clientRecord.ville && record.ville) clientRecord.ville = record.ville;
            if (!clientRecord.noDp && record.noDp) clientRecord.noDp = record.noDp;

            await clientRecord.save();
          }
        } catch (err: any) {
          console.error(`Error syncing ${col.name}:`, err);
        }
      }

      const clientRecords = await Model.find().sort({ client: 1 }).maxTimeMS(30000);
      return NextResponse.json({ data: clientRecords, synced: true });
    }

    if (clientName) {
      const clientRecord = await Model.findOne({ client: clientName });
      return NextResponse.json({ data: clientRecord });
    }

    const clientRecords = await Model.find().sort({ client: 1 }).maxTimeMS(30000);
    return NextResponse.json({ data: clientRecords });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients', details: error.message },
      { status: 500 }
    );
  }
}
