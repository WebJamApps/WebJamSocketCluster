// One-time migration for the tour -> gig rename: rename the MongoDB collection
// `tours` -> `gigs` so the new `Gig` model (bound to the `gigs` collection)
// reads the existing data. Idempotent and safe to run more than once.
//
// Run against the target DB (set MONGO_DB_URI), e.g. after a build:
//   MONGO_DB_URI=... node build/src/scripts/migrate-tours-to-gigs.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function migrate(): Promise<void> {
  const uri = process.env.MONGO_DB_URI || '';
  if (!uri) throw new Error('MONGO_DB_URI is not set');
  await mongoose.connect(uri, { autoIndex: false });
  const { db } = mongoose.connection;
  if (!db) throw new Error('no database connection');
  const names = (await db.listCollections().toArray()).map((c) => c.name);
  const hasTours = names.includes('tours');
  const hasGigs = names.includes('gigs');
  if (hasGigs && !hasTours) {
    console.log('Already migrated: `gigs` exists and there is no `tours` collection. Nothing to do.');
  } else if (!hasTours) {
    console.log('No `tours` collection found; nothing to migrate.');
  } else if (hasTours && hasGigs) {
    throw new Error('Both `tours` and `gigs` collections exist — refusing to auto-merge. Resolve manually.');
  } else {
    await db.renameCollection('tours', 'gigs');
    console.log('Renamed collection `tours` -> `gigs`.');
  }
  await mongoose.disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
