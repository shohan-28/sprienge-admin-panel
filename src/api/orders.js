/* =========================================================
   API CONFIG
========================================================= */

const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ourbackend.spriengge.shop/api";

/*
  Prevent duplicate paths like:

  /api/orders/orders
  /api/orders/orders/orders

  These will all normalize to:

  /api
*/

const API_URL = RAW_API_URL
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/orders$/, "");

/* =========================================================
   COMMON REQUEST
========================================================= */

const request = async (endpoint, options = {}) => {
  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const url = `${API_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `API request failed with status ${response.status}`
      );
    }

    return data;
  } catch (error) {
    console.error("API Request Error:", {
      url,
      method: options.method || "GET",
      error: error.message,
    });

    throw error;
  }
};

/* =========================================================
   GET ALL ORDERS
========================================================= */

export const getOrders = async () => {
  const data = await request("/orders");

  /*
    Backend may return:

    [
      {...},
      {...}
    ]

    OR

    {
      orders: [...]
    }

    OR

    {
      data: [...]
    }
  */

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.orders)) {
    return data.orders;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

/* =========================================================
   GET SINGLE ORDER
========================================================= */

export const getOrder = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  return request(`/orders/${encodeURIComponent(id)}`);
};

/* =========================================================
   UPDATE ORDER
========================================================= */

export const updateOrder = async (id, payload = {}) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  return request(`/orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

export const updateOrderStatus = async (id, status) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  if (!status) {
    throw new Error("Order status is required");
  }

  return request(`/orders/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
    }),
  });
};

/* =========================================================
   DELETE ORDER
========================================================= */

export const deleteOrder = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  return request(`/orders/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

/* =========================================================
   CONFIRM ORDER
========================================================= */

export const confirmOrder = async (id, options = {}) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  return request(`/orders/${encodeURIComponent(id)}/confirm`, {
    method: "POST",
    body: JSON.stringify({
      createParcel: Boolean(options.createParcel),
    }),
  });
};

/* =========================================================
   CREATE STEADFAST PARCEL
========================================================= */

export const createSteadfastParcel = async (id, options = {}) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  return request(`/orders/${encodeURIComponent(id)}/create-parcel`, {
    method: "POST",
    body: JSON.stringify({
      force: Boolean(options.force),
    }),
  });
};

/* =========================================================
   FRAUD CHECK
========================================================= */

export const checkFraud = async (phone) => {
  if (!phone) {
    throw new Error("Phone number is required");
  }

  const cleanPhone = String(phone).trim();

  if (cleanPhone.length !== 11) {
    throw new Error("Invalid phone number");
  }

  const encodedPhone = encodeURIComponent(cleanPhone);

  return request(`/orders/fraud-check/${encodedPhone}`);
};

/*
  Backward-compatible aliases
*/

export const fraudCheck = checkFraud;

export const getFraudCheck = checkFraud;

/* =========================================================
   SET PRINT STATUS
========================================================= */

export const setPrintStatus = async (id, printStatus) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  if (!printStatus) {
    throw new Error("Print status is required");
  }

  const payload = {
    printStatus,
  };

  /*
    When order is printed, save printed time.
  */

  if (printStatus === "printed") {
    payload.printedAt = new Date().toISOString();
  } else {
    payload.printedAt = null;
  }

  return request(`/orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  getOrders,
  getOrder,

  updateOrder,
  updateOrderStatus,
  deleteOrder,

  confirmOrder,
  createSteadfastParcel,

  checkFraud,
  fraudCheck,
  getFraudCheck,

  setPrintStatus,
};