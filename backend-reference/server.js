require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./src/config/db');

const ordersRoutes = require('./src/routes/orders');
const customersRoutes = require('./src/routes/customers');
const inventoryRoutes = require('./src/routes/inventory');

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  const app = express();
  app.use(morgan('dev'));
  app.use(cors());
  app.use(express.json());

  app.use('/api/orders', ordersRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/inventory', inventoryRoutes);

  app.get('/', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
