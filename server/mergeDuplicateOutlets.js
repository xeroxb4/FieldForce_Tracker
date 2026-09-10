/**
 * Merge duplicate outlets per OMR and re-point visits to a single outlet.
 *
 * Rules:
 * - Same shop (fuzzy name match) under the same OMR → ONE outlet
 * - Prefer the "new app" outlet (not created by import-old-app) when both exist
 * - Keep that outlet's beat days (do NOT add old-import days)
 * - Move all visits onto the kept outlet (update outletId + shopName)
 * - Delete the duplicate outlet record(s)
 *
 * Usage:  node mergeDuplicateOutlets.js
 * Dry run: node mergeDuplicateOutlets.js --dry
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Outlet from './models/Outlet.js';
import Visit from './models/Visit.js';
import User from './models/User.js';

dotenv.config();

const DRY = process.argv.includes('--dry');

/** Normalize shop names for matching */
function norm(name) {
  return String(name || '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\b(ENTERPRISE|ENTERPRISES|COSMETICS|COSMETIC|SHOP|LTD|LIMITED|CO|COMPANY|VENTURES|STORE|STORES|TRADING|ENT)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract trailing shop number if present (SHOP 1, 2, etc.) */
function shopNumber(n) {
  const m = String(n || '').toUpperCase().match(/\b(?:SHOP\s*)?(\d+)\s*$/);
  return m ? m[1] : null;
}

/**
 * Token set similarity — conservative so we do NOT merge:
 *  Grace Cosmetics ≠ Grace Universal Shop 1 ≠ Grace Universal Shop 2
 */
function similar(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  // Different shop numbers = different outlets
  const numA = shopNumber(a);
  const numB = shopNumber(b);
  if (numA && numB && numA !== numB) return false;
  // One has a shop number and the other doesn't with different extra words — careful
  if ((numA || numB) && na !== nb) {
    // allow only if core without number is identical
    const strip = (s) => s.replace(/\bSHOP\s*\d+\b/g, '').replace(/\b\d+\b/g, '').replace(/\s+/g, ' ').trim();
    if (strip(na) !== strip(nb)) return false;
  }

  // Exact after norm
  if (na === nb) return true;

  // Containment only if lengths close (avoid Grace Cosmetics ⊂ Grace Universal…)
  if (na.length >= 5 && nb.length >= 5) {
    if (na.includes(nb) || nb.includes(na)) {
      const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
      if (ratio >= 0.75) return true;
    }
  }

  const ta = new Set(na.split(' ').filter((t) => t.length > 2));
  const tb = new Set(nb.split(' ').filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return false;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = new Set([...ta, ...tb]).size;
  const jaccard = inter / union;

  // Require high overlap AND same token count roughly
  if (jaccard >= 0.85 && inter >= 2) return true;
  // Single distinctive token (CINAPET) only when both sides short
  if (ta.size === 1 && tb.size === 1 && inter === 1) return true;
  if (jaccard >= 0.8 && inter >= 1 && Math.abs(ta.size - tb.size) <= 1) return true;
  return false;
}

/** Explicit aliases (same shop, different spelling) */
const ALIASES = [
  ['CINAPET', 'CINAPET'],
  ['AMIKAY', 'AMINKAY'],
  ['AMINKAY', 'AMIKAY'],
];

function aliasMatch(a, b) {
  const na = norm(a);
  const nb = norm(b);
  for (const [x, y] of ALIASES) {
    if ((na.includes(x) && nb.includes(y)) || (na.includes(y) && nb.includes(x))) {
      // still respect shop numbers
      const numA = shopNumber(a);
      const numB = shopNumber(b);
      if (numA && numB && numA !== numB) return false;
      return true;
    }
  }
  return false;
}

function preferKeep(a, b) {
  // Prefer non-import, verified GPS, photo, more assigned days, longer proper name
  const score = (o) => {
    let s = 0;
    if (o.approvedBy !== 'import-old-app' && o.createdBy !== 'import-old-app') s += 50;
    if (o.locationVerified) s += 20;
    if (o.photo) s += 10;
    if ((o.assignedDays || []).length) s += 5 * (o.assignedDays || []).length;
    if (o.contactPhone) s += 3;
    if (o.avcEnrolled) s += 5;
    s += Math.min(String(o.name || '').length, 40) / 10;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

async function mergeGroup(outlets) {
  // pick keeper
  let keep = outlets[0];
  for (let i = 1; i < outlets.length; i++) {
    keep = preferKeep(keep, outlets[i]);
  }
  const drop = outlets.filter((o) => String(o._id) !== String(keep._id));
  if (!drop.length) return { merged: 0, visitsMoved: 0 };

  let visitsMoved = 0;
  for (const d of drop) {
    const res = await Visit.updateMany(
      { outletId: d._id },
      {
        $set: {
          outletId: keep._id,
          shopName: keep.displayName || keep.name,
        },
      }
    );
    visitsMoved += res.modifiedCount || 0;

    // Also fix visits that only match by name under same user (no outletId)
    const nameRes = await Visit.updateMany(
      {
        userId: keep.assignedTo || keep.userId,
        outletId: { $in: [null, undefined] },
        shopName: new RegExp(
          '^' +
            String(d.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
            '$',
          'i'
        ),
      },
      {
        $set: {
          outletId: keep._id,
          shopName: keep.displayName || keep.name,
        },
      }
    );
    visitsMoved += nameRes.modifiedCount || 0;

    if (!DRY) {
      await Outlet.deleteOne({ _id: d._id });
    }
    console.log(
      `  MERGE "${d.name}" → "${keep.name}"  (visits moved ~${res.modifiedCount})` +
        (DRY ? ' [dry]' : '')
    );
  }

  // Ensure visits that used either name now point to keep
  if (!DRY) {
    const names = outlets.map((o) => o.name);
    for (const n of names) {
      await Visit.updateMany(
        {
          userId: keep.assignedTo || keep.userId,
          shopName: new RegExp(
            '^' + String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
            'i'
          ),
        },
        {
          $set: {
            outletId: keep._id,
            shopName: keep.displayName || keep.name,
          },
        }
      );
    }
  }

  return { merged: drop.length, visitsMoved };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected', DRY ? '(DRY RUN — no deletes)' : '(LIVE)');

  const omrs = await User.find({ role: 'omr', isActive: { $ne: false } });
  let totalMerged = 0;
  let totalVisits = 0;

  for (const omr of omrs) {
    const outlets = await Outlet.find({
      $or: [{ assignedTo: omr._id }, { userId: omr._id }],
      isActive: { $ne: false },
    });
    if (outlets.length < 2) continue;

    // Build clusters
    const used = new Set();
    const groups = [];
    for (let i = 0; i < outlets.length; i++) {
      if (used.has(String(outlets[i]._id))) continue;
      const group = [outlets[i]];
      used.add(String(outlets[i]._id));
      for (let j = i + 1; j < outlets.length; j++) {
        if (used.has(String(outlets[j]._id))) continue;
        if (group.some((g) => similar(g.name, outlets[j].name) || aliasMatch(g.name, outlets[j].name))) {
          group.push(outlets[j]);
          used.add(String(outlets[j]._id));
        }
      }
      if (group.length > 1) groups.push(group);
    }

    if (!groups.length) continue;
    console.log(`\n${omr.fullName} (@${omr.username}) — ${groups.length} duplicate group(s)`);

    for (const g of groups) {
      console.log('  Group:', g.map((o) => o.name).join(' | '));
      const { merged, visitsMoved } = await mergeGroup(g);
      totalMerged += merged;
      totalVisits += visitsMoved;
    }
  }

  // Second pass: link orphan visits (matched by shop name) to outlets
  if (!DRY) {
    const visits = await Visit.find({
      $or: [{ outletId: null }, { outletId: { $exists: false } }],
    }).limit(5000);
    let linked = 0;
    for (const v of visits) {
      const outlet = await Outlet.findOne({
        $or: [{ assignedTo: v.userId }, { userId: v.userId }],
        name: new RegExp(
          '^' + String(v.shopName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
          'i'
        ),
      });
      if (outlet) {
        v.outletId = outlet._id;
        await v.save();
        linked += 1;
      }
    }
    console.log(`\nLinked orphan visits to outlets: ${linked}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log('Duplicate outlets removed:', totalMerged);
  console.log('Visit rows re-pointed:', totalVisits);
  console.log(DRY ? 'Dry run only — re-run without --dry to apply.' : 'Done. Refresh beats / outlet sales.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
