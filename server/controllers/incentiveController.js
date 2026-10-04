import Visit from "../models/Visit.js";
import Outlet from "../models/Outlet.js";

// Top 10 priority products (updated list)
export const TOP10_PRODUCTS = [
  "Nivea Nourishing Cocoa",
  "Nivea Perfect and Radiant",
  "Nivea Rich Nourishing",
  "Nivea Radiant and Beauty (Even Glow)",
  "Nivea Firming Q10",
  "Nivea Dry Impact Roll",
  "Nivea Dry Comfort Roll",
  "Nivea Black and White Men Roll",
  "Nivea Black and White Women Roll",
  "Nivea Pearl and Beauty Roll",
];

const TOP10_ALIASES = [
  ["nourishing cocoa"],
  ["perfect and radiant"],
  ["rich nourishing"],
  ["even glow", "radiant and beauty (even"],
  ["firming q10", "q10"],
  ["dry impact"],
  ["dry comfort"],
  ["black and white men"],
  ["black and white women"],
  ["pearl and beauty"],
];

export function matchesTop10(productName) {
  if (!productName) return -1;
  const n = productName.toLowerCase();
  for (let i = 0; i < TOP10_ALIASES.length; i++) {
    if (TOP10_ALIASES[i].some((a) => n.includes(a))) return i;
  }
  return -1;
}

/**
 * Top 10 metrics from productive visits:
 * - unique / penetration: checklist of 10 sold at least once (current rule)
 * - lineTotal: sum of Top 10 lines per bill (7+4+8=19)
 * - lineAvg: average Top 10 lines per productive call
 */
export function computeTop10Metrics(productiveVisits) {
  const hitFlags = new Array(10).fill(false);
  let lineTotal = 0;

  for (const v of productiveVisits) {
    const onThisBill = new Set();
    const items = Array.isArray(v.lineItems) ? v.lineItems : [];
    if (items.length) {
      for (const li of items) {
        const idx = matchesTop10(li.productName || li.name || "");
        if (idx >= 0) {
          hitFlags[idx] = true;
          onThisBill.add(idx);
        }
      }
    } else if (v.products) {
      // Fallback: scan product string for each top10 alias
      const text = String(v.products);
      for (let i = 0; i < 10; i++) {
        const idx = matchesTop10(text);
        // check each product by splitting
      }
      for (const part of text.split(",")) {
        const idx = matchesTop10(part.trim());
        if (idx >= 0) {
          hitFlags[idx] = true;
          onThisBill.add(idx);
        }
      }
    }
    lineTotal += onThisBill.size;
  }

  const productiveCalls = productiveVisits.length;
  const hitCount = hitFlags.filter(Boolean).length;
  const pct = Math.round((hitCount / 10) * 1000) / 10;
  const lineAvg =
    productiveCalls > 0 ? Math.round((lineTotal / productiveCalls) * 100) / 100 : 0;

  return {
    hitFlags,
    hitCount,
    pct,
    lineTotal,
    lineAvg,
    detail: TOP10_PRODUCTS.map((name, i) => ({
      name,
      sold: hitFlags[i],
    })),
  };
}

export const getIncentiveBreakdown = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const month = date.slice(0, 7);
    const dayNum = (() => {
      const d = new Date(date + "T12:00:00");
      const n = d.getDay();
      return n === 0 ? 7 : n;
    })();

    const beatOutlets = await Outlet.find({
      assignedTo: req.user._id,
      status: "approved",
      isActive: true,
      assignedDays: dayNum,
    });
    const beatTotal = beatOutlets.length;
    const beatNames = new Set(beatOutlets.map((o) => o.name.toLowerCase()));

    const dayVisits = await Visit.find({
      userId: req.user._id,
      date,
    });

    const visitedBeatNames = new Set(
      dayVisits
        .filter((v) => beatNames.has(String(v.shopName || "").toLowerCase()))
        .map((v) => String(v.shopName).toLowerCase())
    );
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
    const coveragePct =
      beatTotal > 0 ? Math.round((covered / beatTotal) * 1000) / 10 : 0;

    const isProductive = (v) =>
      v.outcome === "Order Placed" &&
      ((Array.isArray(v.lineItems) && v.lineItems.length > 0) || (v.amount || 0) > 0);

    const productiveVisits = dayVisits.filter(isProductive);
    const productiveCalls = productiveVisits.length;
    const totalCalls = dayVisits.length;

    // Hit rate = productive ÷ planned beat outlets (e.g. 5/10)
    const hitRatePct =
      beatTotal > 0 ? Math.round((productiveCalls / beatTotal) * 1000) / 10 : 0;
    // Conversion of visits made (kept for reference; not the main "Hit rate")
    const visitConversionPct =
      totalCalls > 0 ? Math.round((productiveCalls / totalCalls) * 1000) / 10 : 0;
    // Productivity % = productive ÷ (70% of planned) — achievement vs productive target
    const PRODUCTIVITY_FACTOR = 0.7;
    const productivityTarget =
      beatTotal > 0 ? Math.round(beatTotal * PRODUCTIVITY_FACTOR * 10) / 10 : 0;
    const productivityPct =
      productivityTarget > 0
        ? Math.round((productiveCalls / productivityTarget) * 1000) / 10
        : 0;

    let totalLines = 0;
    for (const v of productiveVisits) {
      if (Array.isArray(v.lineItems) && v.lineItems.length > 0) {
        totalLines += v.lineItems.length;
      } else if (v.products) {
        totalLines += v.products.split(",").filter(Boolean).length || 1;
      } else {
        totalLines += 1;
      }
    }
    const lppc =
      productiveCalls > 0 ? Math.round((totalLines / productiveCalls) * 100) / 100 : 0;

    const dayTop = computeTop10Metrics(productiveVisits);

    const mtdStart = `${month}-01`;
    const mtdVisits = await Visit.find({
      userId: req.user._id,
      date: { $gte: mtdStart, $lte: date },
    });
    const mtdProductive = mtdVisits.filter(isProductive);
    const mtdCalls = mtdVisits.length;
    const mtdProdCalls = mtdProductive.length;
    let mtdLines = 0;
    for (const v of mtdProductive) {
      if (Array.isArray(v.lineItems) && v.lineItems.length > 0) {
        mtdLines += v.lineItems.length;
      } else {
        mtdLines += 1;
      }
    }
    const mtdLppc =
      mtdProdCalls > 0 ? Math.round((mtdLines / mtdProdCalls) * 100) / 100 : 0;
    // MTD universe = approved outlets assigned to this OMR
    const universeOutlets = await Outlet.countDocuments({
      assignedTo: req.user._id,
      status: "approved",
      isActive: true,
    });
    // Hit rate MTD = productive ÷ universe (same logic as day: productive ÷ planned)
    const mtdHitRate =
      universeOutlets > 0
        ? Math.round((mtdProdCalls / universeOutlets) * 1000) / 10
        : 0;
    const mtdVisitConversion =
      mtdCalls > 0 ? Math.round((mtdProdCalls / mtdCalls) * 1000) / 10 : 0;
    const mtdProductivityTarget =
      universeOutlets > 0
        ? Math.round(universeOutlets * PRODUCTIVITY_FACTOR * 10) / 10
        : 0;
    const mtdProductivityPct =
      mtdProductivityTarget > 0
        ? Math.round((mtdProdCalls / mtdProductivityTarget) * 1000) / 10
        : 0;
    const mtdTop = computeTop10Metrics(mtdProductive);

    res.json({
      date,
      month,
      definitions: {
        productiveCall:
          "Outlet bought at least one piece of any Nivea SKU (not the full range required)",
        coverage:
          "Visits ÷ planned beat outlets (e.g. 8/10) — must visit every beat outlet, target 100%",
        hitRate:
          "Productive calls ÷ planned beat outlets (e.g. 5/10) — productive coverage / strike vs plan",
        visitConversion:
          "Productive calls ÷ visits actually done (e.g. 5/8)",
        productivity:
          "Productive calls ÷ (70% of planned beat outlets) — achievement vs productive target",
        lppc: "Product lines sold ÷ productive calls",
        top10Penetration:
          "Share of the 10 priority SKUs sold at least once in the period (checklist)",
        top10Count:
          "Sum of Top 10 lines across productive bills (e.g. 7+4+8 = 19)",
        top10Average:
          "Average Top 10 lines per productive call (e.g. 19÷3 = 6.33)",
      },
      day: {
        beatOutlets: beatTotal,
        outletsVisited: covered,
        coveragePct,
        coverageTarget: 100,
        totalVisits: totalCalls,
        productiveCalls,
        productivityTarget,
        productivityFactor: PRODUCTIVITY_FACTOR,
        productivityPct,
        hitRatePct,
        visitConversionPct,
        totalLines,
        lppc,
        // Existing rule (checklist)
        top10HitCount: dayTop.hitCount,
        top10Pct: dayTop.pct,
        top10Detail: dayTop.detail,
        // New: sum + average
        top10LineTotal: dayTop.lineTotal,
        top10LineAvg: dayTop.lineAvg,
      },
      mtd: {
        totalVisits: mtdCalls,
        productiveCalls: mtdProdCalls,
        universeOutlets,
        productivityTarget: mtdProductivityTarget,
        productivityPct: mtdProductivityPct,
        hitRatePct: mtdHitRate,
        lppc: mtdLppc,
        top10HitCount: mtdTop.hitCount,
        top10Pct: mtdTop.pct,
        top10Detail: mtdTop.detail,
        top10LineTotal: mtdTop.lineTotal,
        top10LineAvg: mtdTop.lineAvg,
      },
    });
  } catch (error) {
    console.error("Incentive breakdown error:", error);
    res.status(500).json({ message: "Failed to load incentive breakdown" });
  }
};
