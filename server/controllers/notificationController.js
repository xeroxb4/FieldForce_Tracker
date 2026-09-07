import Notification from '../models/Notification.js';

export const listNotifications = async (req, res) => {
  try {
    const filter =
      req.user.role === 'admin'
        ? { forRole: 'admin' }
        : { createdBy: req.user._id };
    const list = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('outletId', 'name status');
    const unread = list.filter((n) => !n.read).length;
    res.json({ notifications: list, unread });
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
