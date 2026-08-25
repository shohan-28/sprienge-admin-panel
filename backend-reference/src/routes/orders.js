const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const steadfast = require('../services/steadfastService');
const { recordAudit } = require('../services/auditService');

function getAdminIdFromReq(req, fallback) {
  return (req.admin && req.admin._id) || req.body.adminId || req.body.updatedBy || req.body.createdBy || fallback || 'system';
}

async function updateCustomerStatsForOrder(order) {
  try {
    if (!order || !order.phone) return;

    const updated = await Customer.findOneAndUpdate(
      { phone: order.phone },
      {
        $inc: { totalOrders: 1, totalSpent: order.total || 0 },
        $addToSet: { orders: order._id },
      },
      { upsert: true, new: true }
    );

    // Calculate lifetimeValueTag (simple thresholds — adjust as needed)
    const total = updated.totalSpent || 0;
    let tag = 'New';
    if (total >= 100000) tag = 'VIP';
    else if (total >= 10000) tag = 'Regular';

    if (updated.lifetimeValueTag !== tag) {
      updated.lifetimeValueTag = tag;
      await updated.save();
      await recordAudit({
        action: 'customer_ltv_update',
        collection: 'customers',
        docId: updated._id,
        adminId: 'system',
        before: null,
        after: { lifetimeValueTag: tag, totalSpent: updated.totalSpent },
      });
    }
  } catch (err) {
    console.error('Failed to update customer stats', err);
  }
}

// Create order (protected)
const { requireAuth } = require('../middleware/auth');
router.post('/', requireAuth, async (req, res) => {
  try {
    const payload = Object.assign({}, req.body, { createdBy: req.admin ? String(req.admin._id) : req.body.createdBy });
    const order = new Order(payload);
    await order.save();

    // Update customer aggregates (totalOrders, totalSpent, lifetime tag)
    updateCustomerStatsForOrder(order).catch((e) => console.error(e));

    // Audit log for creation
    await recordAudit({
      action: 'create',
      collection: 'orders',
      docId: order._id,
      adminId: getAdminIdFromReq(req, order.createdBy),
      before: null,
      after: order.toObject(),
    });

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
    const before = await Order.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'Order not found' });

    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    // If status changed, write audit
    if (before.status !== updated.status) {
      await recordAudit({
        action: 'status_change',
        collection: 'orders',
        docId: updated._id,
        adminId: getAdminIdFromReq(req, updated.createdBy),
        before: { status: before.status },
        after: { status: updated.status },
      });
    }

    // If courierStatus changed, write audit
    if (before.courierStatus !== updated.courierStatus) {
      await recordAudit({
        action: 'courier_status_change',
        collection: 'orders',
        docId: updated._id,
        adminId: getAdminIdFromReq(req, updated.createdBy),
        before: { courierStatus: before.courierStatus },
        after: { courierStatus: updated.courierStatus },
      });
    }

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

    await recordAudit({
      action: 'delete',
      collection: 'orders',
      docId: deleted._id,
      adminId: getAdminIdFromReq(req, deleted.createdBy),
      before: deleted.toObject(),
      after: null,
    });

    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm order + optional parcel creation (protected)
router.post('/:id/confirm', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const beforeStatus = order.status;
    order.status = 'confirmed';
    await order.save();

    // Audit status change
    await recordAudit({
      action: 'status_change',
      collection: 'orders',
      docId: order._id,
      adminId: getAdminIdFromReq(req, order.createdBy),
      before: { status: beforeStatus },
      after: { status: order.status },
    });

    if (req.body.createParcel && order.courierStatus !== 'created') {
      try {
        const result = await steadfast.createParcel(order);
        const consignment = result.consignment || {};
        const beforeCourier = order.courierStatus;
        order.courier = 'steadfast';
        order.courierStatus = 'created';
        order.consignmentId = consignment.consignment_id;
        order.trackingCode = consignment.tracking_code;
        order.parcelCreatedAt = new Date();
        order.parcelError = null;
        order.courierHistory.push({ status: 'created', at: new Date() });
        await order.save();

        await recordAudit({
          action: 'courier_status_change',
          collection: 'orders',
          docId: order._id,
          adminId: getAdminIdFromReq(req, order.createdBy),
          before: { courierStatus: beforeCourier },
          after: { courierStatus: order.courierStatus },
        });
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

// Create / retry parcel (protected)
router.post('/:id/create-parcel', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.courierStatus === 'created' && !req.body.force) {
      return res.json(order);
    }

    try {
      const beforeCourier = order.courierStatus;
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

      await recordAudit({
        action: 'courier_status_change',
        collection: 'orders',
        docId: order._id,
        adminId: getAdminIdFromReq(req, order.createdBy),
        before: { courierStatus: beforeCourier },
        after: { courierStatus: order.courierStatus },
      });

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

    const beforeCourier = order.courierStatus;
    order.courierStatus = status;
    if (tracking_code) order.trackingCode = tracking_code;
    order.courierHistory.push({ status, note, at: new Date() });
    await order.save();

    await recordAudit({
      action: 'courier_status_change',
      collection: 'orders',
      docId: order._id,
      adminId: 'steadfast-webhook',
      before: { courierStatus: beforeCourier },
      after: { courierStatus: order.courierStatus },
    });

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
