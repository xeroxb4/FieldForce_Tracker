import Notification from '../models/Notification.js';

export const listNotifications = async (req, res) => {
  try {
    const filter =
      req.user.role === 'admin'
        ? { forRole: 'admin' }
        : { createdBy: req.user._id };

    const [list, unread, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(40)
        .populate('outletId', 'name status')
        .lean(),
      Notification.countDocuments({ ...filter, read: false }),
      Notification.countDocuments(filter),
    ]);

    res.json({ notifications: list, unread, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
};

export const markRead = async (req, res) => {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ message: 'Not found' });
    n.read = true;
    await n.save();
    res.json(n);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update' });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ forRole: 'admin', read: false }, { read: true });
    res.json({ message: 'All marked read' });
  } catch (e) {
    res.status(500).json({ message: 'Failed' });
  }
};

/** Remove read notifications so the list stays short */
export const clearReadNotifications = async (req, res) => {
  try {
    const filter =
      req.user.role === 'admin'
        ? { forRole: 'admin', read: true }
        : { createdBy: req.user._id, read: true };
    const result = await Notification.deleteMany(filter);
    res.json({ message: 'Cleared', deleted: result.deletedCount });
  } catch (e) {
    res.status(500).json({ message: 'Failed to clear' });
  }
};
