/**
 * Import old Daily Sales app data into FieldForce Tracker.
 * - Assigns distributor / territory on OMR users
 * - Upserts outlets + beat day from DayOfWeek
 * - Backdates visits/sales (skips duplicates)
 *
 * Usage:
 *   cd server
 *   node importOldOmrData.js
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from './models/User.js';
import Outlet from './models/Outlet.js';
import Visit from './models/Visit.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

const DAY_MAP = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

/** Map export rep names → app username */
const REP_MAP = {
  'BASMAH ALI': 'basmah',
  BASMAH: 'basmah',
  'CHRISTINA SEFAH': 'christina',
  'DORIS ASAMOAH': 'doris',
  'MARILYN ETORNAM': 'marilyn',
  'MARILYN ETORNAM AMEKUDZI': 'marilyn',
  'RAFAEL AHIABLE': 'rafael',
  'RAPHAEL AHIABLE': 'rafael',
  'REUBEN KYEI': 'reuben',
  'REUBEN KTEI': 'reuben',
  'RICHARD KORLI': 'richard',
  RICHARD: 'richard',
  'SAMIRA NASARA': 'samiran',
  'SAMUEL ARYEETEY': 'samuel',
  'MARY OWUSU': 'mary',
  'SANDRA OWUSU': 'sandramo',
  'EVELYN OKYERE': 'evelyn',
};

function normName(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeDistributor(d) {
  const s = String(d || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower.includes('daniel')) return 'Daniel Adjei';
  if (lower.includes('amata')) return 'Amata';
  if (lower.includes('ernie')) return 'Ernievero';
  if (lower.includes('daddy')) return 'Daddy Ash';
  if (lower.includes('nivea') || lower.includes('imperial')) return 'Imperial';
  return s;
}

function parseProducts(productsStr, totalAmount) {
  if (!productsStr || !String(productsStr).trim()) return [];
  const parts = String(productsStr).split(';').map((p) => p.trim()).filter(Boolean);
  const lines = [];
  for (const part of parts) {
    // e.g. Dry Impact x90 (GH₵1395)
    const m = part.match(/^(.+?)\s+x(\d+)\s*\(GH[S₵]?([\d.]+)\)/i);
    if (m) {
      const qty = Number(m[2]);
      const lineTotal = Number(m[3]);
      const unitPrice = qty ? lineTotal / qty : 0;
      lines.push({
        productName: m[1].trim(),
        unit: 'pc',
        quantity: qty,
        unitPrice,
        lineTotal,
      });
    }
  }
  if (!lines.length && totalAmount > 0) {
    lines.push({
      productName: productsStr.slice(0, 120),
      unit: 'pc',
      quantity: 1,
      unitPrice: totalAmount,
      lineTotal: totalAmount,
    });
  }
  return lines;
}

function mapOutcome(o) {
  const s = String(o || '').trim();
  if (/order/i.test(s)) return 'Order Placed';
  if (/collect/i.test(s)) return 'Follow Up';
  if (/closed/i.test(s)) return 'Shop Closed';
  return 'No Order';
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = [];
    let cur = '';
    let inQ = false;
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === ',' && !inQ) {
        cols.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    cols.push(cur);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] || '').trim();
    });
    rows.push(obj);
  }
  return rows;
}

function loadCsvRows() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.csv') && f.includes('shop_visits'));
  const all = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
    const rows = parseCsv(text);
    all.push(...rows);
    console.log('Loaded', f, rows.length, 'rows');
  }
  const seen = new Set();
  const uniq = [];
  for (const r of all) {
    const k = [
      r.Date,
      normName(r.Rep),
      normName(r.Shop),
      r.TotalAmount,
      r.StartTime || '',
    ].join('|');
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(r);
  }
  console.log('Unique visits after dedupe:', uniq.length);
  return uniq;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const rows = loadCsvRows();
  const users = await User.find({ role: 'omr' });
  const byUsername = Object.fromEntries(users.map((u) => [u.username.toLowerCase(), u]));

  let usersUpdated = 0;
  let outletsCreated = 0;
  let outletsUpdated = 0;
  let visitsCreated = 0;
  let visitsSkipped = 0;
  let unmapped = new Set();

  // Prefer distributor/territory from rows that have them
  const distVotes = {}; // username -> Counter
  const terrVotes = {};

  for (const r of rows) {
    const key = normName(r.Rep);
    const username = REP_MAP[key];
    if (!username) {
      unmapped.add(r.Rep);
      continue;
    }
    const user = byUsername[username];
    if (!user) {
      unmapped.add(r.Rep + ' (no user ' + username + ')');
      continue;
    }

    const dist = normalizeDistributor(r.Distributor);
    const terr = String(r.Territory || '').trim();
    if (dist) {
      distVotes[username] = distVotes[username] || {};
      distVotes[username][dist] = (distVotes[username][dist] || 0) + 1;
    }
    if (terr) {
      terrVotes[username] = terrVotes[username] || {};
      terrVotes[username][terr] = (terrVotes[username][terr] || 0) + 1;
    }
  }

  for (const username of Object.keys(byUsername)) {
    const user = byUsername[username];
    let changed = false;
    if (distVotes[username]) {
      const best = Object.entries(distVotes[username]).sort((a, b) => b[1] - a[1])[0][0];
      if (!user.distributor || user.distributor === 'Nivea Ghana') {
        user.distributor = best;
        changed = true;
      }
    }
    if (terrVotes[username] && !user.territory) {
      const best = Object.entries(terrVotes[username]).sort((a, b) => b[1] - a[1])[0][0];
      user.territory = best;
      changed = true;
    }
    if (changed) {
      await user.save();
      usersUpdated += 1;
      console.log('User updated', user.fullName, '→', user.distributor, user.territory);
    }
  }

  for (const r of rows) {
    const key = normName(r.Rep);
    const username = REP_MAP[key];
    if (!username || !byUsername[username]) continue;
    const user = byUsername[username];
    const shop = String(r.Shop || '').trim();
    if (!shop) continue;

    const dayName = String(r.DayOfWeek || '').toLowerCase();
    const dayNum = DAY_MAP[dayName];
    const dist = normalizeDistributor(r.Distributor) || user.distributor || '';
    const terr = String(r.Territory || '').trim() || user.territory || '';

    // Upsert outlet (match assignedTo + name case-insensitive)
    let outlet = await Outlet.findOne({
      assignedTo: user._id,
      name: new RegExp('^' + shop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
    });
    if (!outlet) {
      outlet = await Outlet.create({
        name: shop,
        contactName: r.Contact || '',
        contactPhone: r.ContactPhone || '',
        address: terr,
        territory: terr,
        distributor: dist,
        location: { lat: 5.6037, lng: -0.187 },
        locationVerified: false,
        status: 'approved',
        isActive: true,
        assignedTo: user._id,
        userId: user._id,
        createdBy: user.fullName || user.username,
        approvedBy: "import-old-app",
        approvedAt: new Date(),
        assignedDays: dayNum ? [dayNum] : [],
      });
      outletsCreated += 1;
    } else {
      let u = false;
      if (dayNum && !(outlet.assignedDays || []).includes(dayNum)) {
        outlet.assignedDays = [...new Set([...(outlet.assignedDays || []), dayNum])];
        u = true;
      }
      if (!outlet.distributor && dist) {
        outlet.distributor = dist;
        u = true;
      }
      if (outlet.status !== 'approved') {
        outlet.status = 'approved';
        u = true;
      }
      if (u) {
        await outlet.save();
        outletsUpdated += 1;
      }
    }

    const amount = Number(r.TotalAmount || 0) || 0;
    const date = r.Date;
    const outcome = mapOutcome(r.Outcome);

    // Skip duplicate visit
    const existing = await Visit.findOne({
      userId: user._id,
        createdBy: user.fullName || user.username,
        approvedBy: "import-old-app",
        approvedAt: new Date(),
      date,
      shopName: new RegExp('^' + shop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
      amount,
    });
    if (existing) {
      visitsSkipped += 1;
      continue;
    }

    const lineItems = parseProducts(r.Products, amount);
    const paymentType =
      String(r.PaymentMethod || '').toLowerCase().includes('credit') || r.DueDate
        ? 'credit'
        : amount > 0
        ? 'cash'
        : '';

    await Visit.create({
      userId: user._id,
        createdBy: user.fullName || user.username,
        approvedBy: "import-old-app",
        approvedAt: new Date(),
      repName: user.fullName,
      date,
      shopName: shop,
      outletId: outlet._id,
      contactName: r.Contact || '',
      contactPhone: r.ContactPhone || '',
      territory: terr,
      distributor: dist || user.distributor || '',
      outcome,
      noOrderReason: outcome === 'No Order' ? r.Reason || '' : '',
      products: r.Products || '',
      lineItems,
      amount,
      paymentType,
      notes: 'Imported from old app ' + (r.StartTime || ''),
    });
    visitsCreated += 1;
  }

  console.log('\n=== IMPORT SUMMARY ===');
  console.log('Users updated (distributor/territory):', usersUpdated);
  console.log('Outlets created:', outletsCreated);
  console.log('Outlets updated:', outletsUpdated);
  console.log('Visits created:', visitsCreated);
  console.log('Visits skipped (already present):', visitsSkipped);
  if (unmapped.size) {
    console.log('Unmapped reps:', [...unmapped]);
  }
  console.log('Done.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
