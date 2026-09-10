/**
 * Rename distributor label in MongoDB:
 *   "Nivea Ghana"  →  "Imperial"
 *
 * Usage (from server folder, with .env MONGODB_URI):
 *   node renameDistributor.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Visit from './models/Visit.js';
import Outlet from './models/Outlet.js';
import WrapUp from './models/WrapUp.js';
import MerchVisit from './models/MerchVisit.js';

dotenv.config();

const FROM = process.argv[2] || 'Nivea Ghana';
const TO = process.argv[3] || 'Imperial';

async function rename(Model, field, label) {
  const res = await Model.updateMany(
    { [field]: FROM },
    { $set: { [field]: TO } }
  );
  console.log(`${label}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Renaming distributor "${FROM}" → "${TO}"`);

  await rename(User, 'distributor', 'Users');
  await rename(Visit, 'distributor', 'Visits');
  await rename(Outlet, 'distributor', 'Outlets');
  try {
    await rename(WrapUp, 'distributor', 'WrapUps');
  } catch (e) {
    console.log('WrapUps skip:', e.message);
  }
  try {
    await rename(MerchVisit, 'distributor', 'MerchVisits');
  } catch (e) {
    console.log('MerchVisits skip:', e.message);
  }

  // Case-insensitive cleanup for close variants
  const users = await User.find({
    distributor: new RegExp(`^${FROM.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  });
  for (const u of users) {
    if (u.distributor !== TO) {
      u.distributor = TO;
      await u.save();
      console.log('User fixed:', u.username, u.fullName);
    }
  }

  console.log('Done. Refresh admin Sales / Users / Outlets filters.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
