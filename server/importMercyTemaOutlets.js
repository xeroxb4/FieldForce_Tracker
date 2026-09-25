/**
 * Import Mercy Tsorhe (mercy10) Tema outlets — Tuesday beat
 * Run: node importMercyTemaOutlets.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Outlet from './models/Outlet.js';

dotenv.config();

// day: 1=Mon … 5=Fri — Tuesday = 2
const TUESDAY = 2;

const ROWS = [
  { name: 'Thess cosmetics', address: 'Tema', gps: '5.645614, -0.000539', type: 'Cosmetics Shop', contact: '', phone: '0246213211' },
  { name: 'Lawcomm Cosmetics', address: 'Tema', gps: '5.646571, -0.001165', type: 'Cosmetics Shop', contact: 'Manager', phone: '0243544743' },
  { name: 'TNT', address: 'Tema', gps: '5.646840, -0.001477', type: 'Semi-Wholesaler', contact: 'Manager', phone: '0209130361' },
  { name: 'Eve Beauty cosmetics', address: 'Tema', gps: '5.647222, -0.001336', type: 'Cosmetics Shop', contact: 'Manager', phone: '0544911474' },
  { name: 'Zak Ventura', address: 'Tema', gps: '5.645302, -0.001603', type: 'Cosmetics Shop', contact: '', phone: '0542780525' },
  { name: 'Rita cosmetics', address: 'Tema', gps: '5.646489, -0.000653', type: 'Cosmetics Shop', contact: 'Manager', phone: '' },
  { name: 'Sima', address: 'Tema', gps: '5.644973, 0.001311', type: 'Cosmetics Shop', contact: 'Manager', phone: '0244563825' },
  { name: 'Kafui cosmetics', address: 'Tema', gps: '5.646527, 0.000238', type: 'Cosmetics Shop', contact: 'Manager', phone: '0245935198' },
  { name: 'Eunice cosmetics', address: 'Tema', gps: '5.646294, 0.000067', type: 'Cosmetics Shop', contact: 'Manager', phone: '0244453691' },
  { name: "Rocky's cosmetics", address: 'Tema', gps: '5.645960, 0.000286', type: 'Cosmetics Shop', contact: 'Manager', phone: '0243969919' },
  { name: 'Falis Essential', address: 'Tema', gps: '5.645858, 0.000417', type: 'Cosmetics Shop', contact: 'Manager', phone: '0544155610' },
  { name: 'Kurpat Ent', address: 'Tema', gps: '5.646129, -0.000657', type: 'Cosmetics Shop', contact: '', phone: '0244227361' },
  { name: 'Tawee Ent', address: 'Tema', gps: '5.644973, 0.001311', type: 'Cosmetics Shop', contact: 'Manager', phone: '0245876063' },
  { name: 'Sugar beauty shop', address: 'Tema', gps: '5.645631, -0.000708', type: 'Cosmetics Shop', contact: 'Manager', phone: '0541260426' },
  { name: 'Royal Kwatma cosmetics', address: 'Tema', gps: '5.645416, -0.000423', type: 'Cosmetics Shop', contact: 'Manager', phone: '0552473669' },
  { name: 'Mrs. Gaisie cosmetics', address: 'Tema', gps: '5.645225, -0.000575', type: 'Cosmetics Shop', contact: 'Manager', phone: '0248853792' },
  { name: 'Alpha light cosmetics', address: 'Tema', gps: '5.645225, -0.000575', type: 'Cosmetics Shop', contact: 'Manager', phone: '0246394790' },
  { name: 'Lydee cosmetics', address: 'Tema', gps: '5.645163, -0.000528', type: 'Cosmetics Shop', contact: 'Manager', phone: '0244123400' },
];

function parseGps(s) {
  const parts = String(s).split(',').map((x) => x.trim());
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function mapChannel(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('semi') || t.includes('sub') || t.includes('whole')) {
    return {
      channelType: 'Sub-wholesaler',
      monthlyCapacityBand: '10000_12499',
      monthlyCapacityMin: 10000,
    };
  }
  // Cosmetics shop in open market → Mini until capacity is updated in app
  return {
    channelType: 'Mini-wholesaler',
    monthlyCapacityBand: '4000_5999',
    monthlyCapacityMin: 4000,
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const user = await User.findOne({
    $or: [{ username: 'mercy10' }, { username: 'Mercy10' }, { fullName: /Mercy\s*Tsorhe/i }],
  });
  if (!user) {
    console.error('User mercy10 / Mercy Tsorhe not found. Create the OMR account first.');
    process.exit(1);
  }
  console.log('OMR:', user.fullName, user.username, user._id);

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const row of ROWS) {
    const loc = parseGps(row.gps);
    if (!loc) {
      console.warn('Bad GPS, skip:', row.name);
      continue;
    }
    const ch = mapChannel(row.type);
    const phone = String(row.phone || '').replace(/\s+/g, '');

    const existing = await Outlet.findOne({
      name: new RegExp(`^${row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      $or: [{ assignedTo: user._id }, { userId: user._id }],
    });

    if (existing) {
      existing.location = loc;
      existing.locationVerified = true;
      existing.address = row.address || existing.address || 'Tema';
      existing.territory = 'Tema';
      existing.contactName = row.contact || existing.contactName || '';
      if (phone) existing.contactPhone = phone;
      existing.status = 'approved';
      existing.isActive = true;
      existing.assignedTo = user._id;
      existing.userId = existing.userId || user._id;
      existing.assignedDays = [TUESDAY];
      existing.channelType = ch.channelType;
      existing.monthlyCapacityBand = ch.monthlyCapacityBand;
      existing.monthlyCapacityMin = ch.monthlyCapacityMin;
      existing.distributor = user.distributor || existing.distributor || '';
      await existing.save();
      console.log('Updated:', row.name);
      updated++;
      continue;
    }

    await Outlet.create({
      name: row.name,
      displayName: row.name,
      contactName: row.contact || '',
      contactPhone: phone,
      address: row.address || 'Tema',
      territory: 'Tema',
      distributor: user.distributor || '',
      location: loc,
      locationVerified: true,
      status: 'approved',
      isActive: true,
      assignedTo: user._id,
      userId: user._id,
      createdBy: 'import-mercy-tema',
      approvedBy: 'import-mercy-tema',
      approvedAt: new Date(),
      assignedDays: [TUESDAY],
      channelType: ch.channelType,
      monthlyCapacityBand: ch.monthlyCapacityBand,
      monthlyCapacityMin: ch.monthlyCapacityMin,
      notes: `Outlet type (sheet): ${row.type}`,
    });
    console.log('Created:', row.name);
    created++;
  }

  console.log('\nDone. created=', created, 'updated=', updated, 'skipped=', skipped);
  console.log('Login as mercy10 → Beats → Tuesday should list these shops with GPS.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
