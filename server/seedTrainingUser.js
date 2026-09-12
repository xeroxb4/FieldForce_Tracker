/**
 * Create a TRAINING OMR account (and sample outlets) so demos don't touch live data.
 * Run: node seedTrainingUser.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Outlet from './models/Outlet.js';

dotenv.config();

const TRAINING = {
  username: 'trainer',
  password: 'Train@FF2026',
  fullName: 'Training Demo OMR',
  role: 'omr',
  territory: 'Training Zone',
  distributor: 'TRAINING (not live)',
};

const SAMPLE_OUTLETS = [
  { name: 'TRAINING Shop Alpha', day: 1 },
  { name: 'TRAINING Shop Beta', day: 1 },
  { name: 'TRAINING Shop Gamma', day: 2 },
  { name: 'TRAINING AVC Demo - AVC (Silver)', day: 3, avc: true, tier: 'Silver' },
];

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  let user = await User.findOne({ username: TRAINING.username });
  const hash = await bcrypt.hash(TRAINING.password, 10);

  if (!user) {
    user = await User.create({
      ...TRAINING,
      password: hash,
      isActive: true,
    });
    console.log('Created user:', TRAINING.username);
  } else {
    user.password = hash;
    user.fullName = TRAINING.fullName;
    user.role = 'omr';
    user.territory = TRAINING.territory;
    user.distributor = TRAINING.distributor;
    user.isActive = true;
    await user.save();
    console.log('Updated user:', TRAINING.username);
  }

  for (const s of SAMPLE_OUTLETS) {
    const existing = await Outlet.findOne({
      name: s.name,
      assignedTo: user._id,
    });
    if (existing) {
      console.log('Outlet exists:', s.name);
      continue;
    }
    await Outlet.create({
      name: s.name,
      displayName: s.name,
      contactName: 'Training Contact',
      contactPhone: '0000000000',
      address: 'Training Zone',
      territory: 'Training Zone',
      distributor: 'TRAINING (not live)',
      location: { lat: 5.6037, lng: -0.187 },
      locationVerified: false,
      status: 'approved',
      isActive: true,
      assignedTo: user._id,
      userId: user._id,
      createdBy: 'seed-training',
      approvedBy: 'seed-training',
      approvedAt: new Date(),
      assignedDays: [s.day],
      avcEnrolled: !!s.avc,
      avcTier: s.tier || '',
    });
    console.log('Created outlet:', s.name, 'day', s.day);
  }

  console.log('\n========== TRAINING LOGIN ==========');
  console.log('URL:      https://field-force-tracker.vercel.app');
  console.log('Role:     OMR');
  console.log('Username: trainer');
  console.log('Password: Train@FF2026');
  console.log('Note:     Distributor = TRAINING (not live)');
  console.log('          Use only TRAINING Shop* outlets');
  console.log('====================================\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
