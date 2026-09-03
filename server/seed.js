import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import NiveaSKU from './models/NiveaSKU.js';

dotenv.config();

const sampleSKUs = [
  // Roll-ons
  { name: 'Nivea Black & White Invisible Roll-on', skuCode: 'NIV-RO-001', category: 'Roll-on', size: '50ml' },
  { name: 'Nivea Fresh Natural Roll-on', skuCode: 'NIV-RO-002', category: 'Roll-on', size: '50ml' },
  { name: 'Nivea Dry Comfort Roll-on', skuCode: 'NIV-RO-003', category: 'Roll-on', size: '50ml' },
  { name: 'Nivea Pearl & Beauty Roll-on', skuCode: 'NIV-RO-004', category: 'Roll-on', size: '50ml' },
  { name: 'Nivea Men Black & White Roll-on', skuCode: 'NIV-RO-005', category: 'Roll-on', size: '50ml' },

  // Sprays
  { name: 'Nivea Black & White Invisible Spray', skuCode: 'NIV-SP-001', category: 'Spray', size: '150ml' },
  { name: 'Nivea Fresh Natural Spray', skuCode: 'NIV-SP-002', category: 'Spray', size: '150ml' },
  { name: 'Nivea Dry Comfort Spray', skuCode: 'NIV-SP-003', category: 'Spray', size: '150ml' },
  { name: 'Nivea Men Deep Spray', skuCode: 'NIV-SP-004', category: 'Spray', size: '150ml' },
  { name: 'Nivea Pearl & Beauty Spray', skuCode: 'NIV-SP-005', category: 'Spray', size: '150ml' },

  // Lotions
  { name: 'Nivea Soft Moisturizing Cream', skuCode: 'NIV-LO-001', category: 'Lotion', size: '200ml' },
  { name: 'Nivea Body Lotion Express Hydration', skuCode: 'NIV-LO-002', category: 'Lotion', size: '400ml' },
  { name: 'Nivea Cocoa Butter Body Lotion', skuCode: 'NIV-LO-003', category: 'Lotion', size: '400ml' },
  { name: 'Nivea Menthol Fresh Body Lotion', skuCode: 'NIV-LO-004', category: 'Lotion', size: '400ml' },
  { name: 'Nivea Q10 Firming Lotion', skuCode: 'NIV-LO-005', category: 'Lotion', size: '400ml' },

  // Shower Gels
  { name: 'Nivea Creme Care Shower Gel', skuCode: 'NIV-SG-001', category: 'Shower Gel', size: '250ml' },
  { name: 'Nivea Fresh Pure Shower Gel', skuCode: 'NIV-SG-002', category: 'Shower Gel', size: '250ml' },
  { name: 'Nivea Men Active Clean Shower Gel', skuCode: 'NIV-SG-003', category: 'Shower Gel', size: '250ml' },
  { name: 'Nivea Waterlily & Oil Shower Gel', skuCode: 'NIV-SG-004', category: 'Shower Gel', size: '250ml' },
  { name: 'Nivea Diamond Touch Shower Gel', skuCode: 'NIV-SG-005', category: 'Shower Gel', size: '250ml' },
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

    // Clear existing (optional - comment out if you want to keep data)
    // await User.deleteMany({});
    // await NiveaSKU.deleteMany({});

    // Seed Users
    for (const u of sampleUsers) {
      const exists = await User.findOne({ username: u.username });
      if (!exists) {
        await User.create(u);
        console.log(`Created user: ${u.username} (${u.role})`);
      } else {
        console.log(`User already exists: ${u.username}`);
      }
    }

    // Seed Nivea SKUs
    for (const sku of sampleSKUs) {
      const exists = await NiveaSKU.findOne({ skuCode: sku.skuCode });
      if (!exists) {
        await NiveaSKU.create(sku);
        console.log(`Created SKU: ${sku.name}`);
      }
    }

    console.log('\n✅ Seed completed successfully!');
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
