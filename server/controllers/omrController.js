import Visit from '../models/Visit.js';
import WrapUp from '../models/WrapUp.js';
import Outlet from '../models/Outlet.js';
import NiveaSKU from '../models/NiveaSKU.js';
import Credit from '../models/Credit.js';

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_DISTANCE_M = 200;

const NO_ORDER_REASONS = [
  'Out of cash',
  'Owner not available',
  'I have a supplier',
  'High price',
  'Customer has payment issues',
  'Shop closed',
  'Not interested',
  'Stock still available',
  'Other',
];

export const startVisit = async (req, res) => {
  try {
    const { outletId, lat, lng, accuracy } = req.body;

    if (!outletId) {
      return res.status(400).json({ message: 'Outlet is required' });
    }
    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return res.status(400).json({
        message: 'GPS is required. Turn on location to start this outlet visit.',
        code: 'GPS_REQUIRED',
      });
    }

    const outlet = await Outlet.findOne({
      _id: outletId,
      assignedTo: req.user._id,
      status: 'approved',
    });

    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found or not assigned to you' });
    }

    const dist = haversineMeters(
      Number(lat),
      Number(lng),
      outlet.location.lat,
      outlet.location.lng
    );

    if (dist > MAX_DISTANCE_M) {
      return res.status(400).json({
        message: `You are about ${Math.round(dist)}m away from the saved shop pin. If you are at this shop now, update the pin to your exact location.`,
        code: 'TOO_FAR',
        distanceMeters: Math.round(dist),
        maxDistance: MAX_DISTANCE_M,
        canUpdateLocation: true,
        outletId,
        outletName: outlet.name,
      });
    }

    res.json({
      ok: true,
      message: 'Location verified. You can service this outlet.',
      outlet: {
        _id: outlet._id,
        name: outlet.name,
        contactName: outlet.contactName,
        contactPhone: outlet.contactPhone,
        address: outlet.address,
        location: outlet.location,
      },
      distanceMeters: Math.round(dist),
      agentLocation: { lat: Number(lat), lng: Number(lng), accuracy },
    });
  } catch (error) {
    console.error('Start visit error:', error);
    res.status(500).json({ message: 'Failed to start visit' });
  }
};

export const getProducts = async (req, res) => {
  try {
    const skus = await NiveaSKU.find({ isActive: true }).sort({ category: 1, name: 1 });
    const grouped = { Lotion: [], 'Roll-on': [], Spray: [], 'Shower Gel': [], Other: [] };
    skus.forEach((s) => {
      if (grouped[s.category]) grouped[s.category].push(s);
      else grouped.Other.push(s);
    });
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

export const getNoOrderReasons = async (_req, res) => {
  res.json(NO_ORDER_REASONS);
};

function addWeeks(dateStr, weeks) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export const createVisit = async (req, res) => {
  try {
    const {
      shopName,
      outletId,
      contactName,
      contactPhone,
      outcome,
      noOrderReason,
      products,
      lineItems,
      amount,
      paymentType,
      creditDurationWeeks,
      notes,
      date,
      location,
      outletLocation,
      distanceMeters: distM,
      syncedFromOffline,
      extraCoverage,
      deferredSalePending,
      physicalSaleDate,
    } = req.body;

    if (!shopName && !outletId) {
      return res.status(400).json({ message: 'Shop name is required' });
    }

    if (outcome === 'No Order' && !noOrderReason) {
      return res.status(400).json({ message: 'Please select a reason for No Order' });
    }

    if (outcome === 'Order Placed' && paymentType === 'credit') {
      const weeks = Number(creditDurationWeeks);
      if (weeks !== 1 && weeks !== 2) {
        return res.status(400).json({ message: 'Credit duration must be 1 or 2 weeks' });
      }
    }

    let resolvedShopName = (shopName || '').trim();
    let resolvedContactName = contactName || '';
    let resolvedContactPhone = contactPhone || '';
    let outletDoc = null;

    if (outletId) {
      if (!location?.lat || !location?.lng) {
        return res.status(400).json({
          message: 'GPS is required to complete an outlet visit. Turn on location.',
          code: 'GPS_REQUIRED',
        });
      }
      outletDoc = await Outlet.findById(outletId);
      if (!outletDoc) {
        return res.status(404).json({ message: 'Outlet not found' });
      }
      // Always persist stable label from master outlet (displayName preferred)
      resolvedShopName = outletDoc.displayName || outletDoc.name || resolvedShopName;
      if (!resolvedContactName) resolvedContactName = outletDoc.contactName || '';
      if (!resolvedContactPhone) resolvedContactPhone = outletDoc.contactPhone || '';
      if (outletDoc?.location) {
        const dist = haversineMeters(
          location.lat,
          location.lng,
          outletDoc.location.lat,
          outletDoc.location.lng
        );
        if (dist > MAX_DISTANCE_M) {
          return res.status(400).json({
            message: `You are too far from the outlet (~${Math.round(dist)}m). Move closer to complete the visit.`,
            code: 'TOO_FAR',
            distanceMeters: Math.round(dist),
          });
        }
      }
    }

    if (!resolvedShopName) {
      return res.status(400).json({ message: 'Shop name is required' });
    }

    const visitDate = date || new Date().toISOString().slice(0, 10);
    const jsDay = new Date(visitDate + 'T12:00:00').getDay(); // 0 Sun .. 6 Sat
    const beatDay = jsDay === 0 ? 7 : jsDay; // 1 Mon .. 7 Sun

    let isOffBeat = false;
    if (outletId) {
      const outletForBeat = await Outlet.findById(outletId);
      const days = outletForBeat?.assignedDays || [];
      if (days.length && !days.map(Number).includes(Number(beatDay))) {
        isOffBeat = true;
      }
    }
    const isExtra = !!extraCoverage || isOffBeat;
    if (isExtra) {
      // Coverage only — no sales on off-beat day
      if (outcome === 'Order Placed' && (Number(amount) > 0 || (Array.isArray(lineItems) && lineItems.length))) {
        return res.status(400).json({
          message:
            'This outlet is not on today\'s beat. Log Extra coverage only (no sales). Enter the sale on the outlet\'s beat day so KPIs land on the correct day.',
          code: 'OFF_BEAT_NO_SALE',
        });
      }
    }


    let productsStr = products || '';
    let totalAmount = Number(amount) || 0;
    let items = [];

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      items = lineItems.map((li) => ({
        skuId: li.skuId,
        productName: li.productName,
        category: li.category,
        size: li.size,
        unit: li.unit || 'pc',
        quantity: Number(li.quantity) || 0,
        unitPrice: Number(li.unitPrice) || 0,
        lineTotal: Number(li.lineTotal) || 0,
      }));
      totalAmount = items.reduce((s, i) => s + i.lineTotal, 0);
      productsStr = items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ');
    }

    let creditId = undefined;

    // Create credit/owing if payment is credit
    if (!isExtra && outcome === 'Order Placed' && paymentType === 'credit' && totalAmount > 0) {
      const weeks = Number(creditDurationWeeks) === 2 ? 2 : 1;
      const dueDate = addWeeks(visitDate, weeks);
      const credit = await Credit.create({
        userId: req.user._id,
        repName: req.user.fullName,
        outletId: outletId || undefined,
        customerName: resolvedContactName || resolvedShopName,
        shopName: resolvedShopName,
        amount: totalAmount,
        amountPaid: 0,
        balance: totalAmount,
        dueDate,
        saleDate: visitDate,
        status: 'pending',
        notes: notes || `Credit sale – ${weeks} week(s)`,
      });
      creditId = credit._id;
    }

    const finalOutcome = isExtra ? 'Extra Coverage' : (outcome || 'No Order');
    // Extra coverage: visit itself carries 0 sales for that day; order lines held for beat day
    const hasDeferredOrder = isExtra && (items.length > 0 || totalAmount > 0);
    const finalAmount = isExtra ? 0 : totalAmount;
    const finalItems = isExtra ? [] : items;
    const finalProducts = isExtra ? '' : productsStr;

    let scheduledKpiDate = '';
    let deferredStatus = 'none';
    if (isExtra) {
      deferredStatus = hasDeferredOrder ? 'scheduled' : 'pending_capture';
      const days = outletDoc?.assignedDays || [];
      scheduledKpiDate = nextBeatDate(days, visitDate);
    }

    const visit = await Visit.create({
      userId: req.user._id,
      repName: req.user.fullName,
      date: visitDate,
      shopName: resolvedShopName,
      outletId: outletId || undefined,
      contactName: resolvedContactName,
      contactPhone: resolvedContactPhone,
      territory: req.user.territory,
      distributor: req.user.distributor,
      outcome: finalOutcome,
      noOrderReason:
        finalOutcome === 'No Order'
          ? noOrderReason || ''
          : isExtra
          ? 'Off-beat extra coverage — sale scheduled for beat day'
          : '',
      products: finalProducts,
      lineItems: finalItems,
      amount: finalAmount,
      paymentType: !isExtra && outcome === 'Order Placed' ? paymentType || 'cash' : '',
      creditDurationWeeks:
        !isExtra && outcome === 'Order Placed' && paymentType === 'credit'
          ? Number(creditDurationWeeks)
          : null,
      creditId: isExtra ? undefined : creditId,
      notes: notes || '',
      location: location || undefined,
      outletLocation: outletLocation || undefined,
      distanceMeters: distM != null ? Number(distM) : undefined,
      syncedFromOffline: !!syncedFromOffline,
      extraCoverage: isExtra,
      deferredSalePending: isExtra,
      physicalSaleDate: isExtra ? visitDate : (physicalSaleDate || ''),
      scheduledKpiDate: isExtra ? scheduledKpiDate : '',
      deferredStatus: isExtra ? deferredStatus : 'none',
      deferredLineItems: isExtra && hasDeferredOrder ? items : [],
      deferredAmount: isExtra && hasDeferredOrder ? totalAmount : 0,
      deferredProducts: isExtra && hasDeferredOrder ? productsStr : '',
      deferredPaymentType: isExtra && hasDeferredOrder ? paymentType || 'cash' : '',
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error('Create visit error:', error);
    const msg =
      error?.errors
        ? Object.values(error.errors)
            .map((e) => e.message)
            .join('; ')
        : error?.message || 'Failed to log visit';
    res.status(500).json({ message: msg });
  }
};

export const getTodayVisits = async (req, res) => {
  try {
    await processScheduledDeferredSales(req.user._id);
    const today = req.query.date || new Date().toISOString().slice(0, 10);
    const visits = await Visit.find({ userId: req.user._id, date: today }).sort({ createdAt: 1 });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch today's visits" });
  }
};

export const getVisits = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const filter = { userId: req.user._id };
    if (date) filter.date = date;
    else if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };
    const visits = await Visit.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch visits' });
  }
};

export const createWrapUp = async (req, res) => {
  try {
    const { date, shopsPlanned, shopsVisited, shopNames, ordersCount, totalAmount, notes } =
      req.body;
    const wrapDate = date || new Date().toISOString().slice(0, 10);

    const wrapUp = await WrapUp.findOneAndUpdate(
      { userId: req.user._id, date: wrapDate },
      {
        repName: req.user.fullName,
        territory: req.user.territory,
        distributor: req.user.distributor,
        shopsPlanned: Number(shopsPlanned) || 0,
        shopsVisited: Number(shopsVisited) || 0,
        shopNames: shopNames || [],
        ordersCount: Number(ordersCount) || 0,
        totalAmount: Number(totalAmount) || 0,
        notes: notes || '',
      },
      { upsert: true, new: true }
    );

    res.status(201).json(wrapUp);
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit wrap-up' });
  }
};

export const getWrapUps = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { userId: req.user._id };
    if (date) filter.date = date;
    const wrapUps = await WrapUp.find(filter).sort({ date: -1 });
    res.json(wrapUps);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wrap-ups' });
  }
};


/** OMR standing at shop: save exact GPS on their assigned outlet */
export const updateOutletGps = async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return res.status(400).json({
        message: 'GPS is required to update shop location.',
        code: 'GPS_REQUIRED',
      });
    }

    const outlet = await Outlet.findOne({
      _id: req.params.id,
      assignedTo: req.user._id,
      status: 'approved',
      isActive: true,
    });

    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found or not assigned to you' });
    }

    outlet.location = {
      lat: Number(lat),
      lng: Number(lng),
    };
    outlet.locationVerified = true;
    if (outlet.markModified) outlet.markModified('location');
    await outlet.save();

    res.json({
      message: 'Shop location updated to your current GPS.',
      outlet: {
        _id: outlet._id,
        name: outlet.name,
        location: outlet.location,
      },
    });
  } catch (error) {
    console.error('Update outlet GPS error:', error);
    res.status(500).json({ message: 'Failed to update shop location' });
  }
};


export const getMonthSummary = async (req, res) => {
  try {
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const end = now.toISOString().slice(0, 10);
    const visits = await Visit.find({
      userId: req.user._id,
      date: { $gte: start, $lte: end },
    });
    let sales = 0;
    let orders = 0;
    let productive = 0;
    const outlets = new Set();
    for (const v of visits) {
      outlets.add(String(v.outletId || v.shopName));
      if ((v.amount || 0) > 0 || v.outcome === 'Order Placed') {
        orders += 1;
        sales += v.amount || 0;
        productive += 1;
      }
    }
    res.json({
      monthStart: start,
      monthEnd: end,
      totalVisits: visits.length,
      productiveCalls: productive,
      orders,
      totalSales: Math.round(sales * 100) / 100,
      uniqueOutlets: outlets.size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load month summary' });
  }
};



/** Next calendar date (YYYY-MM-DD) on or after fromDate whose weekday is in assignedDays (1=Mon..7=Sun) */
function nextBeatDate(assignedDays, fromDateStr) {
  const days = (assignedDays || []).map(Number).filter((d) => d >= 1 && d <= 7);
  if (!days.length) {
    // no beat days → next calendar day
    const d = new Date(fromDateStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const start = new Date(fromDateStr + 'T12:00:00');
  for (let i = 1; i <= 14; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const js = d.getDay(); // 0 Sun
    const beat = js === 0 ? 7 : js;
    if (days.includes(beat)) return d.toISOString().slice(0, 10);
  }
  const d = new Date(start);
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function todayBeatNum() {
  const js = new Date(todayStr() + 'T12:00:00').getDay();
  return js === 0 ? 7 : js;
}

/**
 * Auto-post scheduled deferred sales whose scheduledKpiDate <= today
 * (and today is that outlet beat day when assignedDays set).
 */
async function processScheduledDeferredSales(userId) {
  const today = todayStr();
  const filter = {
    deferredStatus: 'scheduled',
    deferredSalePending: true,
    scheduledKpiDate: { $lte: today },
  };
  if (userId) filter.userId = userId;

  const pending = await Visit.find(filter).limit(100);
  const posted = [];

  for (const coverage of pending) {
    try {
      let outlet = coverage.outletId ? await Outlet.findById(coverage.outletId) : null;
      const days = (outlet?.assignedDays || []).map(Number);
      const beat = todayBeatNum();
      // Only post on a valid beat day for the outlet (or any day if no days set)
      if (days.length && !days.includes(beat)) continue;
      // Prefer exact scheduled day; allow if scheduled date passed and today is a beat day
      if (coverage.scheduledKpiDate && coverage.scheduledKpiDate > today) continue;

      const items = coverage.deferredLineItems || [];
      const totalAmount =
        Number(coverage.deferredAmount) ||
        items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0);
      if (totalAmount <= 0 && !items.length) continue;

      const finalShop =
        outlet?.displayName || outlet?.name || coverage.shopName;

      const sale = await Visit.create({
        userId: coverage.userId,
        repName: coverage.repName,
        date: today,
        shopName: finalShop,
        outletId: coverage.outletId || undefined,
        contactName: coverage.contactName || '',
        contactPhone: coverage.contactPhone || '',
        territory: coverage.territory || '',
        distributor: coverage.distributor || '',
        outcome: 'Order Placed',
        products: coverage.deferredProducts || '',
        lineItems: items,
        amount: totalAmount,
        paymentType: coverage.deferredPaymentType || 'cash',
        notes: `Auto deferred sale (physical ${coverage.physicalSaleDate || coverage.date}; KPI ${today})`,
        extraCoverage: false,
        deferredSalePending: false,
        deferredStatus: 'posted',
        physicalSaleDate: coverage.physicalSaleDate || coverage.date || '',
        scheduledKpiDate: coverage.scheduledKpiDate || today,
      });

      coverage.deferredSalePending = false;
      coverage.deferredStatus = 'posted';
      coverage.notes =
        (coverage.notes || '') + ` [Auto-posted KPI sale ${today} id=${sale._id}]`;
      await coverage.save();
      posted.push(sale);
    } catch (e) {
      console.error('processScheduledDeferredSales item error', e.message);
    }
  }
  return posted;
}


/** List outlets with deferred sale pending (physical sale off-beat, enter KPI sale today) */
export const getDeferredSales = async (req, res) => {
  try {
    await processScheduledDeferredSales(req.user._id);

    const pending = await Visit.find({
      userId: req.user._id,
      deferredSalePending: true,
      extraCoverage: true,
      deferredStatus: { $in: ['pending_capture', 'scheduled'] },
    })
      .sort({ date: -1 })
      .limit(50)
      .lean();

    const DAY = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
    const today = todayStr();
    const todayBeat = todayBeatNum();

    const outletIds = [...new Set(pending.map((v) => v.outletId).filter(Boolean))];
    const outlets = await Outlet.find({ _id: { $in: outletIds } })
      .select('name displayName assignedDays')
      .lean();
    const omap = Object.fromEntries(outlets.map((o) => [String(o._id), o]));

    const rows = pending.map((v) => {
      const o = v.outletId ? omap[String(v.outletId)] : null;
      const days = (o?.assignedDays || []).map(Number);
      const isBeatDay = !days.length || days.includes(Number(todayBeat));
      return {
        ...v,
        assignedDays: days,
        beatDayLabels: days.map((d) => DAY[d] || d).join(', ') || 'Any day',
        isBeatDayToday: isBeatDay,
        todayBeatLabel: DAY[todayBeat] || String(todayBeat),
        scheduledKpiDate: v.scheduledKpiDate || '',
        deferredStatus: v.deferredStatus || 'pending_capture',
        heldAmount: v.deferredAmount || 0,
        heldLines: (v.deferredLineItems || []).length,
      };
    });

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load deferred sales' });
  }
};

/**
 * Capture or update the held order on an extra-coverage visit (any day).
 * KPI auto-posts on scheduledKpiDate / beat day — OMR does not need a second Start Visit.
 */
export const completeDeferredSale = async (req, res) => {
  try {
    const {
      coverageVisitId,
      outletId,
      shopName,
      lineItems,
      amount,
      products,
      paymentType = 'cash',
      notes,
    } = req.body;

    let coverage = coverageVisitId ? await Visit.findById(coverageVisitId) : null;
    if (!coverage || String(coverage.userId) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Coverage visit not found' });
    }

    let outlet = outletId
      ? await Outlet.findById(outletId)
      : coverage.outletId
      ? await Outlet.findById(coverage.outletId)
      : null;

    let items = [];
    let totalAmount = Number(amount) || 0;
    let productsStr = products || '';
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      items = lineItems.map((li) => ({
        skuId: li.skuId,
        productName: li.productName,
        category: li.category || '',
        size: li.size || '',
        unit: li.unit || 'pc',
        quantity: Number(li.quantity) || 0,
        unitPrice: Number(li.unitPrice) || 0,
        lineTotal: Number(li.lineTotal) || 0,
      }));
      totalAmount = items.reduce((s, i) => s + i.lineTotal, 0);
      productsStr = items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ');
    }

    if (totalAmount <= 0 && !items.length) {
      return res.status(400).json({ message: 'Enter amount or product lines' });
    }

    const visitDate = coverage.date || todayStr();
    const scheduledKpiDate =
      coverage.scheduledKpiDate || nextBeatDate(outlet?.assignedDays || [], visitDate);

    coverage.deferredLineItems = items;
    coverage.deferredAmount = totalAmount;
    coverage.deferredProducts = productsStr;
    coverage.deferredPaymentType = paymentType || 'cash';
    coverage.deferredStatus = 'scheduled';
    coverage.deferredSalePending = true;
    coverage.scheduledKpiDate = scheduledKpiDate;
    coverage.physicalSaleDate = coverage.physicalSaleDate || coverage.date;
    if (notes) coverage.notes = (coverage.notes || '') + ' ' + notes;
    await coverage.save();

    // If today is already the KPI day, post immediately
    const posted = await processScheduledDeferredSales(req.user._id);
    const justPosted = posted.find(
      (s) => String(s.outletId) === String(coverage.outletId) && s.date === todayStr()
    );

    res.status(201).json({
      message: justPosted
        ? 'Sale posted for KPIs today (beat day).'
        : `Order saved in the cloud. KPIs will count on ${scheduledKpiDate}. No second Start Visit needed that day.`,
      scheduledKpiDate,
      posted: !!justPosted,
      coverage,
      sale: justPosted || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Failed to complete deferred sale' });
  }
};

