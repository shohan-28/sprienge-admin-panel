const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    role: { type: String, enum: ['super_admin', 'order_manager', 'inventory_manager'], default: 'order_manager' },
  },
  { timestamps: true }
);

adminSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.statics.createWithPassword = async function (username, password, opts = {}) {
  const hash = await bcrypt.hash(password, 10);
  const doc = new this({ username, passwordHash: hash, ...opts });
  return doc.save();
};

module.exports = mongoose.model('Admin', adminSchema);
