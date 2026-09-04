import Visit from '../models/Visit.js';
import WrapUp from '../models/WrapUp.js';
import Outlet from '../models/Outlet.js';
import NiveaSKU from '../models/NiveaSKU.js';

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

// @desc    Start visit at outlet — GPS must be near outlet
// @route   POST /api/omr/visits/start
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

// @desc    Get products for OMR selling
// @route   GET /api/omr/products
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

// @desc    Log a new shop visit
// @route   POST /api/omr/visits
export const createVisit = async (req, res) => {
  try {
    const {
      shopName,
      outletId,
      contactName,
      contactPhone,
      outcome,
      products,
      lineItems,
      amount,
      notes,
      date,
      location,
      outletLocation,
      distanceMeters: distM,
    } = req.body;

    if (!shopName) {
      return res.status(400).json({ message: 'Shop name is required' });
    }

    // Outlet-linked visits require GPS near the outlet
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
      productsStr = items
        .map((i) => `${i.productName} (${i.quantity} ${i.unit})`)
        .join(', ');
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
      products: productsStr,
      lineItems: items,
      amount: totalAmount,
      notes: notes || '',
      location: location || undefined,
      outletLocation: outletLocation || undefined,
      distanceMeters: distM != null ? Number(distM) : undefined,
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
