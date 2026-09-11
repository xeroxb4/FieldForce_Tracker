import AvcShelfPhoto from '../models/AvcShelfPhoto.js';
import Outlet from '../models/Outlet.js';

function currentPeriod(d = new Date()) {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const period = day <= 15 ? 1 : 2;
  return { year, month, period, day };
}

/** OMR: list my AVC outlets + photo status for current half-month */
export const getMyAvcPhotoTasks = async (req, res) => {
  try {
    const { year, month, period } = currentPeriod();
    const outlets = await Outlet.find({
      assignedTo: req.user._id,
      avcEnrolled: true,
      status: 'approved',
      isActive: { $ne: false },
    }).sort({ avcTier: 1, name: 1 });

    const photos = await AvcShelfPhoto.find({
      userId: req.user._id,
      year,
      month,
      period,
    });
    const byOutlet = Object.fromEntries(photos.map((p) => [String(p.outletId), p]));

    res.json({
      year,
      month,
      period,
      periodLabel: period === 1 ? '1st half (1–15)' : '2nd half (16–end)',
      required: outlets.length,
      done: photos.length,
      outlets: outlets.map((o) => ({
        _id: o._id,
        name: o.displayName || o.name,
        avcTier: o.avcTier || '',
        distributor: o.distributor || req.user.distributor || '',
        photo: byOutlet[String(o._id)]
          ? {
              _id: byOutlet[String(o._id)]._id,
              photo: byOutlet[String(o._id)].photo,
              capturedAt: byOutlet[String(o._id)].capturedAt,
              notes: byOutlet[String(o._id)].notes,
            }
          : null,
        done: !!byOutlet[String(o._id)],
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load AVC photo tasks' });
  }
};

/** OMR: upload / replace shelf photo for current period */
export const uploadAvcPhoto = async (req, res) => {
  try {
    const { outletId, photo, notes, lat, lng } = req.body;
    if (!outletId || !photo) {
      return res.status(400).json({ message: 'outletId and photo are required' });
    }
    const outlet = await Outlet.findById(outletId);
    if (!outlet || !outlet.avcEnrolled) {
      return res.status(404).json({ message: 'AVC outlet not found' });
    }
    if (
      String(outlet.assignedTo) !== String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not your outlet' });
    }

    const { year, month, period } = currentPeriod();
    const doc = await AvcShelfPhoto.findOneAndUpdate(
      { outletId, year, month, period },
      {
        outletId,
        userId: req.user._id,
        shopName: outlet.displayName || outlet.name,
        distributor: outlet.distributor || req.user.distributor || '',
        avcTier: outlet.avcTier || '',
        year,
        month,
        period,
        photo,
        notes: notes || '',
        capturedAt: new Date(),
        location:
          lat != null && lng != null
            ? { lat: Number(lat), lng: Number(lng) }
            : undefined,
      },
      { upsert: true, new: true }
    );
    res.status(201).json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save AVC photo' });
  }
};

/** Admin: folder tree by distributor → tier → photos */
export const getAdminAvcGallery = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const period = req.query.period ? Number(req.query.period) : null;

    const filter = { year, month };
    if (period === 1 || period === 2) filter.period = period;
    if (req.query.distributor) filter.distributor = req.query.distributor;
    if (req.query.avcTier) filter.avcTier = req.query.avcTier;

    const photos = await AvcShelfPhoto.find(filter)
      .populate('userId', 'fullName username')
      .populate('outletId', 'name displayName avcTier distributor')
      .sort({ distributor: 1, avcTier: 1, shopName: 1, period: 1 });

    // Nested: distributor → Gold/Silver/Bronze → list
    const tree = {};
    for (const p of photos) {
      const dist = p.distributor || 'Unassigned';
      const tier = p.avcTier || 'Unspecified';
      if (!tree[dist]) tree[dist] = { Gold: [], Silver: [], Bronze: [], Unspecified: [] };
      if (!tree[dist][tier]) tree[dist][tier] = [];
      tree[dist][tier].push({
        _id: p._id,
        shopName: p.shopName,
        period: p.period,
        periodLabel: p.period === 1 ? '1st half' : '2nd half',
        photo: p.photo,
        notes: p.notes,
        capturedAt: p.capturedAt,
        omr: p.userId?.fullName,
        avcTier: tier,
        distributor: dist,
      });
    }

    res.json({
      year,
      month,
      period: period || 'all',
      total: photos.length,
      tree,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load AVC gallery' });
  }
};

export const deleteAvcPhoto = async (req, res) => {
  try {
    const photo = await AvcShelfPhoto.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete' });
  }
};
