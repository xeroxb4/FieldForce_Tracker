import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import NiveaSKU from './models/NiveaSKU.js';

dotenv.config();

// Real Nivea products with PC / Pack / Carton pricing (GHS)
const sampleSKUs = [
  // —— LOTIONS ——
  { name: 'Nivea Nourishing Cocoa Lotion', skuCode: 'NIV-LO-COCOA-400', category: 'Lotion', size: '400ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Perfect and Radiant Lotion', skuCode: 'NIV-LO-PR-400', category: 'Lotion', size: '400ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Rich Nourishing Lotion', skuCode: 'NIV-LO-RN-400', category: 'Lotion', size: '400ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Firming Q10 Lotion', skuCode: 'NIV-LO-Q10-400', category: 'Lotion', size: '400ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Radiant and Beauty (Advance Care)', skuCode: 'NIV-LO-RBAC-400', category: 'Lotion', size: '400ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Radiant and Beauty (Even Glow)', skuCode: 'NIV-LO-RBEG-400', category: 'Lotion', size: '400ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Shea Smooth Lotion', skuCode: 'NIV-LO-SHEA-400', category: 'Lotion', size: '400ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Deep Men Lotion', skuCode: 'NIV-LO-DEEP-400', category: 'Lotion', size: '400ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Maximum Hydration Lotion', skuCode: 'NIV-LO-MH-400', category: 'Lotion', size: '400ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Soft Moisturizing Cream', skuCode: 'NIV-LO-SOFT-200', category: 'Lotion', size: '200ML', pricePc: 43, pricePack: 258, priceCarton: 516, unitsPerPack: 6, unitsPerCarton: 12 },

  // —— ROLL-ONS 50ML ——
  { name: 'Nivea Dry Impact Roll-on', skuCode: 'NIV-RO-DI-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Dry Comfort Roll-on', skuCode: 'NIV-RO-DC-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Invisible Black and White Men Roll-on', skuCode: 'NIV-RO-BWM-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Invisible Black and White Women Roll-on', skuCode: 'NIV-RO-BWW-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Fresh Active Roll-on', skuCode: 'NIV-RO-FA-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Fresh Natural Roll-on', skuCode: 'NIV-RO-FN-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Fresh Energy Roll-on', skuCode: 'NIV-RO-FE-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Deep Dark Wood Roll-on', skuCode: 'NIV-RO-DDW-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Deep Espresso Roll-on', skuCode: 'NIV-RO-DE-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Cool Kick Roll-on', skuCode: 'NIV-RO-CK-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },
  { name: 'Nivea Fresh Pearl and Beauty Roll-on', skuCode: 'NIV-RO-FPB-50', category: 'Roll-on', size: '50ML', pricePc: 15.5, pricePack: 93, priceCarton: 465, unitsPerPack: 6, unitsPerCarton: 30 },

  // —— SPRAYS 200ML ——
  { name: 'Nivea Cool Kick Spray', skuCode: 'NIV-SP-CK-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Dry Impact Spray', skuCode: 'NIV-SP-DI-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Dry Comfort Spray', skuCode: 'NIV-SP-DC-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Black and White Men Spray', skuCode: 'NIV-SP-BWM-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Black and White Women Spray', skuCode: 'NIV-SP-BWW-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Deep Men Spray', skuCode: 'NIV-SP-DEEP-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Fresh Natural Spray', skuCode: 'NIV-SP-FN-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Fresh Energy Spray', skuCode: 'NIV-SP-FE-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Fresh Active Spray', skuCode: 'NIV-SP-FA-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
  { name: 'Nivea Pearl and Beauty Spray', skuCode: 'NIV-SP-PB-200', category: 'Spray', size: '200ML', pricePc: 45, pricePack: 270, priceCarton: 540, unitsPerPack: 6, unitsPerCarton: 12 },
];

const sampleUsers = [
  {
    username: 'admin',
    password: 'admin123',
    fullName: 'System Admin',
    role: 'admin',
    territory: '',
    distributor: '',
  },
  {
    username: 'marilyn',
    password: 'omr123',
    fullName: 'Marilyn Etornam Amekudzi',
    role: 'omr',
    territory: 'Makola',
    distributor: 'Amata',
  },
  {
    username: 'merch1',
    password: 'merch123',
    fullName: 'Kwame Mensah',
    role: 'merchandiser',
    territory: 'Accra Central',
    distributor: 'Amata',
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const u of sampleUsers) {
      const exists = await User.findOne({ username: u.username });
      if (!exists) {
        await User.create(u);
        console.log(`Created user: ${u.username} (${u.role})`);
      } else {
        console.log(`User already exists: ${u.username}`);
      }
    }

    // Refresh SKUs: remove old sample ones and insert current list
    await NiveaSKU.deleteMany({});
    for (const sku of sampleSKUs) {
      await NiveaSKU.create(sku);
      console.log(`Created SKU: ${sku.name}`);
    }

    console.log('\n✅ Seed completed successfully!');
    console.log(`   ${sampleSKUs.length} Nivea products loaded`);
    console.log('\nTest accounts:');
    console.log('  Admin        → username: admin    password: admin123');
    console.log('  OMR          → username: marilyn  password: omr123');
    console.log('  Merchandiser → username: merch1   password: merch123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
