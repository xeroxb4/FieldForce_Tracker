import Visit from '../models/Visit.js';
import WrapUp from '../models/WrapUp.js';

// @desc    Log a new shop visit
// @route   POST /api/omr/visits
export const createVisit = async (req, res) => {
  try {
    const {
      shopName,
      contactName,
      contactPhone,
      outcome,
      products,
      amount,
      notes,
      date,
      location,
    } = req.body;

    if (!shopName) {
      return res.status(400).json({ message: 'Shop name is required' });
    }

    const visitDate = date || new Date().toISOString().slice(0, 10);

    const visit = await Visit.create({
      userId: req.user._id,
      repName: req.user.fullName,
      date: visitDate,
      shopName,
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      territory: req.user.territory,
      distributor: req.user.distributor,
      outcome: outcome || 'No Order',
      products: products || '',
      amount: Number(amount) || 0,
      notes: notes || '',
      location: location || undefined,
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error('Create visit error:', error);
    res.status(500).json({ message: 'Failed to log visit' });
  }
};

// @desc    Get today's visits for Auto-fill
// @route   GET /api/omr/visits/today
export const getTodayVisits = async (req, res) => {
  try {
    const today = req.query.date || new Date().toISOString().slice(0, 10);

    const visits = await Visit.find({
      userId: req.user._id,
      date: today,
    }).sort({ createdAt: 1 });

    res.json(visits);
  } catch (error) {
    console.error('Get today visits error:', error);
    res.status(500).json({ message: 'Failed to fetch today\'s visits' });
  }
};

// @desc    Get visits with optional filters
// @route   GET /api/omr/visits
export const getVisits = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const filter = { userId: req.user._id };

    if (date) {
      filter.date = date;
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const visits = await Visit.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(visits);
  } catch (error) {
    console.error('Get visits error:', error);
    res.status(500).json({ message: 'Failed to fetch visits' });
  }
};

// @desc    Submit day wrap-up
// @route   POST /api/omr/wrapups
export const createWrapUp = async (req, res) => {
  try {
    const {
      date,
      shopsPlanned,
      shopsVisited,
      shopNames,
      ordersCount,
      totalAmount,
      notes,
    } = req.body;

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
    console.error('Create wrapup error:', error);
    res.status(500).json({ message: 'Failed to submit wrap-up' });
  }
};

// @desc    Get wrap-ups
// @route   GET /api/omr/wrapups
export const getWrapUps = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { userId: req.user._id };
    if (date) filter.date = date;

    const wrapUps = await WrapUp.find(filter).sort({ date: -1 });
    res.json(wrapUps);
  } catch (error) {
    console.error('Get wrapups error:', error);
    res.status(500).json({ message: 'Failed to fetch wrap-ups' });
  }
};
