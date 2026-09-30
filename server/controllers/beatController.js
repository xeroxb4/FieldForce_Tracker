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

/** Map outletId -> { visitId, outcome, amount } for today */
async function visitStatusToday(userId) {
  const visits = await Visit.find({
    userId,
    date: todayStr(),
    outletId: { $ne: null },
  })
    .select('outletId outcome amount')
    .sort({ createdAt: 1 });

  const map = {};
  for (const v of visits) {
    const id = String(v.outletId);
    const prev = map[id];
    // Prefer Order Placed over No Order if both exist
    if (!prev || v.outcome === 'Order Placed') {
      map[id] = {
        visitId: v._id,
        outcome: v.outcome,
        amount: v.amount || 0,
      };
    }
  }
  return map;
}

function attachVisited(outlets, statusMap) {
  return outlets.map((o) => {
    const obj = o.toObject ? o.toObject() : { ...o };
    const st = statusMap[String(o._id)];
    obj.visitedToday = !!st;
    obj.todayVisitId = st?.visitId || null;
    obj.todayOutcome = st?.outcome || null;
    obj.canCallbackOrder =
      !!st &&
      st.outcome === 'No Order' &&
      !(Number(st.amount) > 0);
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

    const statusMap = await visitStatusToday(req.user._id);
    const list = attachVisited(outlets, statusMap);

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

    const statusMap = await visitStatusToday(req.user._id);

    const byDay = {};
    for (let d = 1; d <= maxDay; d++) {
      const dayOutlets = outlets.filter((o) => (o.assignedDays || []).includes(d));
      byDay[d] = {
        dayNumber: d,
        dayName: DAY_NAMES[d],
        outlets: attachVisited(dayOutlets, statusMap),
      };
    }

    res.json({
      today: getTodayDayNumber(),
      days: byDay,
      totalOutlets: outlets.length,
      visitedToday: Object.keys(statusMap).length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load week beats' });
  }
};
