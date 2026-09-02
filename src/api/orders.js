import api from "./axios";

// ======================================================
// Phone Normalizer
// ======================================================

export const normalizePhone = (phone) => {
  if (!phone) return "";

  let value = String(phone).replace(/\D/g, "");

  // +8801712345678 / 8801712345678
  if (value.startsWith("880")) {
    value = "0" + value.slice(3);
  }

  // 880-এর আগে 88 format handle
  if (
    value.startsWith("88") &&
    value.length === 13
  ) {
    value = "0" + value.slice(2);
  }

  // 1712345678
  if (
    value.startsWith("1") &&
    value.length === 10
  ) {
    value = "0" + value;
  }

  return value.slice(0, 11);
};

// ======================================================
// Response Unwrap Helpers
// ======================================================

/**
 * ব্যাকএন্ড অর্ডার-সম্পর্কিত এন্ডপয়েন্টে সাধারণত এই দুই ফরম্যাটে রেসপন্স দেয়:
 *   { success: true, order: {...} }   বা
 *   { ...orderFieldsDirectly }
 * এই হেল্পার দুটোই handle করে, যাতে প্রতিটা API কলে আলাদা করে
 * unwrap লজিক লিখতে না হয়।
 */
const unwrapOrder = (data) => {
  if (data?.order && typeof data.order === "object") {
    return data.order;
  }

  if (data?._id) {
    return data;
  }

  throw new Error("Invalid order response");
};

const unwrapOrders = (data) => {
  if (Array.isArray(data?.orders)) {
    return data.orders;
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
};

// ======================================================
// Orders
// ======================================================

export const getOrder = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  const response = await api.get(`/orders/${id}`);

  return unwrapOrder(response.data);
};

export const getOrders = async () => {
  const response = await api.get("/orders");

  return unwrapOrders(response.data);
};

export const updateOrderStatus = async (
  id,
  status
) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  if (!status) {
    throw new Error("Order status is required");
  }

  const response = await api.put(
    `/orders/${id}`,
    {
      status,
    }
  );

  return unwrapOrder(response.data);
};

export const updateOrder = async (
  id,
  data = {}
) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  const response = await api.put(
    `/orders/${id}`,
    data
  );

  return unwrapOrder(response.data);
};

export const deleteOrder = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  const response = await api.delete(
    `/orders/${id}`
  );

  return response.data;
};

// ======================================================
// Steadfast Courier
// ======================================================

export const confirmOrder = async (
  id,
  { createParcel = false } = {}
) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  const response = await api.post(
    `/orders/${id}/confirm`,
    {
      createParcel,
    }
  );

  return unwrapOrder(response.data);
};

export const createSteadfastParcel = async (
  id,
  { force = false } = {}
) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  const response = await api.post(
    `/orders/${id}/create-parcel`,
    {
      force,
    }
  );

  return unwrapOrder(response.data);
};

export const retryFailedParcel = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  const response = await api.post(
    `/orders/${id}/create-parcel`,
    {
      force: false,
    }
  );

  return unwrapOrder(response.data);
};

// ======================================================
// Print Status
// ======================================================

export const setPrintStatus = async (
  id,
  printStatus
) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  const response = await api.put(
    `/orders/${id}`,
    {
      printStatus,
      printedAt:
        printStatus === true
          ? new Date().toISOString()
          : null,
    }
  );

  return unwrapOrder(response.data);
};

// ======================================================
// Fraud / Courier Reliability Check
// ======================================================

export const checkFraud = async (phone) => {
  const normalizedPhone =
    normalizePhone(phone);

  if (
    !normalizedPhone ||
    normalizedPhone.length !== 11
  ) {
    throw new Error(
      "Invalid Bangladesh phone number"
    );
  }

  const response = await api.get(
    `/orders/fraud-check/${encodeURIComponent(
      normalizedPhone
    )}`
  );

  return response.data;
};