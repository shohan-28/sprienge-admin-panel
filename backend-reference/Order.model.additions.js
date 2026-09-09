// models/Order.js — ADD these fields to your existing schema.
// Everything else in your current model stays exactly as-is.

const mongoose = require("mongoose");

const courierEventSchema = new mongoose.Schema(
  {
    status: String, // e.g. "pending", "delivered_approval_pending", "delivered", "cancelled"
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
    status: { type: String, default: "pending" },

    // --- Steadfast courier fields (new) ---
    courier: { type: String, default: null }, // "steadfast"
    courierStatus: { type: String, default: null }, // created | in_review | delivered | cancelled | failed ...
    consignmentId: { type: String, default: null },
    trackingCode: { type: String, default: null },
    parcelCreatedAt: { type: Date, default: null },
    parcelError: { type: String, default: null },
    courierHistory: { type: [courierEventSchema], default: [] },

    // --- Print tracking (new) ---
    printStatus: {
      type: String,
      enum: ["not_printed", "queued", "printing", "printed", "failed"],
      default: "not_printed",
    },
    printedAt: { type: Date, default: null },

    // --- Admin-panel order creation fields (new) ---
    // Orders placed by an admin (Create Order screen) carry these; orders
    // from the public checkout won't set them, which is fine — they're
    // all optional.
    tenantId: { type: String, default: null }, // which store/brand/page this order belongs to
    source: {
      type: String,
      enum: ["phone", "whatsapp", "facebook", "website", "walkin", "other"],
      default: "website",
    },
    officeOrderNote: { type: String, default: "" }, // internal note, admin-only, never shown to customer
    advanceAmount: { type: Number, default: 0 },
    additionalDiscount: { type: Number, default: 0 },
    createdBy: { type: String, default: null }, // admin id who created the order from the panel

    // --- Return / refund tracking (new) ---
    returnReason: { type: String, default: "" },
    refundAmount: { type: Number, default: 0 },
    refundStatus: {
      type: String,
      enum: ["pending", "processing", "refunded"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
