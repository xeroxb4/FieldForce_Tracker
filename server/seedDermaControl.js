/**
 * Upsert the 6 Derma Control SKUs only (safe for production).
 * Usage (from server folder):
 *   node seedDermaControl.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import NiveaSKU from './models/NiveaSKU.js';

dotenv.config();

const skus = [
  {
    name: 'Nivea Derma Control Natural Tone Female Roll-on',
    skuCode: 'NIV-RO-DCNT-F-50',
    category: 'Roll-on',
    size: '50ML',
    pricePc: 15.5,
    pricePack: 93,
    priceCarton: 465,
    unitsPerPack: 6,
    unitsPerCarton: 30,
  },
  {
    name: 'Nivea Derma Control Defend Female Roll-on',
    skuCode: 'NIV-RO-DCD-F-50',
    category: 'Roll-on',
    size: '50ML',
    pricePc: 15.5,
    pricePack: 93,
    priceCarton: 465,
    unitsPerPack: 6,
    unitsPerCarton: 30,
  },
  {
    name: 'Nivea Derma Control Cool Defend Men Roll-on',
    skuCode: 'NIV-RO-DCCD-M-50',
    category: 'Roll-on',
    size: '50ML',
    pricePc: 15.5,
    pricePack: 93,
    priceCarton: 465,
    unitsPerPack: 6,
    unitsPerCarton: 30,
  },
  {
    name: 'Nivea Derma Control Natural Tone Female Spray',
    skuCode: 'NIV-SP-DCNT-F-200',
    category: 'Spray',
    size: '200ML',
    pricePc: 45,
    pricePack: 270,
    priceCarton: 540,
    unitsPerPack: 6,
    unitsPerCarton: 12,
  },
  {
    name: 'Nivea Derma Control Defend Female Spray',
    skuCode: 'NIV-SP-DCD-F-200',
    category: 'Spray',
    size: '200ML',
    pricePc: 45,
    pricePack: 270,
    priceCarton: 540,
    unitsPerPack: 6,
    unitsPerCarton: 12,
  },
  {
    name: 'Nivea Derma Control Defend Men Spray',
    skuCode: 'NIV-SP-DCD-M-200',
    category: 'Spray',
    size: '200ML',
    pricePc: 45,
    pricePack: 270,
    priceCarton: 540,
    unitsPerPack: 6,
    unitsPerCarton: 12,
  },
];

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const sku of skus) {
    await NiveaSKU.findOneAndUpdate(
      { skuCode: sku.skuCode },
      { ...sku, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('OK', sku.category, sku.name);
  }

  console.log('Done. 6 Derma Control products upserted.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
