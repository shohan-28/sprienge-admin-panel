const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Create product
router.post('/', async (req, res) => {
  try {
    const p = new Product(req.body);
    await p.save();
    res.status(201).json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List products
router.get('/', async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

const { requireAuth } = require('../middleware/auth');
const { recordAudit } = require('../services/auditService');

// Stock in (increase by qty) — supports variant sku or product-level
router.post('/stock-in', requireAuth, async (req, res) => {
  try {
    const { productId, variantSku, qty } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const before = product.toObject();

    if (variantSku) {
      const v = product.variants.find(x => x.sku === variantSku);
      if (!v) return res.status(404).json({ error: 'Variant not found' });
      v.stock = (v.stock || 0) + Number(qty || 0);
    } else {
      product.totalStock = (product.totalStock || 0) + Number(qty || 0);
    }

    await product.save();

    // Audit record
    await recordAudit({
      action: 'stock_in',
      collection: 'products',
      docId: product._id,
      adminId: req.admin ? String(req.admin._id) : 'system',
      before,
      after: product.toObject(),
    });

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock out (decrease)
router.post('/stock-out', requireAuth, async (req, res) => {
  try {
    const { productId, variantSku, qty } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const before = product.toObject();

    if (variantSku) {
      const v = product.variants.find(x => x.sku === variantSku);
      if (!v) return res.status(404).json({ error: 'Variant not found' });
      v.stock = Math.max(0, (v.stock || 0) - Number(qty || 0));
    } else {
      product.totalStock = Math.max(0, (product.totalStock || 0) - Number(qty || 0));
    }

    await product.save();

    // Audit record
    await recordAudit({
      action: 'stock_out',
      collection: 'products',
      docId: product._id,
      adminId: req.admin ? String(req.admin._id) : 'system',
      before,
      after: product.toObject(),
    });

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
