import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Outlet from './models/Outlet.js';

dotenv.config();

const DAY = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

function parseDays(text) {
  if (!text) return [];
  const t = String(text).toLowerCase();
  const days = new Set();
  for (const [name, num] of Object.entries(DAY)) {
    if (t.includes(name) || t.includes(name.slice(0, 3))) days.add(num);
  }
  return [...days].sort();
}

// Approximate area coords
const AREA = {
  okaishie: [5.548, -0.209],
  tarkwa: [5.301, -1.987],
  madina: [5.683, -0.168],
  makola: [5.548, -0.207],
  koforidua: [6.094, -0.259],
  accra: [5.56, -0.2],
  default: [5.6037, -0.187],
};

function coords(location, i) {
  const key = (location || '').toLowerCase().trim();
  let base = AREA.default;
  for (const [k, v] of Object.entries(AREA)) {
    if (key.includes(k)) {
      base = v;
      break;
    }
  }
  return { lat: base[0] + (i % 12) * 0.0008, lng: base[1] + (i % 10) * 0.0006 };
}

const OMR_ACCOUNTS = [
  { fullName: 'Basmah Ali', username: 'basmah', password: 'B@sm4h#R7', territory: 'Okaishie' , distributor: 'Amata' },
  { fullName: 'Christina Sefah', username: 'christina', password: 'Chr1st#N5', territory: 'Tarkwa' },
  { fullName: 'Doris Asamoah', username: 'doris', password: 'D0ris#M8k', territory: 'Accra' },
  { fullName: 'Evelyn Okyere', username: 'evelyn', password: 'Ev3lyn$P2', territory: 'Madina' , distributor: 'Amata' },
  { fullName: 'Marilyn Etornam Amekudzi', username: 'marilyn', password: 'M@rilyn#9', territory: 'Makola', distributor: 'Amata' },
  { fullName: 'Mary Owusu', username: 'mary', password: 'M@ry0w#Q4', territory: 'Accra' },
  { fullName: 'Sandra Owusu', username: 'sandramo', password: 'S@ndra#M3', territory: 'Accra' },
  { fullName: 'Rafael Ahiable', username: 'rafael', password: 'R@fa3l$K6', territory: 'Accra' },
  { fullName: 'Reuben Kyei', username: 'reuben', password: 'R3uben#H8', territory: 'Accra' },
  { fullName: 'Richard Korli', username: 'richard', password: 'R1ch#J2v9', territory: 'Koforidua' , distributor: 'Amata' },
  { fullName: 'Samira Nasara', username: 'samiran', password: 'S@mirN#5x', territory: 'Accra' },
  { fullName: 'Samuel Aryeetey', username: 'samuel', password: 'S@mu3l#T7', territory: 'Accra' , distributor: 'Amata' },
];

// Reviewed outlets (from user Excel). Skip empty outlet names.
const OUTLETS = [
  ["Basmah Ali", "Grace Cosmetics", "Okaishie", "Monday"],
  ["Basmah Ali", "Gifty Cosmetics", "Okaishie", "Monday"],
  ["Basmah Ali", "P3 Nipa Asem", "Okaishie", "Monday"],
  ["Basmah Ali", "Mr. Akoto Shop 4", "Okaishie", "Monday"],
  ["Basmah Ali", "Grace Universal Shop 2", "Okaishie", "Tuesday"],
  ["Basmah Ali", "Grace Universal Shop 1", "Okaishie", "Tuesday"],
  ["Basmah Ali", "Barisah Cosmetics", "Okaishie", "Tuesday"],
  ["Basmah Ali", "Urban Chic", "Okaishie", "Tuesday"],
  ["Basmah Ali", "Hajia Mariam's Cosmetics", "Okaishie", "Wednesday"],
  ["Basmah Ali", "Dartbam Enterprise", "Okaishie", "Wednesday"],
  ["Basmah Ali", "Maame Adjoa Cosmetics", "Okaishie", "Wednesday"],
  ["Basmah Ali", "Hajia NDC", "Okaishie", "Wednesday"],
  ["Basmah Ali", "Comfort Cosmetics", "Okaishie", "Thursday"],
  ["Basmah Ali", "J.K Realistic", "Okaishie", "Thursday"],
  ["Basmah Ali", "Josephine Cosmetics", "Okaishie", "Thursday"],
  ["Basmah Ali", "Masil Enterprise", "Okaishie", "Thursday"],
  ["Basmah Ali", "Shop 7", "Okaishie", "Thursday"],
  ["Basmah Ali", "Nasown", "Okaishie", "Friday"],
  ["Basmah Ali", "Pareblay", "Okaishie", "Friday"],
  ["Basmah Ali", "Osaw Cosmetics", "Okaishie", "Friday"],
  ["Basmah Ali", "Cashmrrb Cosmetics", "Okaishie", "Friday"],
  ["Christina Sefah", "Jesus Cares Clinic", "Tarkwa", "Monday"],
  ["Christina Sefah", "Big R Supermarket", "Tarkwa", "Monday"],
  ["Christina Sefah", "Yankee Ladies Ventures", "Tarkwa", "Monday"],
  ["Christina Sefah", "Awesome God Cosmetics", "Tarkwa", "Tuesday"],
  ["Christina Sefah", "May's Cosmetics", "Tarkwa", "Tuesday"],
  ["Christina Sefah", "Rubinet Smart", "Tarkwa", "Tuesday"],
  ["Christina Sefah", "Demacare", "Tarkwa", "Tuesday"],
  ["Christina Sefah", "Thy Kingdom Come", "Tarkwa", "Tuesday"],
  ["Christina Sefah", "Naomi Pretty Things", "Tarkwa", "Wednesday"],
  ["Christina Sefah", "Naomi Beauty Clinic", "Tarkwa", "Wednesday"],
  ["Christina Sefah", "My Joy Cosmetics", "Tarkwa", "Wednesday"],
  ["Christina Sefah", "Golden Charis", "Tarkwa", "Wednesday"],
  ["Christina Sefah", "Bees Cosmetics", "Tarkwa", "Wednesday"],
  ["Christina Sefah", "Reggynest Supermarket", "Tarkwa", "Thursday"],
  ["Christina Sefah", "Jemoz Pharmacy", "Tarkwa", "Thursday"],
  ["Christina Sefah", "Lady Nash", "Tarkwa", "Thursday"],
  ["Christina Sefah", "Hope of Glory Cosmetics", "Tarkwa", "Thursday"],
  ["Christina Sefah", "Bencom Enterprise", "Tarkwa", "Friday"],
  ["Christina Sefah", "Faith Enterprise", "Tarkwa", "Friday"],
  ["Christina Sefah", "Jammoh Supermarket", "Tarkwa", "Friday"],
  ["Doris Asamoah", "Mr Ofori", "Accra", "Monday"],
  ["Doris Asamoah", "Sister Abena Cosmetics", "Accra", "Monday"],
  ["Doris Asamoah", "Asikasu Cosmetics", "Accra", "Monday"],
  ["Doris Asamoah", "Samuelos Cosmetics", "Accra", "Monday"],
  ["Doris Asamoah", "Golden Nuggets", "Accra", "Monday"],
  ["Doris Asamoah", "Atta Show Enterprise Cosmetics", "Accra", "Monday"],
  ["Doris Asamoah", "Beyond Beauty", "Accra", "Monday"],
  ["Doris Asamoah", "Lucy Oloriwaa Agyemeng Enterprise", "Accra", "Monday"],
  ["Doris Asamoah", "Holy Cee Cosmetics", "Accra", "Monday"],
  ["Doris Asamoah", "Angelina Cosmetics", "Accra", "Monday"],
  ["Doris Asamoah", "Deewus Enterprise", "Accra", "Monday"],
  ["Doris Asamoah", "Rose Cosmetics", "Accra", "Monday"],
  ["Doris Asamoah", "Hajia OT Cosmetics", "Accra", "Monday"],
  ["Doris Asamoah", "Hajia Rukaya Cosmetics", "Accra", "Monday"],
  ["Doris Asamoah", "Maa Vida Cosmetics", "Accra", "Tuesday"],
  ["Doris Asamoah", "Nyame Aye Ame Cosmetics", "Accra", "Tuesday"],
  ["Doris Asamoah", "Nuamekyeba Cosmetics", "Accra", "Tuesday"],
  ["Doris Asamoah", "Greguans Royal", "Accra", "Tuesday"],
  ["Doris Asamoah", "God Is Watching", "Accra", "Tuesday"],
  ["Doris Asamoah", "Nana Adinka", "Accra", "Tuesday"],
  ["Doris Asamoah", "Elmar Beauty Shop", "Accra", "Tuesday"],
  ["Doris Asamoah", "Akoma Enterprise", "Accra", "Tuesday"],
  ["Doris Asamoah", "Sule Hamshaw", "Accra", "Tuesday"],
  ["Doris Asamoah", "Mr. Boateng Store", "Accra", "Wednesday"],
  ["Doris Asamoah", "Nanak Cosmetics", "Accra", "Wednesday"],
  ["Doris Asamoah", "Nana Kwame Cosmetics", "Accra", "Wednesday"],
  ["Doris Asamoah", "Desire Cosmetics", "Accra", "Wednesday"],
  ["Doris Asamoah", "Kumahi Bilini Cosmetics", "Accra", "Wednesday"],
  ["Doris Asamoah", "Forsmuel Shopping Center", "Accra", "Wednesday"],
  ["Doris Asamoah", "Nyane Bafo Cosmetics", "Accra", "Wednesday"],
  ["Doris Asamoah", "Rama Beauty Cosmetics", "Accra", "Wednesday"],
  ["Doris Asamoah", "Hania Cosmetics", "Accra", "Thursday"],
  ["Doris Asamoah", "Sister Fowaah Cosmetics", "Accra", "Thursday"],
  ["Doris Asamoah", "Fifa Cosmetic", "Accra", "Thursday"],
  ["Doris Asamoah", "Hajia Fuseina", "Accra", "Thursday"],
  ["Doris Asamoah", "Amazing Grace", "Accra", "Thursday"],
  ["Doris Asamoah", "Blessing Cosmetics", "Accra", "Thursday"],
  ["Doris Asamoah", "Amegatse", "Accra", "Thursday"],
  ["Doris Asamoah", "Hope Cosmetics", "Accra", "Thursday"],
  ["Doris Asamoah", "Super Bino Cosmetics", "Accra", "Thursday"],
  ["Doris Asamoah", "Bonsu Cosmetics", "Accra", "Thursday"],
  ["Doris Asamoah", "Jevad's Ventures", "Accra", "Thursday"],
  ["Doris Asamoah", "UT Cosmetics", "Accra", "Thursday"],
  ["Doris Asamoah", "Baafa Old Market", "Accra", "Thursday"],
  ["Doris Asamoah", "Diana Agaia Cosmetics", "Accra", "Friday"],
  ["Doris Asamoah", "Clinton Cosmetics", "Accra", "Friday"],
  ["Doris Asamoah", "First Beauty Cosmetics", "Accra", "Friday"],
  ["Doris Asamoah", "Royal Prematt Cosmetics", "Accra", "Friday"],
  ["Doris Asamoah", "Jackline", "Accra", "Friday"],
  ["Doris Asamoah", "Yvonne's Perfect Much Cosmetics", "Accra", "Friday"],
  ["Doris Asamoah", "St Monica MP Ent", "Accra", "Friday"],
  ["Doris Asamoah", "Royal Amazing Grace Company", "Accra", "Friday"],
  ["Doris Asamoah", "Nana Yah Cosmetics", "Accra", "Friday"],
  ["Doris Asamoah", "Hajia Mariya", "Accra", "Friday"],
  ["Doris Asamoah", "Askham Ventures", "Accra", "Friday"],
  ["Doris Asamoah", "Hajia Esther", "Accra", "Friday"],
  ["Evelyn Okyere", "Dalali Enterprise", "Madina", "Monday"],
  ["Evelyn Okyere", "Rukys Cosmetics", "Madina", "Monday"],
  ["Evelyn Okyere", "Hay Cosmetics", "Madina", "Monday"],
  ["Evelyn Okyere", "Nana Store", "Madina", "Monday"],
  ["Evelyn Okyere", "God Is Good Store", "Madina", "Monday"],
  ["Evelyn Okyere", "Curtis Cosmetics", "Madina", "Tuesday"],
  ["Evelyn Okyere", "Macasandos Cosmetics", "Madina", "Tuesday"],
  ["Evelyn Okyere", "Aku Cosmetics", "Madina", "Tuesday"],
  ["Evelyn Okyere", "Passion Cosmetics", "Madina", "Tuesday"],
  ["Evelyn Okyere", "MB Store", "Madina", "Wednesday"],
  ["Evelyn Okyere", "Jams Cosmetics", "Madina", "Wednesday"],
  ["Evelyn Okyere", "Deva Cleaning Essentials", "Madina", "Wednesday"],
  ["Evelyn Okyere", "Lizzy Cosmetics", "Madina", "Wednesday"],
  ["Evelyn Okyere", "Yapile", "Madina", "Wednesday"],
  ["Evelyn Okyere", "Noir and Nectar", "Madina", "Wednesday"],
  ["Evelyn Okyere", "Fatima Cosmetics", "Madina", "Thursday"],
  ["Evelyn Okyere", "Awude Ye", "Madina", "Thursday"],
  ["Evelyn Okyere", "Uncle Kwesi Store", "Madina", "Thursday"],
  ["Evelyn Okyere", "Chrita Store", "Madina", "Thursday"],
  ["Evelyn Okyere", "DD Essentials", "Madina", "Thursday"],
  ["Evelyn Okyere", "Mirat", "Madina", "Thursday"],
  ["Evelyn Okyere", "Elaa Cosmetics", "Madina", "Friday"],
  ["Evelyn Okyere", "Dorcas Store", "Madina", "Friday"],
  ["Evelyn Okyere", "Daily Basis", "Madina", "Friday"],
  ["Evelyn Okyere", "AJ Cosmetics", "Madina", "Friday"],
  ["Evelyn Okyere", "God Is My Witness", "Madina", "Friday"],
  ["Evelyn Okyere", "Home Chow", "Madina", "Friday"],
  ["Marilyn Etornam Amekudzi", "Betty Bups", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Mrs Akoto Store", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Benwils Store", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Cosini Alabi", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Hajia Taller Store", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Agnes Gyimah Stores", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Sath Plus", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Authentic Care", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Halima Links", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Fabs Cosmetics", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Wendy Cosmetics", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "OAF Cosmetics", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "Enoch Cosmetics", "Makola", "Monday"],
  ["Marilyn Etornam Amekudzi", "First Stop Hair Care", "Makola", "Tuesday"],
  ["Marilyn Etornam Amekudzi", "Benwils", "Makola", "Tuesday"],
  ["Marilyn Etornam Amekudzi", "Carolex", "Makola", "Tuesday"],
  ["Marilyn Etornam Amekudzi", "Glow Beauty", "Makola", "Wednesday"],
  ["Marilyn Etornam Amekudzi", "Lamvic", "Makola", "Wednesday"],
  ["Marilyn Etornam Amekudzi", "Sika Akomea", "Makola", "Wednesday"],
  ["Marilyn Etornam Amekudzi", "Vic Adom", "Makola", "Thursday"],
  ["Marilyn Etornam Amekudzi", "Joalky Enterprise", "Makola", "Thursday"],
  ["Mary Owusu", "Yesu Nti Cosmetics", "Accra", "Monday"],
  ["Mary Owusu", "Duadian", "Accra", "Monday"],
  ["Mary Owusu", "Ayaa Dede", "Accra", "Monday"],
  ["Mary Owusu", "Yaa Sam", "Accra", "Monday"],
  ["Mary Owusu", "Pakamn", "Accra", "Monday"],
  ["Mary Owusu", "Auntie Bee", "Accra", "Monday"],
  ["Mary Owusu", "Akua Pakuaa", "Accra", "Monday"],
  ["Mary Owusu", "Power House", "Accra", "Monday"],
  ["Mary Owusu", "Peter Cos", "Accra", "Monday"],
  ["Mary Owusu", "Alpha and Omega Cos", "Accra", "Monday"],
  ["Mary Owusu", "May Baby Cosmetics", "Accra", "Monday"],
  ["Mary Owusu", "Diamond Cosmetics", "Accra", "Monday"],
  ["Mary Owusu", "God Is Here", "Accra", "Tuesday"],
  ["Mary Owusu", "N& D Ent", "Accra", "Tuesday"],
  ["Mary Owusu", "Story Inside Cos", "Accra", "Tuesday"],
  ["Mary Owusu", "Sis May", "Accra", "Tuesday"],
  ["Mary Owusu", "Precious Cos", "Accra", "Tuesday"],
  ["Mary Owusu", "Mama Ent", "Accra", "Tuesday"],
  ["Mary Owusu", "Maa Ataa", "Accra", "Tuesday"],
  ["Mary Owusu", "Peace Time Cos", "Accra", "Tuesday"],
  ["Mary Owusu", "God Is Great", "Accra", "Tuesday"],
  ["Mary Owusu", "Wisdom Extends Ent", "Accra", "Tuesday"],
  ["Mary Owusu", "Sweet 16", "Accra", "Tuesday"],
  ["Mary Owusu", "Toplant Business Service", "Accra", "Tuesday"],
  ["Mary Owusu", "June Cosmetics", "Accra", "Tuesday"],
  ["Mary Owusu", "Glory Cosmetics", "Accra", "Wednesday"],
  ["Mary Owusu", "Maa Rita", "Accra", "Wednesday"],
  ["Mary Owusu", "Maa Monica Cosmetics", "Accra", "Wednesday"],
  ["Mary Owusu", "Jane Adusah Ent", "Accra", "Wednesday"],
  ["Mary Owusu", "Tilly Cosmetics", "Accra", "Wednesday"],
  ["Mary Owusu", "Hajia Nis Cosmetics", "Accra", "Wednesday"],
  ["Mary Owusu", "Nana Poku", "Accra", "Wednesday"],
  ["Mary Owusu", "AB Cosmetics", "Accra", "Wednesday"],
  ["Mary Owusu", "Maa Afua Cosmetics", "Accra", "Wednesday"],
  ["Mary Owusu", "Divine Ventures Ltd", "Accra", "Wednesday"],
  ["Mary Owusu", "AK Cos", "Accra", "Wednesday"],
  ["Mary Owusu", "IK Frimpong Store", "Accra", "Wednesday"],
  ["Mary Owusu", "Li Boat Cosmetics", "Accra", "Thursday"],
  ["Mary Owusu", "171 Cosmetics", "Accra", "Thursday"],
  ["Mary Owusu", "Hask Royal", "Accra", "Thursday"],
  ["Mary Owusu", "Kevy's Cosmetics", "Accra", "Thursday"],
  ["Mary Owusu", "Lucumens Ent", "Accra", "Thursday"],
  ["Mary Owusu", "Hasbunallah Cos", "Accra", "Thursday"],
  ["Mary Owusu", "S & G Ent", "Accra", "Thursday"],
  ["Mary Owusu", "Fear Heaven Cosmetics", "Accra", "Thursday"],
  ["Mary Owusu", "AA Baffour", "Accra", "Thursday"],
  ["Mary Owusu", "Konama Store", "Accra", "Thursday"],
  ["Mary Owusu", "Yesu Mame", "Accra", "Thursday"],
  ["Mary Owusu", "Agya Koo Cosmetics", "Accra", "Thursday"],
  ["Mary Owusu", "Scentone Ent", "Accra", "Friday"],
  ["Mary Owusu", "Priscilla Cosmetics", "Accra", "Friday"],
  ["Mary Owusu", "Madinatu", "Accra", "Friday"],
  ["Mary Owusu", "Blessing Cosmetics", "Accra", "Friday"],
  ["Mary Owusu", "Inchichaa Cosmetics", "Accra", "Friday"],
  ["Mary Owusu", "Andrew Kyei Cosmetics", "Accra", "Friday"],
  ["Mary Owusu", "E45 Cosmetics", "Accra", "Friday"],
  ["Mary Owusu", "Beauty Jay", "Accra", "Friday"],
  ["Mary Owusu", "Victoria Cosmetics", "Accra", "Friday"],
  ["Mary Owusu", "Lawrencia Cosmetics", "Accra", "Friday"],
  ["Mary Owusu", "Ausvii Cosmetics", "Accra", "Friday"],
  ["Mary Owusu", "Royal Prematt", "Accra", "Friday"],
  ["Reuben Kyei", "Nyame Ye Nyame Cosmetics", "Accra", "Wednesday"],
  ["Reuben Kyei", "Ellohim", "Accra", "Wednesday"],
  ["Reuben Kyei", "Maame Konadu Supermarket", "Accra", "Wednesday"],
  ["Reuben Kyei", "Ewura Supermarket", "Accra", "Wednesday"],
  ["Reuben Kyei", "Mama Law Cosmetics", "Accra", "Wednesday"],
  ["Reuben Kyei", "Berekum Store", "Accra", "Wednesday"],
  ["Reuben Kyei", "Ogre Cosmetics", "Accra", "Wednesday"],
  ["Reuben Kyei", "Nyame Na Aye Cosmetics", "Accra", "Wednesday"],
  ["Reuben Kyei", "Modern Beck Supermarket", "Accra", "Wednesday"],
  ["Richard Korli", "Joe-Si", "Koforidua Accra Station", "Wednesday"],
];

async function seedOMRs() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI missing');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected\n');

    const byName = {};
    for (const a of OMR_ACCOUNTS) {
      let user = await User.findOne({ username: a.username });
      if (!user) {
        user = await User.create({
          username: a.username,
          password: a.password,
          fullName: a.fullName,
          role: 'omr',
          territory: a.territory || '',
          distributor: a.distributor || 'Nivea Ghana',
          isActive: true,
        });
        console.log(`✅ User ${a.username}`);
      } else {
        user.password = a.password;
        user.fullName = a.fullName;
        user.role = 'omr';
        user.territory = a.territory || user.territory;
        user.isActive = true;
        await user.save();
        console.log(`↻ User ${a.username}`);
      }
      byName[a.fullName] = user;
    }

    let created = 0;
    let updated = 0;
    let i = 0;
    for (const [omrName, store, location, dayText] of OUTLETS) {
      const user = byName[omrName];
      if (!user || !store) continue;
      i += 1;
      const days = parseDays(dayText);
      let outlet = await Outlet.findOne({ assignedTo: user._id, name: store });
      if (!outlet) {
        await Outlet.create({
          userId: user._id,
          assignedTo: user._id,
          createdBy: 'Seed Script',
          name: store,
          address: location || '',
          territory: location || user.territory || '',
          distributor: user.distributor || 'Nivea Ghana',
          location: coords(location, i),
          status: 'approved',
          assignedDays: days.length ? days : [1],
          approvedBy: 'Seed Script',
          approvedAt: new Date(),
          isActive: true,
        });
        created += 1;
      } else {
        outlet.assignedDays = days.length ? days : outlet.assignedDays;
        outlet.status = 'approved';
        outlet.isActive = true;
        outlet.address = location || outlet.address;
        outlet.territory = location || outlet.territory;
        await outlet.save();
        updated += 1;
      }
    }

    console.log(`\n✅ Outlets created: ${created}, updated: ${updated}`);
    console.log('Logins (same as before):');
    for (const a of OMR_ACCOUNTS) {
      console.log(`  ${a.fullName.padEnd(28)} ${a.username.padEnd(12)} ${a.password}`);
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seedOMRs();
