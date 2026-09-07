import NiveaSKU from '../models/NiveaSKU.js';

export const listProducts = async (req, res) => {
  try {
    const { category, active } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;
    const products = await NiveaSKU.find(filter).sort({ category: 1, name: 1 });
    res.json(products);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to list products' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      skuCode,
      category,
      size,
      pricePc,
      pricePack,
      priceCarton,
      unitsPerPack,
      unitsPerCarton,
    } = req.body;
    if (!name || !skuCode || !category) {
      return res.status(400).json({ message: 'name, skuCode and category are required' });
    }
    const product = await NiveaSKU.create({
      name: name.trim(),
      skuCode: skuCode.trim().toUpperCase(),
      category,
      size: size || '',
      pricePc: Number(pricePc) || 0,
      pricePack: Number(pricePack) || 0,
      priceCarton: Number(priceCarton) || 0,
      unitsPerPack: Number(unitsPerPack) || 6,
      unitsPerCarton: Number(unitsPerCarton) || 12,
      isActive: true,
    });
    res.status(201).json(product);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ message: 'SKU code already exists' });
    }
    console.error(e);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await NiveaSKU.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const fields = [
      'name',
      'skuCode',
      'category',
      'size',
      'pricePc',
      'pricePack',
      'priceCarton',
      'unitsPerPack',
      'unitsPerCarton',
      'isActive',
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) product[f] = req.body[f];
    });
    await product.save();
    res.json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to update product' });
  }
};

export const removeProduct = async (req, res) => {
  try {
    const product = await NiveaSKU.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.isActive = false;
    await product.save();
    res.json({ message: 'Product deactivated', product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to remove product' });
  }
};
