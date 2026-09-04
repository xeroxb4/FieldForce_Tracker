import Outlet from '../models/Outlet.js';
import Visit from '../models/Visit.js';

// 1=Mon ... 6=Sat, 7=Sun
const getTodayDayNumber = () => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

const DAY_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

// @desc    Get today's beat (approved outlets assigned to today's weekday)
// @route   GET /api/beats/today
export const getTodayBeat = async (req, res) => {
  try {
    const dayNum = getTodayDayNumber();
    const today = new Date().toISOString().slice(0, 10);

    // Working day rules
    const role = req.user.role;
    if (role === 'omr' && (dayNum === 6 || dayNum === 7)) {
      return res.json({
        date: today,
        dayName: DAY_NAMES[dayNum],
        dayNumber: dayNum,
        isWorkingDay: false,
        message: 'OMRs work Monday to Friday only',
        outlets: [],
      });
    }
    if (role === 'merchandiser' && dayNum === 7) {
      return res.json({
        date: today,
        dayName: DAY_NAMES[dayNum],
        dayNumber: dayNum,
        isWorkingDay: false,
        message: 'Merchandisers work Monday to Saturday only',
        outlets: [],
      });
    }

    const outlets = await Outlet.find({
      assignedTo: req.user._id,
      status: 'approved',
      isActive: true,
      assignedDays: dayNum,
    }).sort({ name: 1 });

    // Check which ones already visited today
    const visits = await Visit.find({
      userId: req.user._id,
      date: today,
    });
    const visitedNames = new Set(visits.map((v) => v.shopName.toLowerCase()));

    const beatOutlets = outlets.map((o) => ({
      _id: o._id,
      name: o.displayName || o.name,
      contactName: o.contactName,
      contactPhone: o.contactPhone,
      address: o.address,
      location: o.location,
      avcEnrolled: o.avcEnrolled,
      avcTier: o.avcTier,
      visited: visitedNames.has(o.name.toLowerCase()) || visitedNames.has((o.displayName || '').toLowerCase()),
    }));

    res.json({
      date: today,
      dayName: DAY_NAMES[dayNum],
      dayNumber: dayNum,
      isWorkingDay: true,
      outlets: beatOutlets,
      total: beatOutlets.length,
      visitedCount: beatOutlets.filter((o) => o.visited).length,
    });
  } catch (error) {
    console.error('Get today beat error:', error);
    res.status(500).json({ message: 'Failed to fetch today\'s beat' });
  }
};

// @desc    Get beat for a specific date (by weekday of that date)
// @route   GET /api/beats
export const getBeat = async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const dateObj = new Date(dateStr + 'T12:00:00');
    let dayNum = dateObj.getDay();
    dayNum = dayNum === 0 ? 7 : dayNum;

    const outlets = await Outlet.find({
      assignedTo: req.user._id,
      status: 'approved',
      isActive: true,
      assignedDays: dayNum,
    }).sort({ name: 1 });

    const visits = await Visit.find({
      userId: req.user._id,
      date: dateStr,
    });
    const visitedNames = new Set(visits.map((v) => v.shopName.toLowerCase()));

    res.json({
      date: dateStr,
      dayName: DAY_NAMES[dayNum],
      dayNumber: dayNum,
      outlets: outlets.map((o) => ({
        _id: o._id,
        name: o.displayName || o.name,
        contactName: o.contactName,
        contactPhone: o.contactPhone,
        address: o.address,
        location: o.location,
        avcEnrolled: o.avcEnrolled,
        avcTier: o.avcTier,
        visited: visitedNames.has(o.name.toLowerCase()),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch beat' });
  }
};
