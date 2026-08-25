const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_local_only';

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization format' });
    const token = parts[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(payload.id).lean();
    if (!admin) return res.status(401).json({ error: 'Admin not found' });
    req.admin = admin; // attach admin info for routes
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', details: err.message });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'Unauthorized' });
    if (allowedRoles.length === 0 || allowedRoles.includes(req.admin.role)) return next();
    return res.status(403).json({ error: 'Insufficient role' });
  };
}

module.exports = { requireAuth, requireRole };
