import Outlet from '../models/Outlet.js';

const DAY_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const getTodayDayNumber = () => {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 7 : d;
};

export const getTodayBeat = async (req, res) => {
  try {
    const dayNum = getTodayDayNumber();
    // OMR works Mon-Fri only for beat enforcement; still return list
    const outlets = await Outlet.find({
      $or: [{ assignedTo: req.user._id }, { userId: req.user._id }],
      status: 'approved',
      isActive: true,
      assignedDays: dayNum,
    }).sort({ name: 1 });

    res.json({
      dayNumber: dayNum,
      dayName: DAY_NAMES[dayNum] || 'Weekend',
      outlets,
      count: outlets.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load today beat' });
  }
};

export const getWeekBeat = async (req, res) => {
  try {
    const role = req.user.role;
    const maxDay = role === 'merchandiser' ? 6 : 5; // OMR Mon-Fri, Merch Mon-Sat

    const outlets = await Outlet.find({
      $or: [{ assignedTo: req.user._id }, { userId: req.user._id }],
      status: 'approved',
      isActive: true,
    }).sort({ name: 1 });

    const byDay = {};
    for (let d = 1; d <= maxDay; d++) {
      byDay[d] = {
        dayNumber: d,
        dayName: DAY_NAMES[d],
        outlets: outlets.filter((o) => (o.assignedDays || []).includes(d)),
      };
    }

    res.json({
      today: getTodayDayNumber(),
      days: byDay,
      totalOutlets: outlets.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load week beats' });
  }
};
