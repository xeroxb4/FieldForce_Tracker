import Outlet, { AVC_TARGETS } from '../models/Outlet.js';

const getTodayDayNumber = () => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

function applyAvc(body) {
  const avcEnrolled = !!body.avcEnrolled;
  let avcTier = body.avcTier || '';
  if (avcEnrolled && !['Gold', 'Silver', 'Bronze'].includes(avcTier)) {
    return { error: 'AVC tier must be Gold, Silver, or Bronze' };
  }
  if (!avcEnrolled) avcTier = '';
  return {
    avcEnrolled,
    avcTier,
    avcTarget: avcEnrolled ? AVC_TARGETS[avcTier] || 0 : 0,
  };
}

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

    const avc = applyAvc(req.body);
    if (avc.error) return res.status(400).json({ message: avc.error });

    const outlet = await Outlet.create({
      userId: req.user._id,
      createdBy: req.user.fullName,
      assignedTo: req.user._id,
      name: name.trim(),
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      address: address || '',
      territory: req.user.territory || '',
      distributor: req.user.distributor || '',
      location: { lat: Number(lat), lng: Number(lng) },
      status: 'pending',
      notes: notes || '',
      avcEnrolled: avc.avcEnrolled,
      avcTier: avc.avcTier,
      avcTarget: avc.avcTarget,
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

export const getOutlets = async (req, res) => {
  try {
    const { status, today } = req.query;
    const filter = {
      $or: [{ userId: req.user._id }, { assignedTo: req.user._id }],
      isActive: true,
    };
    if (status) filter.status = status;
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

export const approveOutlet = async (req, res) => {
  try {
    const { assignedDays, assignedTo } = req.body;
    if (!assignedDays || !Array.isArray(assignedDays) || assignedDays.length === 0) {
      return res.status(400).json({
        message: 'Assign at least one day of the week (1=Mon ... 5=Fri, 6=Sat)',
      });
    }
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });

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

export const rejectOutlet = async (req, res) => {
  try {
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
    outlet.status = 'rejected';
    outlet.approvedBy = req.user.fullName;
    outlet.approvedAt = new Date();
    await outlet.save();
    res.json({ message: 'Outlet rejected', outlet });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject outlet' });
  }
};

export const updateOutlet = async (req, res) => {
  try {
    const outlet = await Outlet.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });

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
    if (req.body.avcEnrolled !== undefined) {
      const avc = applyAvc(req.body);
      if (avc.error) return res.status(400).json({ message: avc.error });
      outlet.avcEnrolled = avc.avcEnrolled;
      outlet.avcTier = avc.avcTier;
      outlet.avcTarget = avc.avcTarget;
    }
    await outlet.save();
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update outlet' });
  }
};
