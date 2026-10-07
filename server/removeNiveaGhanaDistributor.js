/**
 * Remove "Nivea Ghana" as a distributor label in MongoDB.
 * Sets distributor to "" on users/outlets/visits that still have it.
 *
 *   node removeNiveaGhanaDistributor.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Visit from './models/Visit.js';
import Outlet from './models/Outlet.js';

dotenv.config();

const RE = /^nivea\s*ghana$/i;

async function clearField(Model, field, label) {
  const docs = await Model.find({ [field]: { $regex: RE } });
  let n = 0;
  for (const d of docs) {
    d[field] = '';
    await d.save();
    n += 1;
  }
  console.log(`${label}: cleared ${n}`);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Removing Nivea Ghana distributor tags…');
  await clearField(User, 'distributor', 'Users');
  await clearField(Outlet, 'distributor', 'Outlets');
  try {
    await clearField(Visit, 'distributor', 'Visits');
  } catch (e) {
    console.log('Visits:', e.message);
  }
  console.log('Done. Refresh Admin → Distributors.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
