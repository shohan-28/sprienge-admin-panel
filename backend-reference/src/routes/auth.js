const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_local_only';

// Login: { username, password }
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await admin.verifyPassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, admin: { id: admin._id, username: admin.username, name: admin.name, role: admin.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create initial admin (for local/dev only) — protect in production!
router.post('/register-internal', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const existing = await Admin.findOne({ username });
    if (existing) return res.status(400).json({ error: 'username exists' });
    const admin = await Admin.createWithPassword(username, password, { name, role });
    res.status(201).json({ id: admin._id, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
