import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Outlet from './models/Outlet.js';

dotenv.config();

const NAME = process.argv[2] || 'AB Cosmetics';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const outlets = await Outlet.find({
    name: new RegExp('^' + NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
  });
  if (!outlets.length) {
    console.log('No outlet found matching:', NAME);
    process.exit(1);
  }
  for (const o of outlets) {
    // Mark pin as unverified; keep coords but force re-capture on next visit
    o.locationVerified = false;
    // Optional: clear to Accra placeholder so distance check forces update
    // o.location = { lat: 5.6037, lng: -0.187 };
    await o.save();
    console.log('Reset locationVerified for:', o.name, o._id.toString(), 'assignedTo', o.assignedTo);
  }
  console.log('Done. OMR should re-set GPS at the real shop on next Start visit.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
