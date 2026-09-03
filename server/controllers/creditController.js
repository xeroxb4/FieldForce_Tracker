import Credit from '../models/Credit.js';

// @desc    Create a credit (owing)
// @route   POST /api/credits
export const createCredit = async (req, res) => {
  try {
    const { customerName, shopName, amount, dueDate, saleDate, outletId, notes } = req.body;

    if (!customerName || !amount || !dueDate) {
      return res.status(400).json({
        message: 'Customer name, amount and due date are required',
      });
    }

    const credit = await Credit.create({
      userId: req.user._id,
      repName: req.user.fullName,
      outletId: outletId || undefined,
      customerName: customerName.trim(),
      shopName: shopName || '',
      amount: Number(amount),
      amountPaid: 0,
      balance: Number(amount),
      dueDate,
      saleDate: saleDate || new Date().toISOString().slice(0, 10),
      status: 'pending',
      notes: notes || '',
    });

    res.status(201).json(credit);
  } catch (error) {
    console.error('Create credit error:', error);
    res.status(500).json({ message: 'Failed to create credit' });
  }
};

// @desc    Get my credits (owings)
// @route   GET /api/credits
export const getCredits = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };

    if (status && status !== 'all') {
      filter.status = status;
    } else {
      // Default: show pending, partial, overdue
      filter.status = { $in: ['pending', 'partial', 'overdue'] };
    }

    const credits = await Credit.find(filter).sort({ dueDate: 1 });

    // Auto-mark overdue
    const today = new Date().toISOString().slice(0, 10);
    for (const c of credits) {
      if (
        (c.status === 'pending' || c.status === 'partial') &&
        c.dueDate < today
      ) {
        c.status = 'overdue';
        await c.save();
      }
    }

    res.json(credits);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch credits' });
  }
};

// @desc    Mark credit as collected (full or partial)
// @route   PATCH /api/credits/:id/collect
export const collectCredit = async (req, res) => {
  try {
    const { amountPaid } = req.body;
    const credit = await Credit.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!credit) {
      return res.status(404).json({ message: 'Credit not found' });
    }

    if (credit.status === 'collected') {
      return res.status(400).json({ message: 'This credit is already fully collected' });
    }

    const paid = Number(amountPaid) || credit.balance;
    credit.amountPaid += paid;
    credit.balance = Math.max(0, credit.amount - credit.amountPaid);

    if (credit.balance <= 0) {
      credit.status = 'collected';
      credit.balance = 0;
      credit.collectedAt = new Date();
    } else {
      credit.status = 'partial';
    }

    await credit.save();
    res.json(credit);
  } catch (error) {
    console.error('Collect credit error:', error);
    res.status(500).json({ message: 'Failed to collect credit' });
  }
};

// @desc    Dashboard summary: sales, received, owings
// @route   GET /api/credits/summary
export const getSummary = async (req, res) => {
  try {
    const { month } = req.query; // "2026-09"
    const currentMonth = month || new Date().toISOString().slice(0, 7);

    // Total sales this month from visits with Order Placed
    const Visit = (await import('../models/Visit.js')).default;
    const startDate = `${currentMonth}-01`;
    const endDate = `${currentMonth}-31`;

    const visits = await Visit.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate },
      outcome: 'Order Placed',
    });

    const totalSales = visits.reduce((sum, v) => sum + (v.amount || 0), 0);

    // Credits
    const allCredits = await Credit.find({ userId: req.user._id });
    const totalOwings = allCredits
      .filter((c) => c.status !== 'collected')
      .reduce((sum, c) => sum + c.balance, 0);

    const totalReceived = allCredits.reduce((sum, c) => sum + c.amountPaid, 0);

    // Also count cash sales (Order Placed with no linked credit) as received
    // For simplicity: received = collections + (sales that weren't on credit)
    // Here we expose the three numbers clearly
    res.json({
      month: currentMonth,
      totalSales,
      received: totalReceived,
      owings: totalOwings,
      pendingCredits: allCredits.filter((c) => c.status !== 'collected').length,
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ message: 'Failed to load summary' });
  }
};
