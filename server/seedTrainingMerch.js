/**
 * Training merchandiser account (isolated from live reports).
 * Run: node seedTrainingMerch.js
 *
 * Login: trainerm / Train@FF2026  (role: Merchandiser)
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Outlet from './models/Outlet.js';

dotenv.config();

const TRAINING = {
  username: 'trainerm',
  password: 'Train@FF2026', // plain — User pre-save hashes once
  fullName: 'Training Demo Merchandiser',
  role: 'merchandiser',
  territory: 'Training Zone',
  distributor: 'TRAINING (not live)',
};

// Mon–Sat style sample outlets for merch beats
const SAMPLE_OUTLETS = [
  { name: 'TRAINING Merch Store 1', day: 1 },
  { name: 'TRAINING Merch Store 2', day: 2 },
  { name: 'TRAINING Merch Store 3', day: 3 },
  { name: 'TRAINING Merch Store 4', day: 6 }, // Saturday
];

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  let user = await User.findOne({ username: TRAINING.username });
  if (!user) {
    user = await User.create({
      ...TRAINING,
      isActive: true,
      isTraining: true,
    });
    console.log('Created:', TRAINING.username);
  } else {
    user.password = TRAINING.password;
    user.fullName = TRAINING.fullName;
    user.role = 'merchandiser';
    user.territory = TRAINING.territory;
    user.distributor = TRAINING.distributor;
    user.isActive = true;
    user.isTraining = true;
    await user.save();
    console.log('Updated:', TRAINING.username);
  }

  for (const s of SAMPLE_OUTLETS) {
    const existing = await Outlet.findOne({ name: s.name, assignedTo: user._id });
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
      createdBy: 'seed-training-merch',
      approvedBy: 'seed-training-merch',
      approvedAt: new Date(),
      assignedDays: [s.day],
    });
    console.log('Created outlet:', s.name);
  }

  console.log('\n========== TRAINING MERCHANDISER ==========');
  console.log('URL:      https://field-force-tracker.vercel.app');
  console.log('Role:     Merchandiser');
  console.log('Username: trainerm');
  console.log('Password: Train@FF2026');
  console.log('==========================================\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
