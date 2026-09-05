import Target from '../models/Target.js';
import Visit from '../models/Visit.js';

const currentMonth = () => new Date().toISOString().slice(0, 7);

export const getMyTarget = async (req, res) => {
  try {
    const month = req.query.month || currentMonth();
    let target = await Target.findOne({ userId: req.user._id, month });

    if (!target) {
      return res.json({
        month,
        targetAmount: 0,
        plannedOutlets: 0,
        achievedAmount: 0,
        percentage: 0,
        hasTarget: false,
      });
    }

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const visits = await Visit.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate },
      outcome: 'Order Placed',
    });
    const achieved = visits.reduce((sum, v) => sum + (v.amount || 0), 0);
    const percentage =
      target.targetAmount > 0
        ? Math.min(100, Math.round((achieved / target.targetAmount) * 1000) / 10)
        : 0;

    target.achievedAmount = achieved;
    target.percentage = percentage;
    await target.save();

    res.json({
      month: target.month,
      targetAmount: target.targetAmount,
      plannedOutlets: target.plannedOutlets || 0,
      achievedAmount: achieved,
      percentage,
      hasTarget: true,
    });
  } catch (error) {
    console.error('Get target error:', error);
    res.status(500).json({ message: 'Failed to fetch target' });
  }
};

export const setTarget = async (req, res) => {
  try {
    const { userId, targetAmount, plannedOutlets, month, repName } = req.body;
    const targetMonth = month || currentMonth();
    const targetUserId = userId || req.user._id;

    if (targetAmount === undefined || Number(targetAmount) < 0) {
      return res.status(400).json({ message: 'Target amount is required' });
    }

    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-31`;
    const visits = await Visit.find({
      userId: targetUserId,
      date: { $gte: startDate, $lte: endDate },
      outcome: 'Order Placed',
    });
    const achieved = visits.reduce((sum, v) => sum + (v.amount || 0), 0);
    const percentage =
      Number(targetAmount) > 0
        ? Math.min(100, Math.round((achieved / Number(targetAmount)) * 1000) / 10)
        : 0;

    const name =
      targetUserId.toString() === req.user._id.toString()
        ? req.user.fullName
        : repName || 'Unknown';

    const target = await Target.findOneAndUpdate(
      { userId: targetUserId, month: targetMonth },
      {
        repName: name,
        targetAmount: Number(targetAmount),
        plannedOutlets: Number(plannedOutlets) || 0,
        achievedAmount: achieved,
        percentage,
        setBy: req.user.fullName,
      },
      { upsert: true, new: true }
    );

    res.status(201).json(target);
  } catch (error) {
    console.error('Set target error:', error);
    res.status(500).json({ message: 'Failed to set target' });
  }
};
