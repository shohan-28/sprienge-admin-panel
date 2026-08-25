const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: String,
    contact: String,
    address: String,
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
