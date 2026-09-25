/**
 * Restore TRAINING Shop Alpha for trainer OMR
 * Run: node restoreTrainingAlpha.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Outlet from './models/Outlet.js';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ username: 'trainer' });
  if (!user) {
    console.error('trainer user not found. Run seedTrainingUser.js first.');
    process.exit(1);
  }

  const name = 'TRAINING Shop Alpha';
  let outlet = await Outlet.findOne({
    name,
    $or: [{ assignedTo: user._id }, { userId: user._id }],
  });

  if (outlet) {
    outlet.isActive = true;
    outlet.status = 'approved';
    outlet.assignedDays = outlet.assignedDays?.length ? outlet.assignedDays : [1];
    outlet.assignedTo = user._id;
    outlet.userId = user._id;
    await outlet.save();
    console.log('Restored existing:', name, outlet._id);
  } else {
    outlet = await Outlet.create({
      name,
      displayName: name,
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
      createdBy: 'restore-training',
      approvedBy: 'restore-training',
      approvedAt: new Date(),
      assignedDays: [1], // Monday
    });
    console.log('Created:', name, outlet._id);
  }

  console.log('Assigned to trainer · Monday beat. Refresh app.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
