import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Outlet from './models/Outlet.js';

dotenv.config();

const DAY = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

function parseDays(text) {
  if (!text) return [1, 2, 3, 4, 5];
  const t = String(text).toLowerCase();
  const days = new Set();
  for (const [name, num] of Object.entries(DAY)) {
    if (t.includes(name) || t.includes(name.slice(0, 3))) days.add(num);
  }
  return days.size ? [...days].sort() : [1, 2, 3, 4, 5];
}

// OMR roster + sample shops by day (from Daily Sales Field Report screenshots)
const OMR_DATA = [
  {
    fullName: 'Basmah Ali',
    username: 'basmah',
    password: 'B@sm4h#R7',
    territory: 'Accra',
    stores: [
      ['Grace Cosmetics', 'Accra', 'Monday'],
      ['Gifty Cosmetics', 'Accra', 'Monday'],
      ['P3 Nipa Asem', 'Accra', 'Monday'],
      ['Mr. Akoto Shop 4', 'Accra', 'Monday'],
      ['Grace Universal Shop 2', 'Accra', 'Tuesday'],
      ['Grace Universal Shop 1', 'Accra', 'Tuesday'],
      ['Barisah Cosmetics', 'Accra', 'Tuesday'],
      ['Urban Chic', 'Accra', 'Tuesday'],
      ["Hajia Mariam's Cosmetics", 'Accra', 'Wednesday'],
      ['Dartbam Enterprise', 'Accra', 'Wednesday'],
      ['Maame Adjoa Cosmetics', 'Accra', 'Wednesday'],
      ['Hajia NDC', 'Accra', 'Wednesday'],
      ['Comfort Cosmetics', 'Accra', 'Thursday'],
      ['J.K Realistic', 'Accra', 'Thursday'],
      ['Josephine Cosmetics', 'Accra', 'Thursday'],
      ['Masil Enterprise', 'Accra', 'Thursday'],
      ['Shop 7', 'Accra', 'Thursday'],
      ['Nasown', 'Accra', 'Friday'],
      ['Pareblay', 'Accra', 'Friday'],
      ['Osaw Cosmetics', 'Accra', 'Friday'],
      ['Cashmrrb Cosmetics', 'Accra', 'Friday'],
    ],
  },
  {
    fullName: 'Christina Sefah',
    username: 'christina',
    password: 'Chr1st#N5',
    territory: 'Accra',
    stores: [
      ['Jesus Cares Clinic', 'Accra', 'Monday'],
      ['Big R Supermarket', 'Accra', 'Monday'],
      ['Yankee Ladies Ventures', 'Accra', 'Monday'],
      ['Awesome God Cosmetics', 'Accra', 'Tuesday'],
      ["May's Cosmetics", 'Accra', 'Tuesday'],
      ['Rubinet Smart', 'Accra', 'Tuesday'],
      ['Demacare', 'Accra', 'Tuesday'],
      ['Thy Kingdom Come', 'Accra', 'Tuesday'],
      ['Naomi Pretty Things', 'Accra', 'Wednesday'],
      ['Naomi Beauty Clinic', 'Accra', 'Wednesday'],
      ['My Joy Cosmetics', 'Accra', 'Wednesday'],
      ['Golden Charis', 'Accra', 'Wednesday'],
      ['Bees Cosmetics', 'Accra', 'Wednesday'],
      ['Reggynest Supermarket', 'Accra', 'Thursday'],
      ['Jemoz Pharmacy', 'Accra', 'Thursday'],
      ['Lady Nash', 'Accra', 'Thursday'],
      ['Hope of Glory Cosmetics', 'Accra', 'Thursday'],
      ['Bencom Enterprise', 'Accra', 'Friday'],
      ['Faith Enterprise', 'Accra', 'Friday'],
      ['Jammoh Supermarket', 'Accra', 'Friday'],
    ],
  },
  {
    fullName: 'Doris Asamoah',
    username: 'doris',
    password: 'D0ris#M8k',
    territory: 'Accra',
    stores: [
      ['Mr Ofori', 'Accra', 'Monday'],
      ['Sister Abena Cosmetics', 'Accra', 'Monday'],
      ['Asikasu Cosmetics', 'Accra', 'Monday'],
      ['Samuelos Cosmetics', 'Accra', 'Monday'],
      ['Golden Nuggets', 'Accra', 'Monday'],
      ['Beyond Beauty', 'Accra', 'Monday'],
      ['Holy Cee Cosmetics', 'Accra', 'Monday'],
      ['Angelina Cosmetics', 'Accra', 'Monday'],
      ['Rose Cosmetics', 'Accra', 'Monday'],
      ['Maa Vida Cosmetics', 'Accra', 'Tuesday'],
      ['Nyame Aye Ame Cosmetics', 'Accra', 'Tuesday'],
      ['Nuamekyeba Cosmetics', 'Accra', 'Tuesday'],
      ['Elmar Beauty Shop', 'Accra', 'Tuesday'],
      ['Akoma Enterprise', 'Accra', 'Tuesday'],
      ['Mr. Boateng Store', 'Accra', 'Wednesday'],
      ['Nana Kwame Cosmetics', 'Accra', 'Wednesday'],
      ['Desire Cosmetics', 'Accra', 'Wednesday'],
      ['Rama Beauty Cosmetics', 'Accra', 'Wednesday'],
      ['Hania Cosmetics', 'Accra', 'Thursday'],
      ['Sister Fowaah Cosmetics', 'Accra', 'Thursday'],
      ['Amazing Grace', 'Accra', 'Thursday'],
      ['Blessing Cosmetics', 'Accra', 'Thursday'],
      ['Diana Agaia Cosmetics', 'Accra', 'Friday'],
      ['First Beauty Cosmetics', 'Accra', 'Friday'],
      ['Nana Yah Cosmetics', 'Accra', 'Friday'],
    ],
  },
  {
    fullName: 'Evelyn Okyere',
    username: 'evelyn',
    password: 'Ev3lyn$P2',
    territory: 'Accra',
    stores: [
      ['Dalali Enterprise', 'Accra', 'Monday'],
      ['Rukys Cosmetics', 'Accra', 'Monday'],
      ['Hay Cosmetics', 'Accra', 'Monday'],
      ['Nana Store', 'Accra', 'Monday'],
      ['God Is Good Store', 'Accra', 'Monday'],
      ['Curtis Cosmetics', 'Accra', 'Tuesday'],
      ['Macasandos Cosmetics', 'Accra', 'Tuesday'],
      ['Aku Cosmetics', 'Accra', 'Tuesday'],
      ['Passion Cosmetics', 'Accra', 'Tuesday'],
      ['MB Store', 'Accra', 'Wednesday'],
      ['Jams Cosmetics', 'Accra', 'Wednesday'],
      ['Lizzy Cosmetics', 'Accra', 'Wednesday'],
      ['Fatima Cosmetics', 'Accra', 'Thursday'],
      ['Uncle Kwesi Store', 'Accra', 'Thursday'],
      ['Elaa Cosmetics', 'Accra', 'Friday'],
      ['Dorcas Store', 'Accra', 'Friday'],
      ['AJ Cosmetics', 'Accra', 'Friday'],
    ],
  },
  {
    fullName: 'Marilyn Etornam Amekudzi',
    username: 'marilyn',
    password: 'M@rilyn#9',
    territory: 'Makola',
    distributor: 'Amata',
    stores: [
      ['Betty Bups', 'Makola', 'Monday'],
      ['Mrs Akoto Store', 'Makola', 'Monday'],
      ['Benwils Store', 'Makola', 'Monday'],
      ['Agnes Gyimah Stores', 'Makola', 'Monday'],
      ['Fabs Cosmetics', 'Makola', 'Monday'],
      ['Wendy Cosmetics', 'Makola', 'Monday'],
      ['Enoch Cosmetics', 'Makola', 'Monday'],
      ['First Stop Hair Care', 'Makola', 'Tuesday'],
      ['Benwils', 'Makola', 'Tuesday'],
      ['Carolex', 'Makola', 'Tuesday'],
      ['Glow Beauty', 'Makola', 'Wednesday'],
      ['Lamvic', 'Makola', 'Wednesday'],
      ['Sika Akomea', 'Makola', 'Wednesday'],
      ['Vic Adom', 'Makola', 'Thursday'],
      ['Joalky Enterprise', 'Makola', 'Thursday'],
    ],
  },
  {
    fullName: 'Mary Owusu',
    username: 'mary',
    password: 'M@ry0w#Q4',
    territory: 'Accra',
    stores: [
      ['Yesu Nti Cosmetics', 'Accra', 'Monday'],
      ['May Baby Cosmetics', 'Accra', 'Monday'],
      ['Diamond Cosmetics', 'Accra', 'Monday'],
      ['God Is Here', 'Accra', 'Tuesday'],
      ['Precious Cos', 'Accra', 'Tuesday'],
      ['June Cosmetics', 'Accra', 'Tuesday'],
      ['Glory Cosmetics', 'Accra', 'Wednesday'],
      ['Maa Monica Cosmetics', 'Accra', 'Wednesday'],
      ['Divine Ventures Ltd', 'Accra', 'Wednesday'],
      ['Hasbunallah Cos', 'Accra', 'Thursday'],
      ['Fear Heavens Cos', 'Accra', 'Thursday'],
    ],
  },
  {
    fullName: 'Sandra Owusu',
    username: 'sandramo',
    password: 'S@ndra#M3',
    territory: 'Accra',
    stores: [],
  },
  {
    fullName: 'Rafael Ahiable',
    username: 'rafael',
    password: 'R@fa3l$K6',
    territory: 'Accra',
    stores: [],
  },
  {
    fullName: 'Reuben Kyei',
    username: 'reuben',
    password: 'R3uben#H8',
    territory: 'Accra',
    stores: [
      ['Nyame Ye Nyame Cosmetics', 'Accra', 'Wednesday'],
      ['Maame Konadu Supermarket', 'Accra', 'Wednesday'],
      ['Ewura Supermarket', 'Accra', 'Wednesday'],
      ['Mama Law Cosmetics', 'Accra', 'Wednesday'],
      ['Berekum Store', 'Accra', 'Wednesday'],
      ['Ogre Cosmetics', 'Accra', 'Wednesday'],
      ['Modern Beck Supermarket', 'Accra', 'Wednesday'],
    ],
  },
  {
    fullName: 'Richard Korli',
    username: 'richard',
    password: 'R1ch#J2v9',
    territory: 'Accra',
    stores: [['Joe-Si', 'Accra', 'Wednesday']],
  },
  {
    fullName: 'Samira Nasara',
    username: 'samiran',
    password: 'S@mirN#5x',
    territory: 'Accra',
    stores: [],
  },
  {
    fullName: 'Samuel Aryeetey',
    username: 'samuel',
    password: 'S@mu3l#T7',
    territory: 'Accra',
    stores: [],
  },
];

async function seedOMRs() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI missing');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected\n');

    const creds = [];
    let i = 0;

    for (const o of OMR_DATA) {
      let user = await User.findOne({ username: o.username });
      if (!user) {
        user = await User.create({
          username: o.username,
          password: o.password,
          fullName: o.fullName,
          role: 'omr',
          territory: o.territory || '',
          distributor: o.distributor || 'Nivea Ghana',
          isActive: true,
        });
        console.log(`✅ Created OMR ${o.username}`);
      } else {
        user.password = o.password;
        user.fullName = o.fullName;
        user.role = 'omr';
        user.territory = o.territory || user.territory;
        user.isActive = true;
        await user.save();
        console.log(`↻ Updated OMR ${o.username}`);
      }
      creds.push(o);

      for (const [name, loc, daysText] of o.stores || []) {
        i += 1;
        const days = parseDays(daysText);
        let outlet = await Outlet.findOne({ assignedTo: user._id, name });
        if (!outlet) {
          await Outlet.create({
            userId: user._id,
            assignedTo: user._id,
            createdBy: 'Seed Script',
            name,
            address: loc,
            territory: loc,
            distributor: o.distributor || 'Nivea Ghana',
            location: { lat: 5.6 + (i % 20) * 0.002, lng: -0.18 + (i % 15) * 0.002 },
            status: 'approved',
            assignedDays: days,
            approvedBy: 'Seed Script',
            approvedAt: new Date(),
            isActive: true,
          });
        } else {
          outlet.assignedDays = days;
          outlet.status = 'approved';
          await outlet.save();
        }
      }
    }

    console.log('\n========== OMR LOGINS (confidential) ==========');
    for (const c of creds) {
      console.log(`${c.fullName.padEnd(28)}  ${c.username.padEnd(12)}  ${c.password}`);
    }
    console.log('================================================');
    console.log('Note: Some OMRs have partial shop lists from screenshots; admin can add more outlets.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seedOMRs();
