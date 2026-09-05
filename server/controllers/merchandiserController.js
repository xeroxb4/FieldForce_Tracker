import NiveaSKU from '../models/NiveaSKU.js';
import MerchVisit, { SOS_CATEGORIES } from '../models/MerchVisit.js';
import StockReceipt from '../models/StockReceipt.js';

function calcSos(row) {
  const brands = Number(row.numberOfBrands) || 0;
  const total = Number(row.totalCategoryFacings) || 0;
  const nivea = Number(row.niveaFacings) || 0;
  const sosPct = total > 0 ? Math.round((nivea / total) * 1000) / 10 : 0;
  const expectedSharePct = brands > 0 ? Math.round((100 / brands) * 10) / 10 : 0;
  const shelfAdvantage =
    expectedSharePct > 0 ? Math.round((sosPct / expectedSharePct) * 100) / 100 : 0;
  return {
    category: row.category,
    numberOfBrands: brands,
    totalCategoryFacings: total,
    niveaFacings: nivea,
    sosPct,
    expectedSharePct,
    shelfAdvantage,
  };
}

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
      if (grouped[sku.category]) grouped[sku.category].push(sku);
      else grouped.Other.push(sku);
    });
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch SKUs' });
  }
};

export const getSosCategories = async (_req, res) => {
  res.json(SOS_CATEGORIES);
};

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
    res.status(500).json({ message: 'Failed to create SKU' });
  }
};

export const createMerchVisit = async (req, res) => {
  try {
    const {
      shopName,
      date,
      visitType,
      status,
      skuEntries,
      sosRows,
      photos,
      overallNotes,
      location,
      startedAt,
    } = req.body;

    if (!shopName) {
      return res.status(400).json({ message: 'Shop name is required' });
    }

    const visitDate = date || new Date().toISOString().slice(0, 10);
    const calculatedSos = Array.isArray(sosRows)
      ? sosRows.filter((r) => r.category).map(calcSos)
      : [];

    const visit = await MerchVisit.create({
      userId: req.user._id,
      merchandiserName: req.user.fullName,
      date: visitDate,
      shopName,
      territory: req.user.territory,
      distributor: req.user.distributor,
      visitType: visitType || 'Merchandising Visit',
      status: status || 'completed',
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      skuEntries: skuEntries || [],
      sosRows: calculatedSos,
      photos: (photos || []).slice(0, 10),
      overallNotes: overallNotes || '',
      location: location || undefined,
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error('Create merch visit error:', error);
    res.status(500).json({ message: 'Failed to log merchandiser visit' });
  }
};

export const getMerchVisits = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { userId: req.user._id };
    if (date) filter.date = date;
    const visits = await MerchVisit.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch visits' });
  }
};

export const createStockReceipt = async (req, res) => {
  try {
    const { outletId, outletName, date, lines, notes, location } = req.body;
    if (!outletName) {
      return res.status(400).json({ message: 'Outlet name is required' });
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: 'Add at least one product line' });
    }

    const cleaned = lines
      .filter((l) => l.productName && Number(l.quantity) > 0)
      .map((l) => ({
        productName: l.productName,
        category: l.category || '',
        unit: ['PC', 'Pack', 'Carton'].includes(l.unit) ? l.unit : 'PC',
        quantity: Number(l.quantity),
      }));

    if (cleaned.length === 0) {
      return res.status(400).json({ message: 'Invalid product lines' });
    }

    const receipt = await StockReceipt.create({
      userId: req.user._id,
      outletId: outletId || undefined,
      outletName,
      date: date || new Date().toISOString().slice(0, 10),
      lines: cleaned,
      notes: notes || '',
      location: location || undefined,
    });

    res.status(201).json(receipt);
  } catch (error) {
    console.error('Stock receipt error:', error);
    res.status(500).json({ message: 'Failed to save stock receipt' });
  }
};

export const getStockReceipts = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { userId: req.user._id };
    if (date) filter.date = date;
    const rows = await StockReceipt.find(filter).sort({ createdAt: -1 });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stock receipts' });
  }
};
