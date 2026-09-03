import NiveaSKU from '../models/NiveaSKU.js';
import MerchVisit from '../models/MerchVisit.js';

// @desc    Get all active Nivea SKUs grouped by category
// @route   GET /api/merchandiser/skus
export const getSKUs = async (req, res) => {
  try {
    const skus = await NiveaSKU.find({ isActive: true }).sort({ category: 1, name: 1 });

    const grouped = {
      'Roll-on': [],
      Spray: [],
      Lotion: [],
      'Shower Gel': [],
      Other: [],
    };

    skus.forEach((sku) => {
      if (grouped[sku.category]) {
        grouped[sku.category].push(sku);
      } else {
        grouped.Other.push(sku);
      }
    });

    res.json(grouped);
  } catch (error) {
    console.error('Get SKUs error:', error);
    res.status(500).json({ message: 'Failed to fetch SKUs' });
  }
};

// @desc    Add a new Nivea SKU
// @route   POST /api/merchandiser/skus
export const createSKU = async (req, res) => {
  try {
    const { name, skuCode, category, size, barcode } = req.body;

    if (!name || !skuCode || !category) {
      return res.status(400).json({ message: 'Name, SKU code and category are required' });
    }

    const sku = await NiveaSKU.create({
      name,
      skuCode,
      category,
      size: size || '',
      barcode: barcode || '',
    });

    res.status(201).json(sku);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'SKU code already exists' });
    }
    console.error('Create SKU error:', error);
    res.status(500).json({ message: 'Failed to create SKU' });
  }
};

// @desc    Log a merchandiser shop visit with SKU data
// @route   POST /api/merchandiser/visits
export const createMerchVisit = async (req, res) => {
  try {
    const { shopName, date, skuEntries, photos, overallNotes, location } = req.body;

    if (!shopName) {
      return res.status(400).json({ message: 'Shop name is required' });
    }

    const visitDate = date || new Date().toISOString().slice(0, 10);

    const visit = await MerchVisit.create({
      userId: req.user._id,
      merchandiserName: req.user.fullName,
      date: visitDate,
      shopName,
      territory: req.user.territory,
      distributor: req.user.distributor,
      skuEntries: skuEntries || [],
      photos: photos || [],
      overallNotes: overallNotes || '',
      location: location || undefined,
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error('Create merch visit error:', error);
    res.status(500).json({ message: 'Failed to log merchandiser visit' });
  }
};

// @desc    Get merchandiser visits
// @route   GET /api/merchandiser/visits
export const getMerchVisits = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { userId: req.user._id };
    if (date) filter.date = date;

    const visits = await MerchVisit.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(visits);
  } catch (error) {
    console.error('Get merch visits error:', error);
    res.status(500).json({ message: 'Failed to fetch visits' });
  }
};
