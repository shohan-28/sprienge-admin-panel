const AuditLog = require('../models/AuditLog');

async function recordAudit({ action, collection, docId, adminId = 'system', before = null, after = null }) {
  try {
    await AuditLog.create({
      action,
      collection,
      docId: String(docId),
      adminId: adminId || 'system',
      before,
      after,
    });
  } catch (err) {
    // Do not throw — audit failures should not break main flow. Log to console.
    console.error('Failed to write audit log', err);
  }
}

module.exports = { recordAudit };
