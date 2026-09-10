import Outlet from '../models/Outlet.js';
import Visit from '../models/Visit.js';

const DAY_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const getTodayDayNumber = () => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

async function visitedOutletIdsForUser(userId) {
  const visits = await Visit.find({
    userId,
    date: todayStr(),
    outletId: { $ne: null },
  }).select('outletId');
  return new Set(visits.map((v) => String(v.outletId)));
}

function attachVisited(outlets, visitedSet) {
  return outlets.map((o) => {
    const obj = o.toObject ? o.toObject() : { ...o };
    obj.visitedToday = visitedSet.has(String(o._id));
    return obj;
  });
}

export const getTodayBeat = async (req, res) => {
  try {
    const dayNum = getTodayDayNumber();
    const outlets = await Outlet.find({
      $or: [{ assignedTo: req.user._id }, { userId: req.user._id }],
      status: 'approved',
      isActive: true,
      assignedDays: dayNum,
    }).sort({ name: 1 });

    const visited = await visitedOutletIdsForUser(req.user._id);
    const list = attachVisited(outlets, visited);

    res.json({
      dayNumber: dayNum,
      dayName: DAY_NAMES[dayNum] || 'Weekend',
      outlets: list,
      count: list.length,
      visitedCount: list.filter((o) => o.visitedToday).length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load today beat' });
  }
};

export const getWeekBeat = async (req, res) => {
  try {
    const role = req.user.role;
    const maxDay = role === 'merchandiser' ? 6 : 5;

    const outlets = await Outlet.find({
      $or: [{ assignedTo: req.user._id }, { userId: req.user._id }],
      status: 'approved',
      isActive: true,
    }).sort({ name: 1 });

    const visited = await visitedOutletIdsForUser(req.user._id);

    const byDay = {};
    for (let d = 1; d <= maxDay; d++) {
      const dayOutlets = outlets.filter((o) => (o.assignedDays || []).includes(d));
      byDay[d] = {
        dayNumber: d,
        dayName: DAY_NAMES[d],
        outlets: attachVisited(dayOutlets, visited),
      };
    }

    res.json({
      today: getTodayDayNumber(),
      days: byDay,
      totalOutlets: outlets.length,
      visitedToday: visited.size,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load week beats' });
  }
};
