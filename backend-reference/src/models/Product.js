const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    sku: String,
    attributes: Object,
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    price: Number,
    cost: Number,
    barcode: { type: String, default: '' }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: String,
    sku: String,
    barcode: String,
    price: Number,
    cost: Number,
    variants: { type: [variantSchema], default: [] },
    totalStock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    supplierId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
