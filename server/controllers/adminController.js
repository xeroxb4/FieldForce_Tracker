import User from '../models/User.js';
import Visit from '../models/Visit.js';
import WrapUp from '../models/WrapUp.js';
import MerchVisit from '../models/MerchVisit.js';

// @desc    Get all users
// @route   GET /api/admin/users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ role: 1, fullName: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// @desc    Get all visits with filters (Admin Reports)
// @route   GET /api/admin/reports/visits
export const getVisitsReport = async (req, res) => {
  try {
    const { date, startDate, endDate, repName, territory, distributor } = req.query;
    const filter = {};

    if (date) filter.date = date;
    else if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };

    if (repName && repName !== 'All') filter.repName = repName;
    if (territory && territory !== 'All') filter.territory = territory;
    if (distributor && distributor !== 'All') filter.distributor = distributor;

    const visits = await Visit.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(visits);
  } catch (error) {
    console.error('Admin visits report error:', error);
    res.status(500).json({ message: 'Failed to load visits report' });
  }
};

// @desc    Get all wrap-ups with filters
// @route   GET /api/admin/reports/wrapups
export const getWrapUpsReport = async (req, res) => {
  try {
    const { date, startDate, endDate, repName, territory, distributor } = req.query;
    const filter = {};

    if (date) filter.date = date;
    else if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };

    if (repName && repName !== 'All') filter.repName = repName;
    if (territory && territory !== 'All') filter.territory = territory;
    if (distributor && distributor !== 'All') filter.distributor = distributor;

    const wrapUps = await WrapUp.find(filter).sort({ date: -1 });
    res.json(wrapUps);
  } catch (error) {
    console.error('Admin wrapups report error:', error);
    res.status(500).json({ message: 'Failed to load wrap-ups report' });
  }
};

// @desc    Get merchandiser visits report
// @route   GET /api/admin/reports/merch
export const getMerchReport = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const filter = {};

    if (date) filter.date = date;
    else if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };

    const visits = await MerchVisit.find(filter).sort({ date: -1 });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load merchandiser reports' });
  }
};
