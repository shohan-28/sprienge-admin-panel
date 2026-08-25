const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// Create customer
router.post('/', async (req, res) => {
  try {
    const c = new Customer(req.body);
    await c.save();
    res.status(201).json(c);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List customers
router.get('/', async (req, res) => {
  const customers = await Customer.find().sort({ createdAt: -1 });
  res.json(customers);
});

// Get profile with aggregated stats
router.get('/:id/profile', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const orders = await Order.find({ phone: customer.phone });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const successRate = totalOrders ? Math.round((delivered / totalOrders) * 100) : 0;

    res.json({
      customer,
      metrics: { totalOrders, totalSpent, successRate },
      orders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark blacklist
router.post('/:id/blacklist', async (req, res) => {
  try {
    const c = await Customer.findByIdAndUpdate(req.params.id, { blacklistFlag: true, suspiciousReason: req.body.reason || '' }, { new: true });
    res.json(c);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
