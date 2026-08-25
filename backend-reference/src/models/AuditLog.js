const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema(
  {
    action: String,
    collection: String,
    docId: String,
    adminId: String,
    before: Object,
    after: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditSchema);
