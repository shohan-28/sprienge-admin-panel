import api from "./axios";

export const getOrders = () => api.get("/orders").then((res) => res.data);

export const getOrder = (id) =>
  api.get(`/orders/${id}`).then((res) => res.data);

export const updateOrderStatus = (id, status) =>
  api.put(`/orders/${id}`, { status }).then((res) => res.data);

// Full order edit: customer info, address, note, items, delivery charge.
// Sends every editable field in one PUT so the backend can persist the
// whole record in a single write.
export const updateOrder = (id, data) =>
  api.put(`/orders/${id}`, data).then((res) => res.data);

export const deleteOrder = (id) =>
  api.delete(`/orders/${id}`).then((res) => res.data);

// --- Steadfast courier automation --------------------------------------
// These call new backend routes. See backend-reference/orderRoutes.js
// for the Express code to add on the server. Until that's added, these will
// 404 — the UI degrades gracefully and shows a clear error instead of crashing.

// Confirms the order (status -> confirmed) AND, if requested, kicks off
// Steadfast parcel creation in the same backend call so the two never get
// out of sync.
export const confirmOrder = (id, { createParcel = false } = {}) =>
  api
    .post(`/orders/${id}/confirm`, { createParcel })
    .then((res) => res.data);

// Creates a Steadfast consignment for an already-confirmed order.
// Backend must enforce duplicate protection (skip if courierStatus === "created"
// unless force=true is passed for an explicit re-create).
export const createSteadfastParcel = (id, { force = false } = {}) =>
  api
    .post(`/orders/${id}/create-parcel`, { force })
    .then((res) => res.data);

export const retryFailedParcel = (id) =>
  api.post(`/orders/${id}/create-parcel`, { force: false }).then((res) => res.data);

// Marks print status after a label finishes/fails printing.
export const setPrintStatus = (id, printStatus) =>
  api
    .put(`/orders/${id}`, { printStatus, printedAt: new Date().toISOString() })
    .then((res) => res.data);

// Courier-wide fraud/reliability check for a phone number — how many
// parcels this number has received across ALL Steadfast merchants, and
// what fraction were actually delivered vs cancelled/refused. Backend
// proxies this so the Steadfast API key stays server-side.
export const checkFraud = (phone) =>
  api.get(`/orders/fraud-check/${phone}`).then((res) => res.data);
