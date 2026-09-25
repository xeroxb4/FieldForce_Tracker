/**
 * Import Madina outlets only for Evelyn Okyere (29 shops)
 * Run: node importEvelynOutlets.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Outlet from './models/Outlet.js';

dotenv.config();

const DAY = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

// Madina only — 29 outlets
const ROWS = [
  { name: 'ADEBAYOR ENT MADINA', address: 'Madina', gps: '5.678373, -0.168731', beat: 'Monday' },
  { name: "AKU'S COSMETICS", address: 'Madina', gps: '5.679316, -0.169540', beat: 'Monday' },
  { name: 'AM REAL COSMETICS', address: 'Madina', gps: '5.677814, -0.168534', beat: 'Monday' },
  { name: 'AMERICAN COSMETICS', address: 'Madina', gps: '5.677819, -0.170422', beat: 'Monday' },
  { name: 'ANNOVEE', address: 'Madina', gps: '5.677765, -0.171437', beat: 'Monday' },
  { name: 'BEAUTY SOLUTION', address: 'Madina', gps: '5.678034, -0.169922', beat: 'Monday' },
  { name: 'BLESSING ENT', address: 'Madina', gps: '5.678693, -0.168734', beat: 'Monday' },
  { name: 'CRD COSMETICS', address: 'Madina', gps: '5.677758, -0.167632', beat: 'Tuesday' },
  { name: 'DAY BY DAY', address: 'Madina', gps: '5.679739, -0.171378', beat: 'Tuesday' },
  { name: 'EMMANUEL COSMETICS', address: 'Madina', gps: '5.678032, -0.169922', beat: 'Tuesday' },
  { name: 'EXCEL SHOP CLOSE TO DD', address: 'Madina', gps: '5.678807, -0.168081', beat: 'Tuesday' },
  { name: 'FATI ABU', address: 'Madina', gps: '5.680075, -0.171104', beat: 'Tuesday' },
  { name: 'FOXY COSMETICS', address: 'Madina', gps: '5.677834, -0.168181', beat: 'Tuesday' },
  { name: 'HILAS RADIANT', address: 'Madina', gps: '5.676076, -0.171323', beat: 'Tuesday' },
  { name: "J'S  BEAUTY PALACE", address: 'Madina', gps: '5.676106, -0.172257', beat: 'Tuesday' },
  { name: "LILLIAN LILY'S ENT", address: 'Madina', gps: '5.678020, -0.168719', beat: 'Wednesday' },
  { name: 'M & V COSMETICS', address: 'Madina', gps: '5.678424, -0.171090', beat: 'Wednesday' },
  { name: 'MASHALLAH ALLAH', address: 'Madina', gps: '5.680082, -0.170491', beat: 'Wednesday' },
  { name: 'MC SANDORS COSMETICS', address: 'Madina', gps: '5.678018, -0.168336', beat: 'Wednesday' },
  { name: 'MIMI COSMETICS', address: 'Madina', gps: '5.678413, -0.170249', beat: 'Thursday' },
  { name: 'MUTALEED ENT CLOSE TO GATE', address: 'Madina', gps: '5.678569, -0.169083', beat: 'Thursday' },
  { name: 'OPK COSMETICS', address: 'Madina', gps: '5.677398, -0.170442', beat: 'Thursday' },
  { name: 'OSEI KWAME SHOP', address: 'Madina', gps: '5.680324, -0.169232', beat: 'Thursday' },
  { name: 'QLYNN COSMETICS', address: 'Madina', gps: '5.678524, -0.171103', beat: 'Thursday' },
  { name: 'ROGERS SUPERMARKET', address: 'Madina', gps: '5.677763, -0.168525', beat: 'Friday' },
  { name: 'SELECT COSMETICS CLOSE TO RONIK PHARMACY', address: 'Madina', gps: '5.677918, -0.169851', beat: 'Friday' },
  { name: 'SHOP NO 33 MADINA MARKET', address: 'Madina', gps: '5.678570, -0.169081', beat: 'Friday' },
  { name: 'VALERIA EXCLUSIVE', address: 'Madina', gps: '5.678156, -0.170079', beat: 'Friday' },
  { name: 'YAPILE COSMETICS', address: 'Madina', gps: '5.675261, -0.170474', beat: 'Friday' },
];

function parseGps(s) {
  const parts = String(s).split(',').map((x) => x.trim());
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function beatDays(beat) {
  const n = DAY[String(beat || '').trim().toLowerCase()];
  return n ? [n] : [];
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const user = await User.findOne({
    $or: [{ fullName: /Evelyn\s*Okyere/i }, { username: /evelyn/i }],
    role: 'omr',
  });
  if (!user) {
    console.error('Evelyn Okyere (OMR) not found.');
    process.exit(1);
  }
  console.log('OMR:', user.fullName, user.username, user._id);

  let created = 0;
  let updated = 0;

  for (const row of ROWS) {
    const loc = parseGps(row.gps);
    const days = beatDays(row.beat);
    if (!loc) {
      console.warn('Skip (bad GPS):', row.name);
      continue;
    }

    const existing = await Outlet.findOne({
      name: new RegExp(`^${row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      $or: [{ assignedTo: user._id }, { userId: user._id }],
    });

    if (existing) {
      existing.location = loc;
      existing.locationVerified = true;
      existing.address = row.address;
      existing.territory = 'Madina';
      existing.distributor = user.distributor || existing.distributor || '';
      existing.status = 'approved';
      existing.isActive = true;
      existing.assignedTo = user._id;
      existing.userId = existing.userId || user._id;
      existing.assignedDays = days;
      await existing.save();
      console.log('Updated:', row.name, row.beat);
      updated++;
      continue;
    }

    await Outlet.create({
      name: row.name,
      displayName: row.name,
      contactName: '',
      contactPhone: '',
      address: row.address,
      territory: 'Madina',
      distributor: user.distributor || '',
      location: loc,
      locationVerified: true,
      status: 'approved',
      isActive: true,
      assignedTo: user._id,
      userId: user._id,
      createdBy: 'import-evelyn-madina',
      approvedBy: 'import-evelyn-madina',
      approvedAt: new Date(),
      assignedDays: days,
      channelType: 'Mini-wholesaler',
      monthlyCapacityBand: '4000_5999',
      monthlyCapacityMin: 4000,
      notes: `Evelyn Madina · ${row.beat}`,
    });
    console.log('Created:', row.name, row.beat);
    created++;
  }

  console.log('\nDone. Madina only — created:', created, 'updated:', updated);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
