const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const steadfast = require('../services/steadfastService');

// Create order
router.post('/', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ message: 'Order Placed', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List orders
router.get('/', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch {
    res.status(404).json({ error: 'Order not found' });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm order + optional parcel creation
router.post('/:id/confirm', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = 'confirmed';
    await order.save();

    if (req.body.createParcel && order.courierStatus !== 'created') {
      try {
        const result = await steadfast.createParcel(order);
        const consignment = result.consignment || {};
        order.courier = 'steadfast';
        order.courierStatus = 'created';
        order.consignmentId = consignment.consignment_id;
        order.trackingCode = consignment.tracking_code;
        order.parcelCreatedAt = new Date();
        order.parcelError = null;
        order.courierHistory.push({ status: 'created', at: new Date() });
        await order.save();
      } catch (courierErr) {
        order.courierStatus = 'failed';
        order.parcelError = courierErr.message;
        await order.save();
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create / retry parcel
router.post('/:id/create-parcel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.courierStatus === 'created' && !req.body.force) {
      return res.json(order);
    }

    try {
      const result = await steadfast.createParcel(order);
      const consignment = result.consignment || {};
      order.courier = 'steadfast';
      order.courierStatus = 'created';
      order.consignmentId = consignment.consignment_id;
      order.trackingCode = consignment.tracking_code;
      order.parcelCreatedAt = new Date();
      order.parcelError = null;
      order.courierHistory.push({ status: req.body.force ? 'recreated' : 'created', at: new Date() });
      await order.save();
      res.json(order);
    } catch (courierErr) {
      order.courierStatus = 'failed';
      order.parcelError = courierErr.message;
      await order.save();
      res.status(502).json({ error: courierErr.message, order });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Steadfast webhook
router.post('/steadfast/webhook', async (req, res) => {
  try {
    const { consignment_id, status, tracking_code, note } = req.body;
    if (!consignment_id) return res.status(400).json({ error: 'Missing consignment_id' });

    const order = await Order.findOne({ consignmentId: String(consignment_id) });
    if (!order) return res.status(404).json({ error: 'Order not found for consignment' });

    order.courierStatus = status;
    if (tracking_code) order.trackingCode = tracking_code;
    order.courierHistory.push({ status, note, at: new Date() });
    await order.save();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fraud check proxy
router.get('/fraud-check/:phone', async (req, res) => {
  try {
    const data = await steadfast.getFraudCheck(req.params.phone);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
