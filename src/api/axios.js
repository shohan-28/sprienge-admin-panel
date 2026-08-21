import axios from "axios";

const RAW_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// api/orders.js always calls endpoints like "/orders" and "/orders/:id".
// Some .env setups point VITE_API_URL at ".../api" and some point it at
// ".../api/orders" directly — normalize the latter back down to ".../api"
// so the calls never end up hitting ".../api/orders/orders".
const API_ROOT = RAW_BASE.replace(/\/orders\/?$/, "");

const api = axios.create({
  baseURL: API_ROOT,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
