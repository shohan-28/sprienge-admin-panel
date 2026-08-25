const axios = require('axios');

const BASE_URL = process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Api-Key': process.env.STEADFAST_API_KEY,
    'Secret-Key': process.env.STEADFAST_SECRET_KEY,
    'Content-Type': 'application/json',
  },
});

async function createParcel(order) {
  const payload = {
    invoice: String(order._id),
    recipient_name: order.name,
    recipient_phone: order.phone,
    recipient_address: `${order.address}, ${order.thana || ''}, ${order.district || ''}`,
    cod_amount: order.total,
    note: order.note || '',
    item_description: (order.items || []).map((it) => `${it.name} x${it.quantity}`).join(', '),
  };
  const { data } = await client.post('/create_order', payload);
  return data;
}

async function getStatusByConsignmentId(consignmentId) {
  const { data } = await client.get(`/status_by_cid/${consignmentId}`);
  return data;
}

async function getFraudCheck(phone) {
  const { data } = await client.get(`/fraud_check/${phone}`);
  return data;
}

module.exports = { createParcel, getStatusByConsignmentId, getFraudCheck };
