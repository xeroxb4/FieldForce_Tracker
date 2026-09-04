import Visit from '../models/Visit.js';
import Outlet from '../models/Outlet.js';

// Top 10 priority products (match by name contains, case-insensitive)
export const TOP10_PRODUCTS = [
  'Nivea Nourishing Cocoa',
  'Nivea Perfect and Radiant',
  'Nivea Rich Nourishing',
  'Nivea Dry Impact Roll',
  'Nivea Dry Comfort Roll',
  'Nivea Fresh Active Roll',
  'Nivea Fresh Energy Roll',
  'Nivea Invisible Black and White Men Roll',
  'Nivea Invisible Black and White Women Roll',
  'Nivea Fresh Pearl and Beauty Roll',
];

// Also accept shorter aliases from seed names
const TOP10_ALIASES = [
  ['nourishing cocoa'],
  ['perfect and radiant'],
  ['rich nourishing'],
  ['dry impact'],
  ['dry comfort'],
  ['fresh active'],
  ['fresh energy'],
  ['black and white men'],
  ['black and white women'],
  ['pearl and beauty'],
];

function matchesTop10(productName) {
  if (!productName) return -1;
  const n = productName.toLowerCase();
  for (let i = 0; i < TOP10_ALIASES.length; i++) {
    if (TOP10_ALIASES[i].some((a) => n.includes(a))) return i;
  }
  return -1;
}

function getTodayDayNumber() {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

/**
 * Incentive KPIs for logged-in OMR
 * Query: ?date=YYYY-MM-DD (optional, default today)
 *        also returns MTD block for current month
 */
export const getIncentiveBreakdown = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const month = date.slice(0, 7);
    const dayNum = (() => {
      const d = new Date(date + 'T12:00:00');
      const n = d.getDay();
      return n === 0 ? 7 : n;
    })();

    // Beat outlets for that weekday
    const beatOutlets = await Outlet.find({
      assignedTo: req.user._id,
      status: 'approved',
      isActive: true,
      assignedDays: dayNum,
    });
    const beatTotal = beatOutlets.length;
    const beatNames = new Set(beatOutlets.map((o) => o.name.toLowerCase()));

    // Visits for the day
    const dayVisits = await Visit.find({
      userId: req.user._id,
      date,
    });

    // Coverage: unique beat outlets visited / beat total
    const visitedBeatNames = new Set(
      dayVisits
        .filter((v) => beatNames.has(v.shopName.toLowerCase()))
        .map((v) => v.shopName.toLowerCase())
    );
    // Also count by outletId
    const visitedOutletIds = new Set(
      dayVisits.filter((v) => v.outletId).map((v) => v.outletId.toString())
    );
    let covered = 0;
    for (const o of beatOutlets) {
      if (
        visitedOutletIds.has(o._id.toString()) ||
        visitedBeatNames.has(o.name.toLowerCase())
      ) {
        covered += 1;
      }
    }
    const coveragePct = beatTotal > 0 ? Math.round((covered / beatTotal) * 1000) / 10 : 0;

    // Productive call = Order Placed with at least 1 line item OR amount > 0
    const isProductive = (v) =>
      v.outcome === 'Order Placed' &&
      ((Array.isArray(v.lineItems) && v.lineItems.length > 0) || (v.amount || 0) > 0);

    const productiveVisits = dayVisits.filter(isProductive);
    const productiveCalls = productiveVisits.length;
    const totalCalls = dayVisits.length;

    // Hit rate = productive / visits (calls made)
    const hitRatePct =
      totalCalls > 0 ? Math.round((productiveCalls / totalCalls) * 1000) / 10 : 0;

    // Productivity % = productive / beat outlets (or visits) — use productive/visits as productivity
    const productivityPct =
      totalCalls > 0 ? Math.round((productiveCalls / totalCalls) * 1000) / 10 : 0;

    // LPPC = total product lines sold / productive calls
    // A "line" = unique SKU line on an order (each lineItem counts)
    let totalLines = 0;
    for (const v of productiveVisits) {
      if (Array.isArray(v.lineItems) && v.lineItems.length > 0) {
        totalLines += v.lineItems.length;
      } else if (v.products) {
        // fallback: count comma-separated
        totalLines += v.products.split(',').filter(Boolean).length || 1;
      } else {
        totalLines += 1;
      }
    }
    const lppc =
      productiveCalls > 0 ? Math.round((totalLines / productiveCalls) * 100) / 100 : 0;

    // Top 10 penetration — which of top 10 appeared in at least one sale today
    const hitTop10 = new Array(10).fill(false);
    for (const v of productiveVisits) {
      const items = v.lineItems || [];
      if (items.length) {
        for (const li of items) {
          const idx = matchesTop10(li.productName);
          if (idx >= 0) hitTop10[idx] = true;
        }
      } else if (v.products) {
        const idx = matchesTop10(v.products);
        if (idx >= 0) hitTop10[idx] = true;
      }
    }
    const top10HitCount = hitTop10.filter(Boolean).length;
    const top10Pct = Math.round((top10HitCount / 10) * 1000) / 10;

    // ——— MTD (month to date) ———
    const mtdStart = `${month}-01`;
    const mtdVisits = await Visit.find({
      userId: req.user._id,
      date: { $gte: mtdStart, $lte: date },
    });
    const mtdProductive = mtdVisits.filter(isProductive);
    const mtdCalls = mtdVisits.length;
    const mtdProdCalls = mtdProductive.length;
    let mtdLines = 0;
    const mtdTop10 = new Array(10).fill(false);
    for (const v of mtdProductive) {
      const items = v.lineItems || [];
      if (items.length) {
        mtdLines += items.length;
        for (const li of items) {
          const idx = matchesTop10(li.productName);
          if (idx >= 0) mtdTop10[idx] = true;
        }
      } else {
        mtdLines += 1;
        const idx = matchesTop10(v.products || '');
        if (idx >= 0) mtdTop10[idx] = true;
      }
    }
    const mtdLppc =
      mtdProdCalls > 0 ? Math.round((mtdLines / mtdProdCalls) * 100) / 100 : 0;
    const mtdHitRate =
      mtdCalls > 0 ? Math.round((mtdProdCalls / mtdCalls) * 1000) / 10 : 0;
    const mtdTop10Count = mtdTop10.filter(Boolean).length;

    res.json({
      date,
      month,
      definitions: {
        productiveCall:
          'Outlet bought at least one piece of any Nivea SKU (not the full range required)',
        coverage: 'Must visit every beat outlet (buy or no buy) — target 100%',
        hitRate: 'Productive calls ÷ total visits',
        lppc: 'Product lines sold ÷ productive calls',
        top10: 'Share of the 10 priority SKUs sold at least once in the period',
      },
      day: {
        beatOutlets: beatTotal,
        outletsVisited: covered,
        coveragePct,
        coverageTarget: 100,
        totalVisits: totalCalls,
        productiveCalls,
        productivityPct,
        hitRatePct,
        totalLines,
        lppc,
        top10HitCount,
        top10Pct,
        top10Detail: TOP10_PRODUCTS.map((name, i) => ({
          name,
          sold: hitTop10[i],
        })),
      },
      mtd: {
        totalVisits: mtdCalls,
        productiveCalls: mtdProdCalls,
        hitRatePct: mtdHitRate,
        lppc: mtdLppc,
        top10HitCount: mtdTop10Count,
        top10Pct: Math.round((mtdTop10Count / 10) * 1000) / 10,
        top10Detail: TOP10_PRODUCTS.map((name, i) => ({
          name,
          sold: mtdTop10[i],
        })),
      },
    });
  } catch (error) {
    console.error('Incentive breakdown error:', error);
    res.status(500).json({ message: 'Failed to load incentive breakdown' });
  }
};
