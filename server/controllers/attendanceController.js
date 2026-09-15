import Attendance from '../models/Attendance.js';

// @desc    Check in attendance (GPS required)
// @route   POST /api/attendance/check-in
export const checkIn = async (req, res) => {
  try {
    const { lat, lng, accuracy, notes } = req.body;

    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return res.status(400).json({
        message:
          'GPS location is required. Please turn on your location and try again. Without GPS you will be marked as absent.',
        code: 'GPS_REQUIRED',
      });
    }

    // Basic validation – reject 0,0 or clearly invalid coords
    if (Number(lat) === 0 && Number(lng) === 0) {
      return res.status(400).json({
        message: 'Invalid GPS coordinates. Please turn on location services.',
        code: 'GPS_INVALID',
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    const attendance = await Attendance.findOneAndUpdate(
      { userId: req.user._id, date: today },
      {
        fullName: req.user.fullName,
        role: req.user.role,
        status: 'present',
        location: {
          lat: Number(lat),
          lng: Number(lng),
          accuracy: accuracy ? Number(accuracy) : undefined,
        },
        checkedInAt: new Date(),
        notes: notes || '',
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      message: 'Attendance recorded successfully',
      attendance,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Failed to record attendance' });
  }
};

// @desc    Get today's attendance status
// @route   GET /api/attendance/today
export const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today,
    });

    res.json({
      checkedIn: !!attendance && attendance.status === 'present',
      checkedOut: !!(attendance && attendance.checkedOutAt),
      attendance: attendance || null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
};

// @desc    Get attendance history
// @route   GET /api/attendance/history
export const getAttendanceHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { userId: req.user._id };

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(filter).sort({ date: -1 }).limit(60);
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch attendance history' });
  }
};

// @desc    Check out attendance (GPS required)
// @route   POST /api/attendance/check-out
export const checkOut = async (req, res) => {
  try {
    const { lat, lng, accuracy, notes } = req.body;
    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return res.status(400).json({
        message: 'GPS location is required to check out. Please turn on location.',
        code: 'GPS_REQUIRED',
      });
    }
    if (Number(lat) === 0 && Number(lng) === 0) {
      return res.status(400).json({
        message: 'Invalid GPS coordinates. Please turn on location services.',
        code: 'GPS_INVALID',
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const attendance = await Attendance.findOne({ userId: req.user._id, date: today });
    if (!attendance || attendance.status !== 'present') {
      return res.status(400).json({ message: 'You must check in before checking out.' });
    }
    if (attendance.checkedOutAt) {
      return res.json({ message: 'Already checked out', attendance });
    }

    attendance.checkedOutAt = new Date();
    attendance.checkOutLocation = {
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy ? Number(accuracy) : undefined,
    };
    if (notes) attendance.notes = (attendance.notes || '') + (attendance.notes ? ' | ' : '') + notes;
    await attendance.save();

    res.json({ message: 'Checked out successfully', attendance });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Failed to check out' });
  }
};


// @desc    Admin: attendance / check-ins for a given day
// @route   GET /api/admin/attendance?date=YYYY-MM-DD&role=omr|merchandiser
export const getAdminAttendanceByDate = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { role } = req.query;

    const filter = { date, status: 'present' };
    if (role === 'omr' || role === 'merchandiser') {
      filter.role = role;
    } else {
      filter.role = { $in: ['omr', 'merchandiser'] };
    }

    // Exclude training accounts by name pattern
    const records = await Attendance.find(filter)
      .populate('userId', 'fullName username distributor territory isTraining')
      .sort({ checkedInAt: 1 });

    const list = records
      .filter((r) => {
        const u = r.userId;
        if (u?.isTraining) return false;
        if (/training/i.test(r.fullName || '')) return false;
        if (u?.username === 'trainer' || u?.username === 'trainerm') return false;
        return true;
      })
      .map((r) => ({
        _id: r._id,
        userId: r.userId?._id || r.userId,
        fullName: r.fullName || r.userId?.fullName,
        username: r.userId?.username || '',
        role: r.role,
        distributor: r.userId?.distributor || '',
        territory: r.userId?.territory || '',
        date: r.date,
        status: r.status,
        checkedInAt: r.checkedInAt,
        checkedOutAt: r.checkedOutAt || null,
        location: r.location || null,
        checkOutLocation: r.checkOutLocation || null,
        notes: r.notes || '',
      }));

    // Also list who has NOT checked in (active non-training reps)
    const User = (await import('../models/User.js')).default;
    const roleFilter =
      role === 'omr' || role === 'merchandiser'
        ? { role }
        : { role: { $in: ['omr', 'merchandiser'] } };
    const allReps = await User.find({
      ...roleFilter,
      isActive: { $ne: false },
      isTraining: { $ne: true },
      username: { $nin: ['trainer', 'trainerm'] },
    }).select('fullName username role distributor territory');

    const presentIds = new Set(list.map((x) => String(x.userId)));
    const absent = allReps
      .filter((u) => !presentIds.has(String(u._id)))
      .map((u) => ({
        userId: u._id,
        fullName: u.fullName,
        username: u.username,
        role: u.role,
        distributor: u.distributor || '',
        territory: u.territory || '',
        status: 'absent',
        checkedInAt: null,
        checkedOutAt: null,
      }));

    res.json({
      date,
      presentCount: list.length,
      absentCount: absent.length,
      present: list,
      absent,
    });
  } catch (error) {
    console.error('Admin attendance error:', error);
    res.status(500).json({ message: 'Failed to load attendance' });
  }
};
