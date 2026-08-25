const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, default: null },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lifetimeValueTag: { type: String, enum: ['VIP', 'Regular', 'New'], default: 'New' },
    blacklistFlag: { type: Boolean, default: false },
    suspiciousReason: { type: String, default: '' },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
