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

    const { fullName, username, territory, distributor, region, isActive, password } = req.body;
    if (fullName) user.fullName = fullName;
    if (username) {
      const next = username.toLowerCase().trim();
      if (next !== user.username) {
        const exists = await User.findOne({ username: next });
        if (exists) return res.status(400).json({ message: 'Username already taken' });
        user.username = next;
      }
    }
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
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };
    else if (date) filter.date = date;
    if (repName && repName !== 'All') {
      filter.repName = new RegExp('^' + String(repName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
    }
    if (territory && territory !== 'All') {
      filter.territory = new RegExp(String(territory).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    if (distributor && distributor !== 'All') {
      filter.distributor = new RegExp(String(distributor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    const visits = await Visit.find(filter)
      .populate('userId', 'fullName username distributor territory')
      .sort({ date: -1, createdAt: -1 })
      .limit(2000);
    res.json(visits);
  } catch (error) {
    console.error(error);
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
      avcEnrolled,
      avcTier,
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

    const tier = avcEnrolled && ['Gold', 'Silver', 'Bronze'].includes(avcTier) ? avcTier : '';
    const avcTargets = { Gold: 12500, Silver: 10000, Bronze: 5000 };

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
      avcEnrolled: !!avcEnrolled && !!tier,
      avcTier: tier,
      avcTarget: tier ? avcTargets[tier] : 0,
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
    if (!omr || !['omr', 'merchandiser'].includes(omr.role)) {
      return res.status(400).json({ message: 'assignedTo must be an OMR or Merchandiser' });
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


export const updateOutletFull = async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });

    const {
      name,
      contactName,
      contactPhone,
      address,
      notes,
      assignedTo,
      assignedDays,
      avcEnrolled,
      avcTier,
      isActive,
      lat,
      lng,
    } = req.body;

    if (name) outlet.name = name.trim();
    if (contactName !== undefined) outlet.contactName = contactName;
    if (contactPhone !== undefined) outlet.contactPhone = contactPhone;
    if (address !== undefined) outlet.address = address;
    if (notes !== undefined) outlet.notes = notes;
    if (isActive !== undefined) outlet.isActive = !!isActive;

    if (assignedTo) {
      outlet.assignedTo = assignedTo;
      outlet.userId = assignedTo;
    }
    if (Array.isArray(assignedDays)) {
      outlet.assignedDays = assignedDays.map(Number);
    }

    if (avcEnrolled !== undefined) {
      if (!avcEnrolled) {
        outlet.avcEnrolled = false;
        outlet.avcTier = '';
        outlet.avcTarget = 0;
      } else {
        const tier = ['Gold', 'Silver', 'Bronze'].includes(avcTier) ? avcTier : '';
        if (!tier) return res.status(400).json({ message: 'AVC tier required when enrolled' });
        const targets = { Gold: 12500, Silver: 10000, Bronze: 5000 };
        outlet.avcEnrolled = true;
        outlet.avcTier = tier;
        outlet.avcTarget = targets[tier];
      }
    }

    if (lat !== undefined && lng !== undefined) {
      outlet.location = { lat: Number(lat), lng: Number(lng) };
    }

    // Ensure approved if assigned
    if (outlet.assignedTo && outlet.assignedDays?.length) {
      outlet.status = 'approved';
    }

    await outlet.save();
    const populated = await Outlet.findById(outlet._id).populate(
      'assignedTo',
      'fullName username territory'
    );
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update outlet' });
  }
};

export const removeOutlet = async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
    outlet.isActive = false;
    await outlet.save();
    res.json({ message: 'Outlet removed (deactivated)', outlet });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove outlet' });
  }
};


export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - (day - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dayStr = startOfDay.toISOString().slice(0, 10);
    const weekStr = startOfWeek.toISOString().slice(0, 10);
    const monthStr = startOfMonth.toISOString().slice(0, 10);

    const sumAmount = async (fromDate) => {
      const rows = await Visit.aggregate([
        { $match: { date: { $gte: fromDate }, outcome: 'Order Placed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]);
      return rows[0] || { total: 0, count: 0 };
    };

    const [today, week, month, omrCount, merchCount, outletCount, avcCount] = await Promise.all([
      sumAmount(dayStr),
      sumAmount(weekStr),
      sumAmount(monthStr),
      User.countDocuments({ role: 'omr', isActive: true }),
      User.countDocuments({ role: 'merchandiser', isActive: true }),
      Outlet.countDocuments({ isActive: true, status: 'approved' }),
      Outlet.countDocuments({ isActive: true, avcEnrolled: true }),
    ]);

    // Per-OMR sales today
    const perOmrToday = await Visit.aggregate([
      { $match: { date: dayStr, outcome: 'Order Placed' } },
      { $group: { _id: '$userId', total: { $sum: '$amount' }, orders: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 20 },
    ]);
    const userIds = perOmrToday.map((r) => r._id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select('fullName distributor territory');
    const umap = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const omrSalesToday = perOmrToday.map((r) => ({
      omr: umap[String(r._id)]?.fullName || 'Unknown',
      distributor: umap[String(r._id)]?.distributor || '',
      territory: umap[String(r._id)]?.territory || '',
      total: r.total,
      orders: r.orders,
    }));

    // Sales by distributor (month)
    const byDist = await Visit.aggregate([
      { $match: { date: { $gte: monthStr }, outcome: 'Order Placed' } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'u',
        },
      },
      { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$u.distributor',
          total: { $sum: '$amount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({
      sales: {
        today: { amount: today.total || 0, orders: today.count || 0 },
        week: { amount: week.total || 0, orders: week.count || 0 },
        month: { amount: month.total || 0, orders: month.count || 0 },
      },
      counts: { omrs: omrCount, merchandisers: merchCount, outlets: outletCount, avc: avcCount },
      omrSalesToday,
      distributorMonth: byDist.map((d) => ({
        name: d._id || 'Unassigned',
        total: d.total,
        orders: d.orders,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load dashboard stats' });
  }
};


export const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot deactivate admin accounts here' });
    }
    user.isActive = false;
    await user.save();
    res.json({ message: 'User deactivated', user: { _id: user._id, isActive: false } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
};


export const getUnvisitedToday = async (req, res) => {
  try {
    const dayNum = (() => {
      const d = new Date().getDay();
      return d === 0 ? 7 : d;
    })();
    const date = new Date().toISOString().slice(0, 10);

    const omrs = await User.find({ role: 'omr', isActive: { $ne: false } }).select('fullName username territory distributor');
    const visits = await Visit.find({ date, outletId: { $ne: null } }).select('outletId userId');
    const visitedByUser = {};
    visits.forEach((v) => {
      const uid = String(v.userId);
      if (!visitedByUser[uid]) visitedByUser[uid] = new Set();
      visitedByUser[uid].add(String(v.outletId));
    });

    const rows = [];
    for (const omr of omrs) {
      const planned = await Outlet.find({
        assignedTo: omr._id,
        status: 'approved',
        isActive: true,
        assignedDays: dayNum,
      }).select('name displayName address territory assignedDays');
      const visited = visitedByUser[String(omr._id)] || new Set();
      const unvisited = planned.filter((o) => !visited.has(String(o._id)));
      rows.push({
        omr: { _id: omr._id, fullName: omr.fullName, username: omr.username, territory: omr.territory, distributor: omr.distributor },
        plannedCount: planned.length,
        visitedCount: planned.length - unvisited.length,
        unvisitedCount: unvisited.length,
        unvisited: unvisited.map((o) => ({
          _id: o._id,
          name: o.displayName || o.name,
          address: o.address,
        })),
      });
    }

    res.json({ date, dayNumber: dayNum, reps: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load unvisited outlets' });
  }
};

export const getOutletSalesHistory = async (req, res) => {
  try {
    const { outletId, startDate, endDate } = req.query;
    const filter = {};
    if (outletId) filter.outletId = outletId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }
    const visits = await Visit.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .populate('userId', 'fullName username')
      .lean();

    const byOutlet = {};
    for (const v of visits) {
      const key = String(v.outletId || v.shopName);
      if (!byOutlet[key]) {
        byOutlet[key] = {
          outletId: v.outletId,
          shopName: v.shopName,
          visits: 0,
          orders: 0,
          totalSales: 0,
          lastVisit: null,
          history: [],
        };
      }
      const row = byOutlet[key];
      row.visits += 1;
      if (v.outcome === 'Order Placed' || (v.amount || 0) > 0) {
        row.orders += 1;
        row.totalSales += v.amount || 0;
      }
      if (!row.lastVisit || v.date > row.lastVisit) row.lastVisit = v.date;
      row.history.push({
        _id: v._id,
        date: v.date,
        outcome: v.outcome,
        amount: v.amount || 0,
        rep: v.repName || v.userId?.fullName,
        paymentType: v.paymentType,
        lineItems: v.lineItems || [],
      });
    }

    res.json({ outlets: Object.values(byOutlet) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load outlet sales history' });
  }
};


export const deleteVisit = async (req, res) => {
  try {
    const visit = await Visit.findByIdAndDelete(req.params.id);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    res.json({ message: 'Visit deleted', id: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete visit' });
  }
};

export const updateVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    const { amount, outcome, notes, shopName } = req.body;
    if (amount !== undefined) visit.amount = Number(amount) || 0;
    if (outcome) visit.outcome = outcome;
    if (notes !== undefined) visit.notes = notes;
    if (shopName) visit.shopName = shopName;
    await visit.save();
    res.json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update visit' });
  }
};
