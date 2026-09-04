import ExcelJS from 'exceljs';
import User from '../models/User.js';
import Visit from '../models/Visit.js';
import Outlet from '../models/Outlet.js';
import MerchVisit from '../models/MerchVisit.js';
import { TOP10_PRODUCTS } from './incentiveController.js';

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

function isProductive(v) {
  return (
    v.outcome === 'Order Placed' &&
    ((Array.isArray(v.lineItems) && v.lineItems.length > 0) || (v.amount || 0) > 0)
  );
}

function lineCount(v) {
  if (Array.isArray(v.lineItems) && v.lineItems.length > 0) return v.lineItems.length;
  if (v.products) return v.products.split(',').filter(Boolean).length || 1;
  return v.amount > 0 ? 1 : 0;
}

function eachDate(start, end) {
  const dates = [];
  const d = new Date(start + 'T12:00:00');
  const last = new Date(end + 'T12:00:00');
  while (d <= last) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function dayNum(dateStr) {
  const n = new Date(dateStr + 'T12:00:00').getDay();
  return n === 0 ? 7 : n;
}

async function buildOmrRow(omr, startDate, endDate) {
  const visits = await Visit.find({
    userId: omr._id,
    date: { $gte: startDate, $lte: endDate },
  });

  const dates = eachDate(startDate, endDate);
  let beatOutletDays = 0;
  let coveredOutletDays = 0;
  const servicedOutletIds = new Set();
  const servicedNames = new Set();

  for (const ds of dates) {
    const dn = dayNum(ds);
    if (dn > 5) continue; // OMR Mon-Fri
    const beatOutlets = await Outlet.find({
      assignedTo: omr._id,
      status: 'approved',
      isActive: true,
      assignedDays: dn,
    });
    beatOutletDays += beatOutlets.length;
    const dayVisits = visits.filter((v) => v.date === ds);
    const visitedIds = new Set(dayVisits.filter((v) => v.outletId).map((v) => v.outletId.toString()));
    const visitedNames = new Set(dayVisits.map((v) => v.shopName.toLowerCase()));
    for (const o of beatOutlets) {
      if (visitedIds.has(o._id.toString()) || visitedNames.has(o.name.toLowerCase())) {
        coveredOutletDays += 1;
      }
    }
    for (const v of dayVisits) {
      if (v.outletId) servicedOutletIds.add(v.outletId.toString());
      servicedNames.add(v.shopName.toLowerCase());
    }
  }

  const productive = visits.filter(isProductive);
  const totalVisits = visits.length;
  const productiveCalls = productive.length;
  const totalSales = visits
    .filter((v) => v.outcome === 'Order Placed')
    .reduce((s, v) => s + (v.amount || 0), 0);
  const totalLines = productive.reduce((s, v) => s + lineCount(v), 0);
  const hitRate = totalVisits > 0 ? (productiveCalls / totalVisits) * 100 : 0;
  const productivity = totalVisits > 0 ? (productiveCalls / totalVisits) * 100 : 0;
  const lppc = productiveCalls > 0 ? totalLines / productiveCalls : 0;
  const coverage = beatOutletDays > 0 ? (coveredOutletDays / beatOutletDays) * 100 : 0;
  const avgLinesPerOutlet =
    servicedNames.size > 0 ? totalLines / servicedNames.size : 0;

  const top10 = new Array(10).fill(false);
  for (const v of productive) {
    for (const li of v.lineItems || []) {
      const idx = matchesTop10(li.productName);
      if (idx >= 0) top10[idx] = true;
    }
    if (!v.lineItems?.length && v.products) {
      const idx = matchesTop10(v.products);
      if (idx >= 0) top10[idx] = true;
    }
  }
  const top10Count = top10.filter(Boolean).length;
  const top10Pct = (top10Count / 10) * 100;

  // Per-SKU average penetration isn't one number — average of binary sold flags = top10Pct
  // "average penetration (all top 10 lines)" = top10Pct
  // Also per-product sold flag for columns

  return {
    fullName: omr.fullName,
    username: omr.username,
    territory: omr.territory || '',
    distributor: omr.distributor || '',
    totalSales: Math.round(totalSales * 100) / 100,
    totalVisits,
    productiveCalls,
    productivityPct: Math.round(productivity * 10) / 10,
    hitRatePct: Math.round(hitRate * 10) / 10,
    lppc: Math.round(lppc * 100) / 100,
    coveragePct: Math.round(coverage * 10) / 10,
    top10Count,
    top10Pct: Math.round(top10Pct * 10) / 10,
    avgTop10Penetration: Math.round(top10Pct * 10) / 10,
    avgLinesPerOutlet: Math.round(avgLinesPerOutlet * 100) / 100,
    totalOutletsServiced: servicedNames.size,
    totalLines,
    top10Flags: top10,
  };
}

export const exportOmrXlsx = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required (YYYY-MM-DD)' });
    }

    const omrs = await User.find({ role: 'omr', isActive: true }).sort({ fullName: 1 });
    const rows = [];
    for (const omr of omrs) {
      rows.push(await buildOmrRow(omr, startDate, endDate));
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'FieldForce Tracker';
    wb.created = new Date();

    // Summary sheet
    const ws = wb.addWorksheet('OMR Summary');
    const headers = [
      'OMR Name',
      'Username',
      'Territory',
      'Distributor',
      'Total Sales (GHS)',
      'Total Visits',
      'Productive Calls',
      'Productivity %',
      'Hit Rate %',
      'LPPC',
      'Coverage %',
      'Top 10 Count',
      'Top 10 Penetration %',
      'Avg Top 10 Penetration %',
      'Avg Lines / Outlet',
      'Total Outlets Serviced',
      'Total Product Lines',
      ...TOP10_PRODUCTS.map((n) => n),
    ];
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };

    for (const r of rows) {
      ws.addRow([
        r.fullName,
        r.username,
        r.territory,
        r.distributor,
        r.totalSales,
        r.totalVisits,
        r.productiveCalls,
        r.productivityPct,
        r.hitRatePct,
        r.lppc,
        r.coveragePct,
        r.top10Count,
        r.top10Pct,
        r.avgTop10Penetration,
        r.avgLinesPerOutlet,
        r.totalOutletsServiced,
        r.totalLines,
        ...r.top10Flags.map((f) => (f ? 'Yes' : 'No')),
      ]);
    }

    ws.columns.forEach((col) => {
      col.width = 16;
    });
    ws.getColumn(1).width = 28;

    // Detail visits sheet
    const detail = wb.addWorksheet('Visit Detail');
    detail.addRow([
      'Date',
      'OMR',
      'Territory',
      'Distributor',
      'Shop',
      'Outcome',
      'No Order Reason',
      'Amount',
      'Payment',
      'Products',
      'Lines',
      'Productive',
    ]);
    detail.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detail.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };

    const allVisits = await Visit.find({
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1, repName: 1 });

    for (const v of allVisits) {
      detail.addRow([
        v.date,
        v.repName,
        v.territory,
        v.distributor,
        v.shopName,
        v.outcome,
        v.noOrderReason || '',
        v.amount || 0,
        v.paymentType || '',
        v.products || '',
        lineCount(v),
        isProductive(v) ? 'Yes' : 'No',
      ]);
    }
    detail.columns.forEach((c) => {
      c.width = 14;
    });

    // Meta sheet
    const meta = wb.addWorksheet('Export Info');
    meta.addRow(['FieldForce Tracker — OMR Export']);
    meta.addRow(['Start Date', startDate]);
    meta.addRow(['End Date', endDate]);
    meta.addRow(['Generated', new Date().toISOString()]);
    meta.addRow(['OMR Count', omrs.length]);
    meta.addRow([]);
    meta.addRow(['Definitions']);
    meta.addRow(['Productive Call', 'Outlet bought at least 1 piece of any Nivea SKU']);
    meta.addRow(['Coverage', 'Beat outlets visited / beat outlets assigned (target 100%)']);
    meta.addRow(['Hit Rate', 'Productive calls / total visits']);
    meta.addRow(['LPPC', 'Product lines / productive calls']);
    meta.addRow(['Top 10 Penetration', 'Priority SKUs sold at least once / 10']);
    meta.addRow(['Avg Lines/Outlet', 'Total lines / unique outlets serviced']);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=OMR_Export_${startDate}_to_${endDate}.xlsx`
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('OMR export error:', error);
    res.status(500).json({ message: 'Failed to export OMR data' });
  }
};

export const exportMerchXlsx = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const merchs = await User.find({ role: 'merchandiser', isActive: true }).sort({
      fullName: 1,
    });
    const visits = await MerchVisit.find({
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    const wb = new ExcelJS.Workbook();
    const summary = wb.addWorksheet('Merch Summary');
    summary.addRow([
      'Merchandiser',
      'Username',
      'Territory',
      'Distributor',
      'Total Visits',
      'Unique Shops',
      'SKU Entries',
      'In Stock Count',
      'OOS Count',
      'Total Order Qty',
    ]);
    summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summary.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };

    for (const m of merchs) {
      const mv = visits.filter((v) => v.userId.toString() === m._id.toString());
      const shops = new Set(mv.map((v) => v.shopName.toLowerCase()));
      let skuEntries = 0;
      let inStock = 0;
      let oos = 0;
      let orderQty = 0;
      for (const v of mv) {
        for (const e of v.skuEntries || []) {
          skuEntries += 1;
          if (e.available) inStock += 1;
          else oos += 1;
          orderQty += e.orderQty || 0;
        }
      }
      summary.addRow([
        m.fullName,
        m.username,
        m.territory || '',
        m.distributor || '',
        mv.length,
        shops.size,
        skuEntries,
        inStock,
        oos,
        orderQty,
      ]);
    }
    summary.columns.forEach((c) => {
      c.width = 16;
    });

    const detail = wb.addWorksheet('Visit Detail');
    detail.addRow([
      'Date',
      'Merchandiser',
      'Shop',
      'Territory',
      'SKU',
      'Category',
      'Available',
      'Facings',
      'Price',
      'Order Qty',
      'Notes',
    ]);
    detail.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detail.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };

    for (const v of visits) {
      const entries = v.skuEntries?.length ? v.skuEntries : [null];
      for (const e of entries) {
        detail.addRow([
          v.date,
          v.merchandiserName,
          v.shopName,
          v.territory || '',
          e?.skuName || '',
          e?.category || '',
          e ? (e.available ? 'Yes' : 'No') : '',
          e?.facings ?? '',
          e?.price ?? '',
          e?.orderQty ?? '',
          e?.notes || v.overallNotes || '',
        ]);
      }
    }
    detail.columns.forEach((c) => {
      c.width = 14;
    });

    const meta = wb.addWorksheet('Export Info');
    meta.addRow(['FieldForce Tracker — Merchandiser Export']);
    meta.addRow(['Start Date', startDate]);
    meta.addRow(['End Date', endDate]);
    meta.addRow(['Generated', new Date().toISOString()]);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Merch_Export_${startDate}_to_${endDate}.xlsx`
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Merch export error:', error);
    res.status(500).json({ message: 'Failed to export merchandiser data' });
  }
};
