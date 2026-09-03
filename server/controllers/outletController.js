import Outlet from '../models/Outlet.js';

// Day helpers: 1=Mon ... 6=Sat, 0=Sun
const getTodayDayNumber = () => {
  const d = new Date().getDay(); // 0=Sun ... 6=Sat
  return d === 0 ? 7 : d; // convert to 1=Mon ... 7=Sun
};

// @desc    OMR creates outlet (goes to pending)
// @route   POST /api/outlets
export const createOutlet = async (req, res) => {
  try {
    const { name, contactName, contactPhone, address, lat, lng, notes } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Outlet name is required' });
    }

    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return res.status(400).json({
        message: 'GPS location is required when creating an outlet. Please turn on location.',
        code: 'GPS_REQUIRED',
      });
    }

    const outlet = await Outlet.create({
      userId: req.user._id,
      createdBy: req.user.fullName,
      assignedTo: req.user._id, // creator is the intended OMR
      name: name.trim(),
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      address: address || '',
      territory: req.user.territory || '',
      distributor: req.user.distributor || '',
      location: {
        lat: Number(lat),
        lng: Number(lng),
      },
      status: 'pending',
      notes: notes || '',
    });

    res.status(201).json({
      message: 'Outlet submitted for admin approval',
      outlet,
    });
  } catch (error) {
    console.error('Create outlet error:', error);
    res.status(500).json({ message: 'Failed to create outlet' });
  }
};

// @desc    Get my outlets (OMR sees own; filter by status optional)
// @route   GET /api/outlets
export const getOutlets = async (req, res) => {
  try {
    const { status, today } = req.query;
    const filter = {
      $or: [{ userId: req.user._id }, { assignedTo: req.user._id }],
      isActive: true,
    };

    if (status) filter.status = status;

    // If today=true, only approved outlets assigned to today's weekday
    if (today === 'true') {
      const dayNum = getTodayDayNumber();
      filter.status = 'approved';
      filter.assignedDays = dayNum;
    }

    const outlets = await Outlet.find(filter).sort({ name: 1 });
    res.json(outlets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch outlets' });
  }
};

// @desc    Admin: list pending outlets
// @route   GET /api/outlets/pending
export const getPendingOutlets = async (req, res) => {
  try {
    const outlets = await Outlet.find({ status: 'pending', isActive: true }).sort({
      createdAt: -1,
    });
    res.json(outlets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending outlets' });
  }
};

// @desc    Admin: approve outlet + assign days of week
// @route   PATCH /api/outlets/:id/approve
export const approveOutlet = async (req, res) => {
  try {
    const { assignedDays, assignedTo } = req.body;
    // assignedDays: array of numbers 1-5 (Mon-Fri) or 1-6 for merch

    if (!assignedDays || !Array.isArray(assignedDays) || assignedDays.length === 0) {
      return res.status(400).json({
        message: 'Assign at least one day of the week (1=Mon ... 5=Fri, 6=Sat)',
      });
    }

    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found' });
    }

    outlet.status = 'approved';
    outlet.assignedDays = assignedDays.map(Number);
    if (assignedTo) outlet.assignedTo = assignedTo;
    outlet.approvedBy = req.user.fullName;
    outlet.approvedAt = new Date();
    await outlet.save();

    res.json({ message: 'Outlet approved and assigned', outlet });
  } catch (error) {
    console.error('Approve outlet error:', error);
    res.status(500).json({ message: 'Failed to approve outlet' });
  }
};

// @desc    Admin: reject outlet
// @route   PATCH /api/outlets/:id/reject
export const rejectOutlet = async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found' });
    }

    outlet.status = 'rejected';
    outlet.approvedBy = req.user.fullName;
    outlet.approvedAt = new Date();
    await outlet.save();

    res.json({ message: 'Outlet rejected', outlet });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject outlet' });
  }
};

// @desc    Update outlet (owner)
// @route   PUT /api/outlets/:id
export const updateOutlet = async (req, res) => {
  try {
    const outlet = await Outlet.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found' });
    }

    const { name, contactName, contactPhone, address, lat, lng, notes, isActive } = req.body;

    if (name) outlet.name = name.trim();
    if (contactName !== undefined) outlet.contactName = contactName;
    if (contactPhone !== undefined) outlet.contactPhone = contactPhone;
    if (address !== undefined) outlet.address = address;
    if (notes !== undefined) outlet.notes = notes;
    if (isActive !== undefined) outlet.isActive = isActive;
    if (lat !== undefined && lng !== undefined) {
      outlet.location = { lat: Number(lat), lng: Number(lng) };
    }

    // If already approved and details change significantly, could re-pending — keep simple for now
    await outlet.save();
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update outlet' });
  }
};
