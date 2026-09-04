import User from '../models/User.js';
import Visit from '../models/Visit.js';
import WrapUp from '../models/WrapUp.js';
import MerchVisit from '../models/MerchVisit.js';
import Outlet from '../models/Outlet.js';
import Target from '../models/Target.js';

// @desc    Get all users
export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').sort({ role: 1, fullName: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// @desc    Create user (OMR / merchandiser / admin)
export const createUser = async (req, res) => {
  try {
    const { username, password, fullName, role, territory, distributor, region } = req.body;
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ message: 'Username, password, full name and role are required' });
    }
    if (!['omr', 'merchandiser', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const exists = await User.findOne({ username: username.toLowerCase().trim() });
    if (exists) return res.status(400).json({ message: 'Username already exists' });

    const user = await User.create({
      username: username.toLowerCase().trim(),
      password,
      fullName,
      role,
      territory: territory || '',
      distributor: distributor || '',
      region: region || '',
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      territory: user.territory,
      distributor: user.distributor,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

// @desc    Update user
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { fullName, territory, distributor, region, isActive, password } = req.body;
    if (fullName) user.fullName = fullName;
    if (territory !== undefined) user.territory = territory;
    if (distributor !== undefined) user.distributor = distributor;
    if (region !== undefined) user.region = region;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // pre-save hook hashes it

    await user.save();
    res.json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      territory: user.territory,
      distributor: user.distributor,
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
};

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
    res.status(500).json({ message: 'Failed to load visits report' });
  }
};

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
    res.status(500).json({ message: 'Failed to load wrap-ups report' });
  }
};

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

// ——— Admin outlets ———

// @desc    Admin creates outlet and can assign immediately
export const adminCreateOutlet = async (req, res) => {
  try {
    const {
      name,
      contactName,
      contactPhone,
      address,
      lat,
      lng,
      assignedTo,
      assignedDays,
      territory,
      distributor,
      notes,
      autoApprove,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Outlet name is required' });
    }
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        message: 'GPS location is required (lat, lng)',
        code: 'GPS_REQUIRED',
      });
    }

    const approve = autoApprove !== false && assignedTo && assignedDays?.length;

    const outlet = await Outlet.create({
      userId: assignedTo || req.user._id,
      createdBy: req.user.fullName,
      assignedTo: assignedTo || undefined,
      name: name.trim(),
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      address: address || '',
      territory: territory || '',
      distributor: distributor || '',
      location: { lat: Number(lat), lng: Number(lng) },
      status: approve ? 'approved' : 'pending',
      assignedDays: approve ? assignedDays.map(Number) : [],
      approvedBy: approve ? req.user.fullName : '',
      approvedAt: approve ? new Date() : undefined,
      notes: notes || '',
    });

    res.status(201).json({
      message: approve
        ? 'Outlet created and assigned to beat days'
        : 'Outlet created (pending assignment)',
      outlet,
    });
  } catch (error) {
    console.error('Admin create outlet error:', error);
    res.status(500).json({ message: 'Failed to create outlet' });
  }
};

// @desc    List all outlets (admin)
export const adminListOutlets = async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const outlets = await Outlet.find(filter)
      .populate('assignedTo', 'fullName username territory distributor')
      .sort({ createdAt: -1 });
    res.json(outlets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to list outlets' });
  }
};

// @desc    Assign / reassign outlet to OMR + days
export const adminAssignOutlet = async (req, res) => {
  try {
    const { assignedTo, assignedDays } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ message: 'assignedTo (OMR user id) is required' });
    }
    if (!assignedDays || !Array.isArray(assignedDays) || assignedDays.length === 0) {
      return res.status(400).json({
        message: 'Assign at least one day (1=Mon ... 5=Fri, 6=Sat)',
      });
    }

    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });

    const omr = await User.findById(assignedTo);
    if (!omr || omr.role !== 'omr') {
      return res.status(400).json({ message: 'assignedTo must be an OMR user' });
    }

    outlet.assignedTo = assignedTo;
    outlet.userId = assignedTo;
    outlet.assignedDays = assignedDays.map(Number);
    outlet.status = 'approved';
    outlet.approvedBy = req.user.fullName;
    outlet.approvedAt = new Date();
    if (omr.territory) outlet.territory = omr.territory;
    if (omr.distributor) outlet.distributor = omr.distributor;

    await outlet.save();
    res.json({ message: 'Outlet assigned to beat days', outlet });
  } catch (error) {
    console.error('Assign outlet error:', error);
    res.status(500).json({ message: 'Failed to assign outlet' });
  }
};

// @desc    List targets for a month
export const listTargets = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const targets = await Target.find({ month }).populate('userId', 'fullName username territory distributor');
    res.json(targets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to list targets' });
  }
};
