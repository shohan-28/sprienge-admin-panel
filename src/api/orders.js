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
// Orders
// ======================================================

export const getOrder = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  const response = await api.get(`/orders/${id}`);

  const data = response.data;

  // Backend response:
  // {
  //   success: true,
  //   order: {...}
  // }

  if (data?.order) {
    return data.order;
  }

  // Fallback যদি কোনোদিন direct order পাঠানো হয়
  if (data?._id) {
    return data;
  }

  throw new Error("Invalid order response");
};

export const getOrder = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  const response = await api.get(`/orders/${id}`);

  return response.data;
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

  return response.data;
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

  return response.data;
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

  return response.data;
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

  return response.data;
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

  return response.data;
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

  return response.data;
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