const mongoose = require('mongoose');

const courierEventSchema = new mongoose.Schema(
  {
    status: String,
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    district: String,
    thana: String,
    address: String,
    note: String,
    items: Array,
    subtotal: Number,
    deliveryCharge: Number,
    total: Number,
    status: { type: String, default: 'pending' },

    courier: { type: String, default: null },
    courierStatus: { type: String, default: null },
    consignmentId: { type: String, default: null },
    trackingCode: { type: String, default: null },
    parcelCreatedAt: { type: Date, default: null },
    parcelError: { type: String, default: null },
    courierHistory: { type: [courierEventSchema], default: [] },

    printStatus: {
      type: String,
      enum: ['not_printed', 'queued', 'printing', 'printed', 'failed'],
      default: 'not_printed',
    },
    printedAt: { type: Date, default: null },

    tenantId: { type: String, default: null },
    source: {
      type: String,
      enum: ['phone', 'whatsapp', 'facebook', 'website', 'walkin', 'other'],
      default: 'website',
    },
    officeOrderNote: { type: String, default: '' },
    advanceAmount: { type: Number, default: 0 },
    additionalDiscount: { type: Number, default: 0 },
    createdBy: { type: String, default: null },

    returnReason: { type: String, default: '' },
    refundAmount: { type: Number, default: 0 },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'refunded'],
      default: 'pending',
    },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

// Virtual alias for front-end: provide orderId which equals the document _id string
orderSchema.virtual('orderId').get(function () {
  return this._id ? this._id.toString() : null;
});

module.exports = mongoose.model('Order', orderSchema);
