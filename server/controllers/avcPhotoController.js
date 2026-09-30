import AvcShelfPhoto from '../models/AvcShelfPhoto.js';
import Outlet from '../models/Outlet.js';

const MAX_SHELVES = 8;

function currentPeriod(d = new Date()) {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const period = day <= 15 ? 1 : 2;
  return { year, month, period, day };
}

function photoList(doc) {
  if (!doc) return [];
  if (typeof doc.normalizedPhotos === 'function') return doc.normalizedPhotos();
  const list = Array.isArray(doc.photos) ? [...doc.photos] : [];
  if (!list.length && doc.photo) {
    list.push({
      photo: doc.photo,
      label: 'Shelf 1',
      capturedAt: doc.capturedAt,
      location: doc.location,
    });
  }
  return list;
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

    const docs = await AvcShelfPhoto.find({
      userId: req.user._id,
      year,
      month,
      period,
    });
    const byOutlet = Object.fromEntries(docs.map((p) => [String(p.outletId), p]));

    let done = 0;
    const mapped = outlets.map((o) => {
      const doc = byOutlet[String(o._id)];
      const photos = photoList(doc);
      const has = photos.length > 0;
      if (has) done += 1;
      return {
        _id: o._id,
        name: o.displayName || o.name,
        avcTier: o.avcTier || '',
        distributor: o.distributor || req.user.distributor || '',
        photoCount: photos.length,
        maxShelves: MAX_SHELVES,
        photos: photos.map((ph, i) => ({
          _id: ph._id,
          photo: ph.photo,
          label: ph.label || `Shelf ${i + 1}`,
          capturedAt: ph.capturedAt,
        })),
        // legacy single preview
        photo: photos[0]
          ? {
              _id: doc?._id,
              photo: photos[0].photo,
              capturedAt: photos[0].capturedAt,
              notes: doc?.notes || '',
            }
          : null,
        done: has,
      };
    });

    res.json({
      year,
      month,
      period,
      periodLabel: period === 1 ? '1st half (1–15)' : '2nd half (16–end)',
      required: outlets.length,
      done,
      maxShelves: MAX_SHELVES,
      outlets: mapped,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load AVC photo tasks' });
  }
};

/** OMR: add a shelf photo (appends; does not replace existing shelves) */
export const uploadAvcPhoto = async (req, res) => {
  try {
    const { outletId, photo, notes, lat, lng, label } = req.body;
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
    let doc = await AvcShelfPhoto.findOne({ outletId, year, month, period });

    const loc =
      lat != null && lng != null
        ? { lat: Number(lat), lng: Number(lng) }
        : undefined;

    if (!doc) {
      doc = new AvcShelfPhoto({
        outletId,
        userId: req.user._id,
        shopName: outlet.displayName || outlet.name,
        distributor: outlet.distributor || req.user.distributor || '',
        avcTier: outlet.avcTier || '',
        year,
        month,
        period,
        photos: [],
        notes: notes || '',
        capturedAt: new Date(),
        location: loc,
      });
    }

    // Migrate legacy single photo into array once
    if ((!doc.photos || doc.photos.length === 0) && doc.photo) {
      doc.photos = [
        {
          photo: doc.photo,
          label: 'Shelf 1',
          capturedAt: doc.capturedAt || new Date(),
          location: doc.location,
        },
      ];
    }

    if ((doc.photos || []).length >= MAX_SHELVES) {
      return res.status(400).json({
        message: `Maximum ${MAX_SHELVES} shelf photos for this outlet this period`,
        code: 'MAX_SHELVES',
      });
    }

    const shelfNum = (doc.photos?.length || 0) + 1;
    doc.photos = doc.photos || [];
    doc.photos.push({
      photo,
      label: (label && String(label).trim()) || `Shelf ${shelfNum}`,
      capturedAt: new Date(),
      location: loc,
    });
    // Keep first image on legacy field for older admin UIs
    doc.photo = doc.photos[0]?.photo || photo;
    doc.capturedAt = new Date();
    if (notes) doc.notes = notes;
    if (loc) doc.location = loc;
    doc.userId = req.user._id;
    doc.shopName = outlet.displayName || outlet.name;
    doc.distributor = outlet.distributor || req.user.distributor || '';
    doc.avcTier = outlet.avcTier || '';

    await doc.save();
    res.status(201).json({
      message: 'Shelf photo added',
      photoCount: doc.photos.length,
      maxShelves: MAX_SHELVES,
      doc,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save AVC photo' });
  }
};

/** OMR or admin: remove one shelf image by subdocument id */
export const removeAvcShelfImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const doc = await AvcShelfPhoto.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (
      req.user.role !== 'admin' &&
      String(doc.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    doc.photos = (doc.photos || []).filter((p) => String(p._id) !== String(imageId));
    if (doc.photos.length === 0 && doc.photo) {
      // cleared all multi; clear legacy too if they deleted last
      doc.photo = '';
    } else if (doc.photos[0]) {
      doc.photo = doc.photos[0].photo;
    }
    await doc.save();
    res.json({ message: 'Shelf image removed', photoCount: doc.photos.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove shelf image' });
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
      .sort({ distributor: 1, avcTier: 1, shopName: 1, period: 1 });

    const tree = {};
    let imageTotal = 0;
    for (const p of photos) {
      const dist = p.distributor || 'Unassigned';
      const tier = p.avcTier || 'None';
      if (!tree[dist]) tree[dist] = {};
      if (!tree[dist][tier]) tree[dist][tier] = [];
      const imgs = photoList(p);
      imageTotal += imgs.length || (p.photo ? 1 : 0);
      tree[dist][tier].push({
        _id: p._id,
        shopName: p.shopName,
        period: p.period,
        periodLabel: p.period === 1 ? '1st half' : '2nd half',
        photo: imgs[0]?.photo || p.photo,
        photos: imgs.map((ph, i) => ({
          _id: ph._id,
          photo: ph.photo,
          label: ph.label || `Shelf ${i + 1}`,
          capturedAt: ph.capturedAt,
        })),
        photoCount: imgs.length || (p.photo ? 1 : 0),
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
      imageTotal,
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
