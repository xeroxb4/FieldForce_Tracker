import Credit from '../models/Credit.js';
import User from '../models/User.js';
import Visit from '../models/Visit.js';
import WrapUp from '../models/WrapUp.js';
import MerchVisit from '../models/MerchVisit.js';
import Outlet from '../models/Outlet.js';
import Target from '../models/Target.js';
import Attendance from '../models/Attendance.js';

// @desc    Get all users

/** Hide training / demo data from live reports */
async function getTrainingUserIds() {
  const users = await User.find({
    $or: [
      { isTraining: true },
      { username: 'trainer' },
      { distributor: /training/i },
      { fullName: /training demo/i },
    ],
  }).select('_id');
  return users.map((u) => u._id);
}

function applyTrainingVisitExclude(filter, trainingIds) {
  if (trainingIds?.length) {
    filter.userId = filter.userId
      ? filter.userId
      : { $nin: trainingIds };
    if (filter.userId && !filter.userId.$nin && trainingIds.length) {
      // if specific userId set, leave it
    }
  }
  // also exclude by distributor label
  if (!filter.distributor) {
    filter.distributor = { $not: /training/i };
  }
  if (!filter.repName) {
    filter.repName = { $not: /training demo/i };
  }
  return filter;
}

export const getUsers = async (req, res) => {
  try {
    const { role, includeTraining } = req.query;
    const filter = {};
    if (role) filter.role = role;
    // Hide training accounts from live admin lists unless explicitly requested
    if (includeTraining !== '1') {
      filter.isTraining = { $ne: true };
      filter.username = { $ne: 'trainer' };
      filter.distributor = { $not: /training/i };
    }
    const users = await User.find(filter).select('-password').sort({ role: 1, fullName: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load users' });
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
    const trainingIds = await getTrainingUserIds();
    if (trainingIds.length) {
      filter.userId = { $nin: trainingIds };
    }
    filter.$and = (filter.$and || []).concat([
      { distributor: { $not: /training/i } },
      { repName: { $not: /training demo/i } },
    ]);
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
    const trainingIds = await getTrainingUserIds();
    if (trainingIds.length) filter.userId = { $nin: trainingIds };
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
      User.countDocuments({ role: 'omr', isActive: true, isTraining: { $ne: true }, username: { $ne: 'trainer' } }),
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

    const omrs = await User.find({ role: 'omr', isActive: { $ne: false }, isTraining: { $ne: true }, username: { $ne: 'trainer' } }).select('fullName username territory distributor');
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
    const trainingIds = await getTrainingUserIds();
    if (trainingIds.length) {
      filter.userId = { ...(typeof filter.userId === 'object' ? filter.userId : {}), $nin: trainingIds };
    }
    filter.$and = (filter.$and || []).concat([
      { distributor: { $not: /training/i } },
      { repName: { $not: /training demo/i } },
    ]);
    const visits = await Visit.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .populate('userId', 'fullName username')
      .lean();

    const byOutlet = {};
    const idList = [
      ...new Set(visits.map((v) => (v.outletId ? String(v.outletId) : '')).filter(Boolean)),
    ];
    let labelById = {};
    if (idList.length) {
      const odocs = await Outlet.find({ _id: { $in: idList } }).select('name displayName');
      for (const o of odocs) {
        labelById[String(o._id)] = o.displayName || o.name || '';
      }
    }
    for (const v of visits) {
      const key = String(v.outletId || v.shopName);
      const label =
        (v.outletId && labelById[String(v.outletId)]) || v.shopName || '—';
      if (!byOutlet[key]) {
        byOutlet[key] = {
          outletId: v.outletId,
          shopName: label,
          visits: 0,
          orders: 0,
          totalSales: 0,
          lastVisit: null,
          history: [],
        };
      }
      const row = byOutlet[key];
      row.shopName = label;
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

    const outlets = Object.values(byOutlet);

    // Group by OMR for hierarchical UI: OMR → customers → history
    const byOmr = {};
    for (const o of outlets) {
      // Prefer most recent history rep, else first
      const reps = {};
      for (const h of o.history || []) {
        const rn = h.rep || 'Unknown';
        if (!reps[rn]) reps[rn] = { sales: 0, visits: 0 };
        reps[rn].visits += 1;
        reps[rn].sales += h.amount || 0;
      }
      // Assign outlet to each rep who visited (or primary if only one)
      const repNames = Object.keys(reps);
      if (!repNames.length) {
        const rn = 'Unknown';
        if (!byOmr[rn]) {
          byOmr[rn] = {
            omrName: rn,
            outlets: [],
            totalSales: 0,
            totalOrders: 0,
            customerCount: 0,
          };
        }
        byOmr[rn].outlets.push(o);
        byOmr[rn].totalSales += o.totalSales || 0;
        byOmr[rn].totalOrders += o.orders || 0;
        byOmr[rn].customerCount += 1;
      } else {
        // Primary = highest sales on this outlet
        const primary = repNames.sort((a, b) => reps[b].sales - reps[a].sales)[0];
        if (!byOmr[primary]) {
          byOmr[primary] = {
            omrName: primary,
            outlets: [],
            totalSales: 0,
            totalOrders: 0,
            customerCount: 0,
          };
        }
        byOmr[primary].outlets.push(o);
        byOmr[primary].totalSales += o.totalSales || 0;
        byOmr[primary].totalOrders += o.orders || 0;
        byOmr[primary].customerCount += 1;
      }
    }

    const omrs = Object.values(byOmr).sort((a, b) => b.totalSales - a.totalSales);

    res.json({ outlets, omrs });
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
    const { amount, outcome, notes, shopName, lineItems, products, paymentType } = req.body;
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      const items = lineItems.map((li) => ({
        skuId: li.skuId,
        productName: li.productName || li.name,
        category: li.category || '',
        size: li.size || '',
        unit: li.unit || 'pc',
        quantity: Number(li.quantity) || 0,
        unitPrice: Number(li.unitPrice) || 0,
        lineTotal: Number(li.lineTotal) || 0,
      }));
      visit.lineItems = items;
      visit.amount = items.reduce((s, i) => s + (i.lineTotal || 0), 0);
      visit.products = items
        .map((i) => `${i.productName} x${i.quantity} (${i.unit}) GHS ${i.lineTotal}`)
        .join('; ');
      if (!visit.outcome || visit.outcome === 'No Order') visit.outcome = 'Order Placed';
    } else {
      if (amount !== undefined) visit.amount = Number(amount) || 0;
      if (products !== undefined) visit.products = products;
    }
    if (outcome) visit.outcome = outcome;
    if (notes !== undefined) visit.notes = notes;
    if (shopName) visit.shopName = shopName;
    if (paymentType) visit.paymentType = paymentType;
    const noteTag = ' [Sale details completed by admin]';
    if (!String(visit.notes || '').includes(noteTag)) {
      visit.notes = (visit.notes || '') + noteTag;
    }
    await visit.save();
    res.json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update visit' });
  }
};


/** Admin enters a sale on behalf of an OMR (no GPS) — physical / old-app invoices */
export const adminCreateSale = async (req, res) => {
  try {
    const {
      omrId,
      outletId,
      shopName,
      date,
      outcome = 'Order Placed',
      lineItems,
      amount,
      products,
      paymentType = 'cash',
      creditDurationWeeks,
      notes,
      noOrderReason,
    } = req.body;

    if (!omrId) return res.status(400).json({ message: 'Select an OMR' });
    const omr = await User.findById(omrId);
    if (!omr || omr.role !== 'omr') {
      return res.status(400).json({ message: 'Invalid OMR' });
    }

    let outlet = null;
    let finalShop = shopName;
    if (outletId) {
      outlet = await Outlet.findById(outletId);
      if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
      finalShop = outlet.displayName || outlet.name || shopName;
    }
    if (!finalShop) return res.status(400).json({ message: 'Shop / outlet is required' });

    const visitDate = date || new Date().toISOString().slice(0, 10);
    let items = [];
    let totalAmount = Number(amount) || 0;
    let productsStr = products || '';

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      items = lineItems.map((li) => ({
        skuId: li.skuId,
        productName: li.productName || li.name,
        category: li.category || '',
        size: li.size || '',
        unit: li.unit || 'pc',
        quantity: Number(li.quantity) || 0,
        unitPrice: Number(li.unitPrice) || 0,
        lineTotal: Number(li.lineTotal) || 0,
      }));
      totalAmount = items.reduce((s, i) => s + (i.lineTotal || 0), 0);
      productsStr = items
        .map((i) => `${i.productName} x${i.quantity} (${i.unit}) GHS ${i.lineTotal}`)
        .join('; ');
    }

    if (outcome === 'Order Placed' && totalAmount <= 0 && !productsStr) {
      return res.status(400).json({ message: 'Enter amount or product lines' });
    }

    let creditId;
    if (outcome === 'Order Placed' && paymentType === 'credit' && totalAmount > 0) {
      const weeks = Number(creditDurationWeeks) === 2 ? 2 : 1;
      const due = new Date(visitDate + 'T12:00:00');
      due.setDate(due.getDate() + weeks * 7);
      const dueDate = due.toISOString().slice(0, 10);
      const credit = await Credit.create({
        userId: omr._id,
        repName: omr.fullName,
        outletId: outlet?._id,
        customerName: outlet?.contactName || finalShop,
        shopName: finalShop,
        amount: totalAmount,
        amountPaid: 0,
        balance: totalAmount,
        dueDate,
        saleDate: visitDate,
        status: 'pending',
        notes: notes || `Admin-entered credit – ${weeks} week(s)`,
      });
      creditId = credit._id;
    }

    const visit = await Visit.create({
      userId: omr._id,
      repName: omr.fullName,
      date: visitDate,
      shopName: finalShop,
      outletId: outlet?._id,
      contactName: outlet?.contactName || '',
      contactPhone: outlet?.contactPhone || '',
      territory: omr.territory || outlet?.territory || '',
      distributor: omr.distributor || outlet?.distributor || '',
      outcome,
      noOrderReason: outcome === 'No Order' ? noOrderReason || 'Admin entry' : '',
      products: productsStr,
      lineItems: items,
      amount: totalAmount,
      paymentType: outcome === 'Order Placed' ? paymentType : '',
      creditId,
      notes: (notes || '') + ' [Entered by admin]',
      syncedFromOffline: false,
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Failed to enter sale' });
  }
};

export const adminListOmrOutlets = async (req, res) => {
  try {
    const { omrId } = req.query;
    if (!omrId) return res.status(400).json({ message: 'omrId required' });
    const outlets = await Outlet.find({
      $or: [{ assignedTo: omrId }, { userId: omrId }],
      status: 'approved',
      isActive: { $ne: false },
    }).sort({ name: 1 });
    res.json(outlets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load outlets' });
  }
};


/**
 * Top 3 / bottom 3 OMR performance (month-to-date by default)
 * Query: ?startDate=&endDate=  (defaults to current month)
 */
export const getOmrPerformanceRanking = async (req, res) => {
  try {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const defaultEnd = now.toISOString().slice(0, 10);
    const startDate = req.query.startDate || defaultStart;
    const endDate = req.query.endDate || defaultEnd;

    const trainingIds = await getTrainingUserIds();
    const omrs = await User.find({
      role: 'omr',
      isActive: { $ne: false },
      isTraining: { $ne: true },
      username: { $ne: 'trainer' },
      _id: { $nin: trainingIds },
      distributor: { $not: /training/i },
    })
      .select('fullName username distributor territory')
      .lean();

    if (!omrs.length) {
      return res.json({
        period: { startDate, endDate },
        top3: [],
        bottom3: [],
        teamAvg: null,
        note: 'No active OMRs found',
      });
    }

    const omrIds = omrs.map((u) => u._id);
    const visitFilter = {
      userId: { $in: omrIds },
      date: { $gte: startDate, $lte: endDate },
    };

    const visits = await Visit.find(visitFilter).lean();
    const attendances = await Attendance.find({
      userId: { $in: omrIds },
      date: { $gte: startDate, $lte: endDate },
    })
      .select('userId date')
      .lean();

    const outlets = await Outlet.find({
      $or: [{ assignedTo: { $in: omrIds } }, { userId: { $in: omrIds } }],
      status: 'approved',
      isActive: { $ne: false },
    })
      .select('assignedTo userId assignedDays')
      .lean();

    const attDays = {};
    for (const a of attendances) {
      const k = String(a.userId);
      attDays[k] = (attDays[k] || 0) + 1;
    }

    const outletCount = {};
    for (const o of outlets) {
      const id = String(o.assignedTo || o.userId);
      outletCount[id] = (outletCount[id] || 0) + 1;
    }

    const byUser = {};
    for (const u of omrs) {
      byUser[String(u._id)] = {
        omrId: u._id,
        name: u.fullName,
        username: u.username,
        distributor: u.distributor || '',
        territory: u.territory || '',
        sales: 0,
        orders: 0,
        visits: 0,
        productive: 0,
        noOrder: 0,
        lines: 0,
        uniqueShops: new Set(),
        attendanceDays: attDays[String(u._id)] || 0,
        outletsAssigned: outletCount[String(u._id)] || 0,
      };
    }

    for (const v of visits) {
      const id = String(v.userId);
      if (!byUser[id]) continue;
      const row = byUser[id];
      row.visits += 1;
      if (v.shopName) row.uniqueShops.add(String(v.shopName).toLowerCase());
      const productive =
        v.outcome === 'Order Placed' &&
        ((Array.isArray(v.lineItems) && v.lineItems.length > 0) || (v.amount || 0) > 0);
      if (productive) {
        row.productive += 1;
        row.orders += 1;
        row.sales += Number(v.amount) || 0;
        if (Array.isArray(v.lineItems) && v.lineItems.length) {
          row.lines += v.lineItems.length;
        } else {
          row.lines += 1;
        }
      } else if (v.outcome === 'No Order' || v.outcome === 'Follow Up') {
        row.noOrder += 1;
      }
    }

    const ranked = Object.values(byUser).map((r) => {
      const hitRate = r.visits > 0 ? (r.productive / r.visits) * 100 : 0;
      const lppc = r.productive > 0 ? r.lines / r.productive : 0;
      const avgOrder = r.orders > 0 ? r.sales / r.orders : 0;
      const shopsServed = r.uniqueShops.size;
      return {
        omrId: r.omrId,
        name: r.name,
        username: r.username,
        distributor: r.distributor,
        territory: r.territory,
        sales: Math.round(r.sales * 100) / 100,
        orders: r.orders,
        visits: r.visits,
        productiveCalls: r.productive,
        noOrderVisits: r.noOrder,
        hitRatePct: Math.round(hitRate * 10) / 10,
        lppc: Math.round(lppc * 100) / 100,
        avgOrderValue: Math.round(avgOrder * 100) / 100,
        shopsServed,
        attendanceDays: r.attendanceDays,
        outletsAssigned: r.outletsAssigned,
        salesPerVisit: r.visits > 0 ? Math.round((r.sales / r.visits) * 100) / 100 : 0,
      };
    });

    // Rank by sales; if tie, productive calls then hit rate
    ranked.sort((a, b) => {
      if (b.sales !== a.sales) return b.sales - a.sales;
      if (b.productiveCalls !== a.productiveCalls) return b.productiveCalls - a.productiveCalls;
      return b.hitRatePct - a.hitRatePct;
    });

    const withActivity = ranked.filter((r) => r.visits > 0 || r.sales > 0);
    const pool = withActivity.length >= 3 ? withActivity : ranked;

    const teamSales = pool.reduce((s, r) => s + r.sales, 0);
    const teamVisits = pool.reduce((s, r) => s + r.visits, 0);
    const teamProd = pool.reduce((s, r) => s + r.productiveCalls, 0);
    const n = pool.length || 1;
    const teamAvg = {
      sales: Math.round((teamSales / n) * 100) / 100,
      visits: Math.round((teamVisits / n) * 10) / 10,
      productiveCalls: Math.round((teamProd / n) * 10) / 10,
      hitRatePct:
        teamVisits > 0 ? Math.round((teamProd / teamVisits) * 1000) / 10 : 0,
      omrCount: ranked.length,
      activeOmrCount: withActivity.length,
    };

    function explainTop(r) {
      const reasons = [];
      if (r.sales >= teamAvg.sales * 1.25) {
        reasons.push(
          `Sales GHS ${r.sales.toLocaleString()} are well above team average GHS ${teamAvg.sales.toLocaleString()} (${Math.round((r.sales / (teamAvg.sales || 1)) * 100)}% of average).`
        );
      } else if (r.sales > teamAvg.sales) {
        reasons.push(
          `Sales GHS ${r.sales.toLocaleString()} exceed team average GHS ${teamAvg.sales.toLocaleString()}.`
        );
      } else {
        reasons.push(`Period sales: GHS ${r.sales.toLocaleString()} (${r.orders} orders).`);
      }
      if (r.hitRatePct >= teamAvg.hitRatePct + 10) {
        reasons.push(
          `Strong conversion: hit rate ${r.hitRatePct}% vs team ${teamAvg.hitRatePct}% (productive calls ÷ visits).`
        );
      } else if (r.hitRatePct >= 50) {
        reasons.push(`Solid hit rate of ${r.hitRatePct}% (${r.productiveCalls} productive of ${r.visits} visits).`);
      }
      if (r.avgOrderValue >= teamAvg.sales / Math.max(teamAvg.productiveCalls, 1) * 0.9 && r.orders > 0) {
        reasons.push(`Average order value GHS ${r.avgOrderValue.toLocaleString()} supports higher revenue per productive call.`);
      }
      if (r.lppc >= 2) {
        reasons.push(`Good basket depth: LPPC ${r.lppc} (lines per productive call).`);
      }
      if (r.shopsServed >= 8) {
        reasons.push(`Broad coverage: ${r.shopsServed} different outlets served in the period.`);
      }
      if (r.attendanceDays >= 5) {
        reasons.push(`Consistent presence: checked in ${r.attendanceDays} day(s) in the period.`);
      }
      if (r.outletsAssigned > 0 && r.shopsServed > 0) {
        const pct = Math.round((r.shopsServed / r.outletsAssigned) * 100);
        if (pct >= 40) {
          reasons.push(
            `Working a meaningful share of the book: ${r.shopsServed} of ${r.outletsAssigned} assigned outlets touched (${pct}%).`
          );
        }
      }
      if (!reasons.length) {
        reasons.push('Ranked high on combined sales volume for this period.');
      }
      return reasons;
    }

    function explainBottom(r) {
      const reasons = [];
      if (r.visits === 0 && r.sales === 0) {
        reasons.push('No visits or sales recorded in this period — activity gap is the main driver.');
        if (r.attendanceDays === 0) {
          reasons.push('No attendance check-ins in the period.');
        }
        if (r.outletsAssigned > 0) {
          reasons.push(
            `${r.outletsAssigned} outlets are assigned but none were logged as visited in this window.`
          );
        }
        return reasons;
      }
      if (r.sales < teamAvg.sales * 0.5) {
        reasons.push(
          `Sales GHS ${r.sales.toLocaleString()} are far below team average GHS ${teamAvg.sales.toLocaleString()}.`
        );
      } else if (r.sales < teamAvg.sales) {
        reasons.push(
          `Sales GHS ${r.sales.toLocaleString()} are below team average GHS ${teamAvg.sales.toLocaleString()}.`
        );
      }
      if (r.hitRatePct + 10 < teamAvg.hitRatePct && r.visits > 0) {
        reasons.push(
          `Weaker conversion: hit rate ${r.hitRatePct}% vs team ${teamAvg.hitRatePct}% — many visits without orders.`
        );
      }
      if (r.noOrderVisits >= r.productiveCalls && r.visits > 0) {
        reasons.push(
          `High no-order load: ${r.noOrderVisits} no-order/follow-up vs ${r.productiveCalls} productive calls.`
        );
      }
      if (r.avgOrderValue > 0 && r.avgOrderValue < 500 && r.orders > 0) {
        reasons.push(`Lower drop size: average order GHS ${r.avgOrderValue.toLocaleString()}.`);
      }
      if (r.lppc > 0 && r.lppc < 1.5) {
        reasons.push(`Shallow baskets: LPPC ${r.lppc} — few lines per productive call.`);
      }
      if (r.shopsServed > 0 && r.outletsAssigned > 0) {
        const pct = Math.round((r.shopsServed / r.outletsAssigned) * 100);
        if (pct < 25) {
          reasons.push(
            `Limited book coverage: only ${r.shopsServed} of ${r.outletsAssigned} assigned outlets served (${pct}%).`
          );
        }
      }
      if (r.attendanceDays <= 2 && r.visits > 0) {
        reasons.push(`Few check-in days (${r.attendanceDays}) may indicate irregular field presence.`);
      }
      if (!reasons.length) {
        reasons.push('Lower relative sales volume versus peers in this period.');
      }
      return reasons;
    }

    const top3 = pool.slice(0, 3).map((r, i) => ({
      rank: i + 1,
      ...r,
      uniqueShops: undefined,
      analysis: explainTop(r),
    }));

    // Bottom 3 among those with least sales (prefer active pool, then full list)
    const bottomPool = [...pool].sort((a, b) => {
      if (a.sales !== b.sales) return a.sales - b.sales;
      if (a.visits !== b.visits) return a.visits - b.visits;
      return a.hitRatePct - b.hitRatePct;
    });
    // Avoid duplicating names already in top3 when team is small
    const topNames = new Set(top3.map((t) => t.name));
    const bottom3 = [];
    for (const r of bottomPool) {
      if (topNames.has(r.name) && pool.length <= 3) continue;
      if (topNames.has(r.name) && pool.length > 3) continue;
      bottom3.push({
        rank: bottom3.length + 1,
        ...r,
        analysis: explainBottom(r),
      });
      if (bottom3.length >= 3) break;
    }
    // If team very small, still show bottom from sorted list
    if (bottom3.length < 3) {
      for (const r of bottomPool) {
        if (bottom3.find((b) => b.name === r.name)) continue;
        bottom3.push({
          rank: bottom3.length + 1,
          ...r,
          analysis: explainBottom(r),
        });
        if (bottom3.length >= 3) break;
      }
    }

    res.json({
      period: { startDate, endDate },
      rankingMetric: 'Month/period sales (GHS), then productive calls, then hit rate',
      teamAvg,
      top3,
      bottom3,
      allRanked: ranked.map((r, i) => ({ rank: i + 1, name: r.name, sales: r.sales, visits: r.visits, hitRatePct: r.hitRatePct })),
    });
  } catch (error) {
    console.error('OMR performance ranking error:', error);
    res.status(500).json({ message: 'Failed to load OMR performance ranking' });
  }
};
