import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Outlet from './models/Outlet.js';

dotenv.config();

const DAY = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseDays(text) {
  if (!text) return [];
  const t = String(text).toLowerCase().replace(/–/g, '-').replace(/\s+/g, ' ').trim();
  if (t.includes('monday - friday') || t.includes('monday-friday')) {
    return [1, 2, 3, 4, 5];
  }
  const days = new Set();
  for (const part of t.split(/[,/&]+/)) {
    const p = part.trim();
    for (const [name, num] of Object.entries(DAY)) {
      if (p.includes(name.slice(0, 3)) || p.includes(name)) days.add(num);
    }
  }
  return [...days].sort();
}

const AREA_COORDS = {
  'east legon': [5.635, -0.151],
  nanakrom: [5.62, -0.14],
  achimota: [5.627, -0.232],
  dansoman: [5.545, -0.266],
  tafo: [6.731, -1.598],
  adum: [6.695, -1.62],
  suame: [6.72, -1.63],
  tanoso: [6.68, -1.67],
  airport: [5.605, -0.17],
  osu: [5.56, -0.17],
  ashongman: [5.7, -0.2],
  madina: [5.68, -0.17],
  upsa: [5.66, -0.17],
  amasaman: [5.7, -0.3],
  dome: [5.65, -0.23],
  kissieman: [5.68, -0.22],
  haatso: [5.67, -0.19],
  atomic: [5.66, -0.18],
  spintex: [5.62, -0.1],
  'westhill mall': [5.58, -0.3],
  gbawe: [5.55, -0.32],
  kasoa: [5.53, -0.42],
  ashaiman: [5.7, -0.03],
  tema: [5.67, 0.0],
  'tema community 12': [5.68, 0.01],
  mataheko: [5.55, -0.25],
  'north kaneshie': [5.59, -0.24],
  lapaz: [5.6, -0.25],
  ablekuma: [5.55, -0.28],
  olebu: [5.54, -0.3],
  'accra mall': [5.62, -0.17],
  cantoment: [5.58, -0.16],
  'burma camp': [5.59, -0.15],
  labone: [5.57, -0.17],
  takoradi: [4.9, -1.76],
  asokwa: [6.67, -1.6],
  santasi: [6.66, -1.65],
  atonsu: [6.65, -1.58],
  ahodwo: [6.67, -1.63],
  manhyia: [6.7, -1.61],
  tamale: [9.4, -0.84],
  'nungua barrier': [5.6, -0.07],
  baatsona: [5.61, -0.08],
  lashibi: [5.65, -0.05],
  'estate junction spintex': [5.62, -0.09],
  'adenta frafraha': [5.72, -0.15],
  'adenta-dodowa road': [5.73, -0.14],
  'ashaley botwe': [5.7, -0.14],
  'adenta housing': [5.71, -0.15],
  adenta: [5.71, -0.15],
  '37': [5.59, -0.18],
  dzorwulu: [5.61, -0.2],
  default: [5.6037, -0.187],
};

function coordsFor(location, index) {
  const key = (location || '').toLowerCase().trim();
  let base = AREA_COORDS.default;
  for (const [k, v] of Object.entries(AREA_COORDS)) {
    if (key.includes(k) || k.includes(key)) {
      base = v;
      break;
    }
  }
  const jitter = (index % 10) * 0.001;
  return { lat: base[0] + jitter, lng: base[1] + jitter * 0.7 };
}

// Strong unique passwords (mix of letters, numbers, symbol)
const MERCH_DATA = [
  {
    fullName: 'Freda Amponsah',
    username: 'freda',
    password: 'Fr3da#N9v',
    territory: 'East Legon',
    stores: [
      ['Max Mart A&C Mall', 'East Legon', 'Tuesday'],
      ['Melcom Gethsemane', 'East Legon', 'Monday,Thursday'],
      ['Marina Supermarket - East Legon', 'East Legon', 'Tuesday'],
      ['Melcom East Legon', 'East Legon', 'Monday'],
      ['Melcom Hampton Square', 'Nanakrom', 'Wednesday'],
      ['Melcom Nanakrom', 'Nanakrom', 'Wednesday'],
    ],
  },
  {
    fullName: 'Hannah Wiredu',
    username: 'hannah',
    password: 'H@nn4h$K2',
    territory: 'Achimota',
    stores: [
      ['Shoprite Achimota Mall', 'Achimota', 'Tuesday,Thursday'],
      ['Melcom Achimota Mall', 'Achimota', 'Tuesday,Thursday'],
      ['Melcom Achimota', 'Achimota', 'Wednesday'],
      ['Dom V Ventures', 'Dansoman', 'Monday'],
      ["Stu's Supermarket", 'Dansoman', 'Friday'],
    ],
  },
  {
    fullName: 'Lawrencia Dapaah',
    username: 'lawrencia',
    password: 'L@wr8n#Qx',
    territory: 'Kumasi',
    stores: [
      ['Melcom Kumasi Tafo', 'Tafo', 'Thursday'],
      ['Melcom Adum', 'Adum', 'Monday,Friday'],
      ['Melcom Suame', 'Suame', 'Wednesday'],
      ['Melcom Tanoso', 'Tanoso', 'Tuesday'],
      ['Opoku Trading', 'Adum', 'Monday,Friday'],
    ],
  },
  {
    fullName: 'Janet',
    username: 'janet',
    password: 'J@n3t!M7p',
    territory: 'Accra',
    stores: [
      ['Marina Supermarket', 'Airport', 'Monday,Wednesday'],
      ['Shoprite Osu', 'Osu', 'Tuesday'],
      ['Melcom Ashongman', 'Ashongman', 'Thursday'],
      ['Melcom Madina', 'Madina', 'Thursday'],
      ['Quick and Fine Supermarket', 'UPSA', 'Friday'],
    ],
  },
  {
    fullName: 'Linda Eklu',
    username: 'linda',
    password: 'L1nda#R4v',
    territory: 'Amasaman',
    stores: [
      ['Melcom Amasaman', 'Amasaman', 'Tuesday,Thursday'],
      ['Melcom Dansoman', 'Dansoman', 'Friday'],
      ['Melcom Dome Mini', 'Dome', 'Wednesday'],
      ['Melcom Kissieman shop', 'Kissieman', 'Monday,Wednesday'],
    ],
  },
  {
    fullName: 'Lucy Amponsah',
    username: 'lucy',
    password: 'Lucy$T8n2',
    territory: 'Spintex',
    stores: [
      ['Melcom Haatso', 'Haatso', 'Friday'],
      ['Super Plaza China Mall', 'Atomic', 'Tuesday'],
      ['China Mall Spintex / Manet', 'Spintex', 'Monday,Wednesday'],
      ['China Mall Regimanuel', 'Spintex', 'Monday,Wednesday'],
      ['Melcom Mall - Spintex', 'Spintex', 'Monday,Wednesday,Saturday'],
      ['Panda Mart', 'Atomic', 'Tuesday'],
    ],
  },
  {
    fullName: 'Mavis Mensah',
    username: 'mavis',
    password: 'M@v1s#W9k',
    territory: 'Westhills',
    stores: [
      ['Shoprite Westhills Mall', 'Westhill Mall', 'Tuesday'],
      ['Melcom West Hills mall', 'Westhill Mall', 'Monday'],
      ['Melcom Gbawe', 'Gbawe', 'Thursday'],
      ['Melcom Kasoa', 'Kasoa', 'Friday'],
      ['China Mall West Hills', 'Westhill Mall', 'Wednesday'],
    ],
  },
  {
    fullName: 'Mercy Amponsah',
    username: 'mercy',
    password: 'M3rcy!P6q',
    territory: 'Tema',
    stores: [
      ['CHINA MALL TEMA', 'Ashaiman', 'Tuesday,Saturday'],
      ['Melcom Ashaiman', 'Ashaiman', 'Tuesday,Saturday'],
      ['Jusam and Sons Supermarket', 'Tema Community 12', 'Thursday'],
      ['Melcom Tema', 'Tema', 'Monday,Wednesday'],
      ['Melcom Mataheko', 'Mataheko', 'Thursday'],
    ],
  },
  {
    fullName: 'Melchizedek Ofori Addae',
    username: 'melchizedek',
    password: 'M3lch#Z9x',
    territory: 'Kaneshie',
    stores: [
      ['Melcom Lifestyle', 'North Kaneshie', 'Monday,Wednesday,Saturday'],
      ['Melcom Lapaz', 'Lapaz', 'Tuesday'],
      ['Mix bless', 'Ablekuma', 'Tuesday'],
      ['Melcom Ablekuma - Olebu', 'Olebu', 'Friday'],
    ],
  },
  {
    fullName: 'Jesse Mayne',
    username: 'jesse',
    password: 'J3ss3$B4n',
    territory: 'Accra Mall',
    stores: [
      ['Melcom Accra Mall', 'Accra Mall', 'Monday,Wednesday,Friday'],
      ['Maxmart Cantoment', 'Cantoment', 'Thursday'],
      ['Gafi Supermarket', 'Burma Camp', 'Thursday'],
      ['China Mall Action', 'Spintex', 'Tuesday'],
      ['Melcom Labone Mini', 'Labone', 'Friday'],
    ],
  },
  {
    fullName: 'Priscilla Amevor',
    username: 'priscillaa',
    password: 'Pr1sA#H7m',
    territory: 'Takoradi',
    stores: [
      ['Shoprite Takoradi', 'Takoradi', 'Monday,Wednesday'],
      ['Home City Panda Mart', 'Takoradi', 'Friday'],
      ['Melcom Takoradi', 'Takoradi', 'Tuesday,Thursday'],
    ],
  },
  {
    fullName: 'Priscilla Dadzie',
    username: 'priscillad',
    password: 'Pr1sD$K3w',
    territory: 'Kumasi',
    stores: [
      ['Shoprite Kumasi Mall', 'Asokwa', 'Monday,Wednesday'],
      ['Melcom Asokwa Mall', 'Asokwa', 'Monday,Wednesday'],
      ['Melcom Santasi', 'Santasi', 'Tuesday,Saturday'],
      ['China Mall Kumasi', 'Atonsu', 'Tuesday'],
      ['Melcom Ahodwo', 'Ahodwo', 'Tuesday,Saturday'],
      ['Melcom Manhyia', 'Manhyia', 'Thursday'],
    ],
  },
  {
    fullName: 'Samira Fuseini',
    username: 'samira',
    password: 'S@m1ra#Y5',
    territory: 'Tamale',
    stores: [['Melcom Tamale', 'Tamale', 'Monday - Friday']],
  },
  {
    fullName: 'Sandra Owusu Boateng',
    username: 'sandra',
    password: 'S@ndr4!Q8',
    territory: 'Spintex',
    stores: [
      ['Shoprite Junction Mall', 'Nungua Barrier', 'Tuesday,Friday'],
      ['Baatsonaa Melcom Mini', 'Baatsona', 'Monday'],
      ['Melcom Lashibi', 'Lashibi', 'Thursday'],
      ['NN Ventures', 'Lashibi', 'Thursday'],
      ['Bargains', 'Estate Junction Spintex', 'Monday'],
      ['Marina Baatsonaa', 'Baatsona', 'Wednesday'],
    ],
  },
  {
    fullName: 'Yvonne Serwa Amoani',
    username: 'yvonne',
    password: 'Yv0nne#T2',
    territory: 'Adenta',
    stores: [
      ['Melcom Frafraha', 'Adenta Frafraha', 'Monday'],
      ['China Shopping Park', 'Adenta-Dodowa Road', 'Tuesday'],
      ['Melcom Ashaley Botwe Mini', 'Ashaley Botwe', 'Friday'],
      ['Melcom Adenta', 'Adenta Housing', 'Wednesday'],
      ['Marina Adenta', 'Adenta', 'Thursday'],
    ],
  },
  {
    fullName: 'Ayisha Alhassan',
    username: 'ayisha',
    password: 'Ay1sha$N6',
    territory: 'Airport',
    stores: [
      ['Shoprite Accra Mall', 'Accra Mall', 'Monday,Wednesday,Friday'],
      ['Melcom Airport Mini', 'Airport', 'Thursday'],
      ['Maxmart Airport', 'Airport', 'Thursday'],
      ['Max Mart 37', '37', 'Tuesday'],
      ['Kwik Mart', 'Dzorwulu', 'Tuesday'],
    ],
  },
];

async function seedMerchandisers() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI missing. Check server/.env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const credentials = [];
    let storeIndex = 0;

    for (const m of MERCH_DATA) {
      let user = await User.findOne({ username: m.username });

      if (!user) {
        user = await User.create({
          username: m.username,
          password: m.password,
          fullName: m.fullName,
          role: 'merchandiser',
          territory: m.territory,
          distributor: 'Nivea Ghana',
          isActive: true,
        });
        console.log(`✅ Created: ${m.username}`);
      } else {
        user.password = m.password; // force new strong password
        user.fullName = m.fullName;
        user.role = 'merchandiser';
        user.territory = m.territory;
        user.isActive = true;
        await user.save();
        console.log(`↻ Password reset: ${m.username}`);
      }

      credentials.push(m);

      for (const [storeName, location, daysText] of m.stores) {
        storeIndex += 1;
        const days = parseDays(daysText);
        const loc = coordsFor(location, storeIndex);

        let outlet = await Outlet.findOne({ assignedTo: user._id, name: storeName });
        if (!outlet) {
          await Outlet.create({
            userId: user._id,
            assignedTo: user._id,
            createdBy: 'Seed Script',
            name: storeName,
            address: location,
            territory: location,
            distributor: 'Nivea Ghana',
            location: loc,
            status: 'approved',
            assignedDays: days.length ? days : [1, 2, 3, 4, 5],
            approvedBy: 'Seed Script',
            approvedAt: new Date(),
            isActive: true,
          });
        } else {
          outlet.assignedDays = days.length ? days : outlet.assignedDays;
          outlet.status = 'approved';
          outlet.isActive = true;
          await outlet.save();
        }
      }
    }

    console.log('\n========== MERCHANDISER CREDENTIALS (keep private) ==========');
    for (const c of credentials) {
      console.log(`${c.fullName.padEnd(28)}  ${c.username.padEnd(14)}  ${c.password}`);
    }
    console.log('==============================================================');
    console.log('✅ Strong passwords applied');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seedMerchandisers();
