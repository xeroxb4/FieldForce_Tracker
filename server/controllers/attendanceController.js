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
