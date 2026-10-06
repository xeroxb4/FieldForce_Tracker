/**
 * Reclassify all outlets from monthlyCapacityMin → Open Market channel types.
 * Usage: node migrateChannelTypes.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Outlet from './models/Outlet.js';

dotenv.config();

function classify(min) {
  const n = Number(min) || 0;
  if (n >= 12500) return { channelType: 'Open Market - Sub Wholesaler', band: '12500_plus' };
  if (n >= 10000) return { channelType: 'Open Market - Large Wholesaler', band: '10000_12499' };
  if (n >= 6000) return { channelType: 'Open Market - Medium-Large Wholesaler', band: '6000_9999' };
  if (n >= 4000) return { channelType: 'Open Market - Medium Wholesaler', band: '4000_5999' };
  return { channelType: 'Open Market - Small Wholesaler', band: 'under_3999' };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const outlets = await Outlet.find({});
  let updated = 0;
  const counts = {};

  for (const o of outlets) {
    let min = Number(o.monthlyCapacityMin) || 0;
    // Infer min from legacy band if min is 0 but band exists
    if (!min && o.monthlyCapacityBand) {
      const map = {
        under_2000: 0,
        '2000_3999': 2000,
        under_3999: 0,
        '4000_5999': 4000,
        '6000_9999': 6000,
        '10000_12499': 10000,
        '12500_plus': 12500,
        under_10000: 0,
        from_10000: 10000,
      };
      if (map[o.monthlyCapacityBand] != null) min = map[o.monthlyCapacityBand];
    }
    // Legacy channel only, no capacity → keep best guess
    if (!min && o.channelType === 'Sub-wholesaler') min = 10000;
    if (!min && o.channelType === 'Mini-wholesaler') min = 4000;

    const { channelType, band } = classify(min);
    const nextBand = o.monthlyCapacityBand || band;
    const changed =
      o.channelType !== channelType ||
      o.monthlyCapacityMin !== min ||
      (!o.monthlyCapacityBand && nextBand);

    if (changed) {
      o.channelType = channelType;
      o.monthlyCapacityMin = min;
      if (!o.monthlyCapacityBand) o.monthlyCapacityBand = nextBand;
      // markModified so pre-save runs displayName
      await o.save();
      updated += 1;
    }
    counts[channelType] = (counts[channelType] || 0) + 1;
  }

  console.log('Updated', updated, 'of', outlets.length);
  console.log('Counts by channel:', counts);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
