import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

dotenv.config();

const NAMES = [
  'Marilyn Etornam Amekudzi',
  'Basmah Ali',
  'Evelyn Okyere',
  'Richard Korli',
  'Samuel Aryeetey',
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const fullName of NAMES) {
    const u = await User.findOne({ fullName, role: 'omr' });
    if (!u) {
      // try partial
      const u2 = await User.findOne({
        role: 'omr',
        fullName: new RegExp(fullName.split(' ')[0], 'i'),
      });
      if (u2) {
        u2.distributor = 'Amata';
        await u2.save();
        console.log('Updated', u2.fullName, '→ Amata');
      } else {
        console.log('Not found:', fullName);
      }
      continue;
    }
    u.distributor = 'Amata';
    await u.save();
    console.log('Updated', fullName, '→ Amata');
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
