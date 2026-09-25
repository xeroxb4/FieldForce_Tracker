/**
 * Set PC price 55.6 for: Firming Q10, Deep Men, Maximum Hydration, Shea Smooth
 * Pack = 333.6 (×6), Carton = 667.2 (×12)
 * Run: node updateLotionPrices.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import NiveaSKU from './models/NiveaSKU.js';

dotenv.config();

const MATCHES = [
  /Firming\s*Q10/i,
  /Deep\s*Men/i,
  /Maximum\s*Hydration/i,
  /Shea\s*Smooth/i,
];

const pricePc = 55.6;
const pricePack = 333.6;
const priceCarton = 667.2;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  for (const rx of MATCHES) {
    const res = await NiveaSKU.updateMany(
      { name: rx },
      { $set: { pricePc, pricePack, priceCarton } }
    );
    const docs = await NiveaSKU.find({ name: rx }).select('name pricePc pricePack priceCarton');
    console.log(String(rx), 'modified', res.modifiedCount, docs);
  }

  console.log('\nDone. Refresh the app (OMRs may need to reload products).');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
