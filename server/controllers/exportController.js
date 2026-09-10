import Target from '../models/Target.js';
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


/** Productivity workbook styled like GH Productivity Report (formulas included) */
export const exportProductivityXlsx = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate required (YYYY-MM-DD)' });
    }

    const omrs = await User.find({ role: 'omr', isActive: { $ne: false } }).lean();
    const visits = await Visit.find({
      date: { $gte: startDate, $lte: endDate },
    }).lean();
    const outlets = await Outlet.find({ status: 'approved', isActive: true }).lean();
    const targets = await Target.find({}).lean();

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    let workingDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day >= 1 && day <= 5) workingDays += 1;
    }
    if (workingDays < 1) workingDays = 1;

    const byUser = {};
    for (const o of omrs) {
      byUser[String(o._id)] = {
        name: o.fullName || o.username,
        distributor: o.distributor || '',
        territory: o.territory || '',
        region: o.region || o.territory || '',
        plannedOutlets: outlets.filter(
          (x) => String(x.assignedTo) === String(o._id)
        ).length,
        coveragePlan: 0,
        visited: 0,
        hits: 0,
        lines: 0,
        sales: 0,
        target: 0,
      };
    }

    // coverage plan ≈ unique outlets * working days / 5 * assigned day count rough
    for (const o of outlets) {
      const uid = String(o.assignedTo || '');
      if (!byUser[uid]) continue;
      const days = (o.assignedDays || []).filter((d) => d >= 1 && d <= 5).length || 1;
      byUser[uid].coveragePlan += Math.round((workingDays * days) / 5);
    }

    for (const v of visits) {
      const uid = String(v.userId);
      if (!byUser[uid]) continue;
      byUser[uid].visited += 1;
      if (v.outcome === 'Order Placed' || (v.amount || 0) > 0) {
        byUser[uid].hits += 1;
        byUser[uid].sales += v.amount || 0;
        byUser[uid].lines += (v.lineItems || []).filter((li) => (li.quantity || 0) > 0).length;
      }
    }

    for (const t of targets) {
      const uid = String(t.userId || t.omrId || '');
      if (byUser[uid] && (t.amount || t.targetAmount)) {
        byUser[uid].target = t.amount || t.targetAmount || 0;
      }
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'FieldForce Tracker';

    // --- Regional sheet ---
    const ws = wb.addWorksheet('Regional');
    ws.addRow(['OMR PRODUCTIVITY OVERVIEW']);
    ws.addRow([`Period: ${startDate} to ${endDate}`, '', '', `Working days: ${workingDays}`]);
    ws.addRow([]);
    ws.addRow([
      'REGION / TERRITORY',
      'REP NAME',
      'DISTRIBUTOR',
      'TOTAL OUTLETS',
      'COVERAGE PLANNED',
      'OUTLET VISITED',
      'COVERAGE %',
      'HIT/STRIKE',
      'HIT RATE %',
      'Av. LPPC',
      'OUTLET PER DAY',
      'TARGET',
      'ACTUAL SALES',
      'ACHI %',
      'RUNNING RATE (EXPECTED)',
    ]);

    const rows = Object.values(byUser);
    let startDataRow = 5;
    rows.forEach((r, i) => {
      const rowNum = startDataRow + i;
      const excelRow = ws.addRow([
        r.region || r.territory || '',
        r.name,
        r.distributor,
        r.plannedOutlets,
        r.coveragePlan || r.plannedOutlets * workingDays,
        r.visited,
        null, // F coverage formula
        r.hits,
        null, // H hit rate
        null, // I LPPC
        null, // J outlet per day
        r.target || 0,
        Math.round(r.sales * 100) / 100,
        null, // M achi
        null, // N running rate
      ]);
      // Formulas (Excel columns A=1 ... N=14)
      // Coverage % = Visited / Coverage Planned
      excelRow.getCell(7).value = { formula: `IF(E${rowNum}=0,0,F${rowNum}/E${rowNum})` };
      // Hit rate = Hits / Visited
      excelRow.getCell(9).value = { formula: `IF(F${rowNum}=0,0,H${rowNum}/F${rowNum})` };
      // LPPC = lines / hits (approx stored in hits lines - use hits as productive; lines/hits)
      const lppc = r.hits ? r.lines / r.hits : 0;
      excelRow.getCell(10).value = Math.round(lppc * 100) / 100;
      // Outlet per day = visited / working days
      excelRow.getCell(11).value = { formula: `IF(${workingDays}=0,0,F${rowNum}/${workingDays})` };
      // Achi % = Actual / Target
      excelRow.getCell(14).value = { formula: `IF(L${rowNum}=0,0,M${rowNum}/L${rowNum})` };
      // Running rate expected = Target * (days gone / working days) — use full period as days gone
      excelRow.getCell(15).value = { formula: `IF(${workingDays}=0,0,L${rowNum}*${workingDays}/${workingDays})` };
    });

    const endRow = startDataRow + rows.length - 1;
    if (rows.length) {
      const tot = ws.addRow(['NATIONAL', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
      const tr = endRow + 1;
      tot.getCell(4).value = { formula: `SUM(D${startDataRow}:D${endRow})` };
      tot.getCell(5).value = { formula: `SUM(E${startDataRow}:E${endRow})` };
      tot.getCell(6).value = { formula: `SUM(F${startDataRow}:F${endRow})` };
      tot.getCell(7).value = { formula: `IF(E${tr}=0,0,F${tr}/E${tr})` };
      tot.getCell(8).value = { formula: `SUM(H${startDataRow}:H${endRow})` };
      tot.getCell(9).value = { formula: `IF(F${tr}=0,0,H${tr}/F${tr})` };
      tot.getCell(12).value = { formula: `SUM(L${startDataRow}:L${endRow})` };
      tot.getCell(13).value = { formula: `SUM(M${startDataRow}:M${endRow})` };
      tot.getCell(14).value = { formula: `IF(L${tr}=0,0,M${tr}/L${tr})` };
      tot.font = { bold: true };
    }

    ws.getRow(4).font = { bold: true };
    ws.columns.forEach((c) => {
      c.width = 14;
    });

    // --- Distributor sheet ---
    const wd = wb.addWorksheet('Distributor');
    wd.addRow(['DISTRIBUTOR / REP DETAIL']);
    wd.addRow([`Working Days`, workingDays, `Days in period`, workingDays]);
    wd.addRow([]);
    wd.addRow([
      'REGION',
      'DISTRIBUTOR',
      'SALESPERSON',
      'TOTAL OUTLETS',
      'COVERAGE PLAN',
      'VISITED',
      'COV. RATE',
      'HIT/STRIKE',
      'HIT RATE',
      'LPPC',
      'OUTLET PER DAY',
      'TARGET',
      'ACTUAL SALES',
      'ACHI %',
      'COMMENTS',
    ]);
    let dStart = 5;
    Object.values(byUser).forEach((r, i) => {
      const rn = dStart + i;
      const row = wd.addRow([
        r.region || r.territory,
        r.distributor,
        r.name,
        r.plannedOutlets,
        r.coveragePlan || r.plannedOutlets * workingDays,
        r.visited,
        null,
        r.hits,
        null,
        r.hits ? Math.round((r.lines / r.hits) * 100) / 100 : 0,
        null,
        r.target || 0,
        Math.round(r.sales * 100) / 100,
        null,
        '',
      ]);
      row.getCell(7).value = { formula: `IF(E${rn}=0,0,F${rn}/E${rn})` };
      row.getCell(9).value = { formula: `IF(F${rn}=0,0,H${rn}/F${rn})` };
      row.getCell(11).value = { formula: `F${rn}/${workingDays}` };
      row.getCell(14).value = { formula: `IF(L${rn}=0,0,M${rn}/L${rn})` };
      row.getCell(15).value = {
        formula: `IF(N${rn}<0.5,"Sales below runrate",IF(N${rn}<1,"On track","Above target"))`,
      };
    });
    wd.getRow(4).font = { bold: true };

    // --- Target sheet ---
    const wt = wb.addWorksheet('Target');
    wt.addRow(['DT MONTHLY TARGET TEMPLATE']);
    wt.addRow(['DISTRIBUTOR', 'OMR USERNAME', 'OMR NAME', 'TARGET']);
    omrs.forEach((o) => {
      const u = byUser[String(o._id)];
      wt.addRow([o.distributor || '', o.username, o.fullName, u?.target || 0]);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=FieldForce_Productivity_${startDate}_to_${endDate}.xlsx`
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Productivity export error:', error);
    res.status(500).json({ message: 'Failed to export productivity report' });
  }
};
