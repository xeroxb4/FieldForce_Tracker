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
        message: `You are about ${Math.round(dist)}m away from this outlet. Please go to the shop (within ${MAX_DISTANCE_M}m) to start the visit.`,
        code: 'TOO_FAR',
        distanceMeters: Math.round(dist),
        maxDistance: MAX_DISTANCE_M,
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
    } = req.body;

    if (!shopName) {
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

    if (outletId) {
      if (!location?.lat || !location?.lng) {
        return res.status(400).json({
          message: 'GPS is required to complete an outlet visit. Turn on location.',
          code: 'GPS_REQUIRED',
        });
      }
      const outlet = await Outlet.findById(outletId);
      if (outlet?.location) {
        const dist = haversineMeters(
          location.lat,
          location.lng,
          outlet.location.lat,
          outlet.location.lng
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

    const visitDate = date || new Date().toISOString().slice(0, 10);

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
    if (outcome === 'Order Placed' && paymentType === 'credit' && totalAmount > 0) {
      const weeks = Number(creditDurationWeeks) === 2 ? 2 : 1;
      const dueDate = addWeeks(visitDate, weeks);
      const credit = await Credit.create({
        userId: req.user._id,
        repName: req.user.fullName,
        outletId: outletId || undefined,
        customerName: contactName || shopName,
        shopName,
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

    const visit = await Visit.create({
      userId: req.user._id,
      repName: req.user.fullName,
      date: visitDate,
      shopName,
      outletId: outletId || undefined,
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      territory: req.user.territory,
      distributor: req.user.distributor,
      outcome: outcome || 'No Order',
      noOrderReason: outcome === 'No Order' ? noOrderReason || '' : '',
      products: productsStr,
      lineItems: items,
      amount: totalAmount,
      paymentType: outcome === 'Order Placed' ? paymentType || 'cash' : '',
      creditDurationWeeks:
        outcome === 'Order Placed' && paymentType === 'credit'
          ? Number(creditDurationWeeks)
          : null,
      creditId,
      notes: notes || '',
      location: location || undefined,
      outletLocation: outletLocation || undefined,
      distanceMeters: distM != null ? Number(distM) : undefined,
      syncedFromOffline: !!syncedFromOffline,
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error('Create visit error:', error);
    res.status(500).json({ message: 'Failed to log visit' });
  }
};

export const getTodayVisits = async (req, res) => {
  try {
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
