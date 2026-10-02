/* =========================================================
   SPRIENGGE - ORDER API
========================================================= */

const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ourbackend.spriengge.shop/api";

const API_URL = String(RAW_API_URL)
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/orders(?:\/+)?$/, "");


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
      const message =
        data?.message ||
        data?.error ||
        data?.details ||
        `API request failed with status ${response.status}`;

      const error = new Error(message);

      error.status = response.status;
      error.response = data;
      error.url = url;

      throw error;
    }

    return data;
  } catch (error) {
    console.error("❌ Order API Error:", {
      url,
      method: options.method || "GET",
      status: error?.status || null,
      message: error?.message || "Unknown error",
      response: error?.response || null,
    });

    throw error;
  }
};


/* =========================================================
   GET ALL ORDERS

   GET /api/orders
========================================================= */

export const getOrders = async () => {
  const data = await request("/orders");

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

   GET /api/orders/:id
========================================================= */

export const getOrder = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  return request(
    `/orders/${encodeURIComponent(id)}`
  );
};


/* =========================================================
   UPDATE ORDER

   PUT /api/orders/:id

   Used for:
   - customer information
   - order status
   - payment information
   - print status
   - return/refund information
   - courier information
========================================================= */

export const updateOrder = async (
  id,
  payload = {}
) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(
      "Order update payload must be an object"
    );
  }

  return request(
    `/orders/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
};


/* =========================================================
   UPDATE ORDER STATUS

   Backend:
   PUT /api/orders/:id

   IMPORTANT:
   Backend DOES NOT have:
   PATCH /api/orders/:id/status
========================================================= */

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

  const allowedStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "returned",
    "cancelled",
    "duplicate",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid order status: ${status}`
    );
  }

  /*
    IMPORTANT:

    Confirmed status is special.

    Stock deduction happens ONLY through:

    POST /api/orders/:id/confirm

    Therefore confirmed status cannot be changed
    through updateOrderStatus().
  */

  if (status === "confirmed") {
    throw new Error(
      "Confirmed status must be set using the Confirm Order action."
    );
  }

  return updateOrder(id, {
    status,
  });
};


/* =========================================================
   CONFIRM ORDER

   POST /api/orders/:id/confirm

   Backend handles:
   - stock validation
   - stock deduction
   - status = confirmed

   Steadfast is NOT called here.
========================================================= */

export const confirmOrder = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  return request(
    `/orders/${encodeURIComponent(id)}/confirm`,
    {
      method: "POST",
    }
  );
};


/* =========================================================
   CREATE STEADFAST PARCEL

   POST /api/orders/:id/create-parcel

   This is separate from Confirm Order.
========================================================= */

export const createSteadfastParcel = async (
  id,
  options = {}
) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  return request(
    `/orders/${encodeURIComponent(id)}/create-parcel`,
    {
      method: "POST",
      body: JSON.stringify({
        force: Boolean(options?.force),
      }),
    }
  );
};


/* =========================================================
   DELETE ORDER

   DELETE /api/orders/:id
========================================================= */

export const deleteOrder = async (id) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  return request(
    `/orders/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
};


/* =========================================================
   FRAUD CHECK

   GET /api/orders/fraud-check/:phone

   Steadfast Fraud Check remains enabled.
========================================================= */

export const checkFraud = async (phone) => {
  if (!phone) {
    throw new Error("Phone number is required");
  }

  let cleanPhone = String(phone)
    .trim()
    .replace(/[^\d+]/g, "");

  /*
    +8801XXXXXXXXX
    ↓
    01XXXXXXXXX
  */

  if (cleanPhone.startsWith("+880")) {
    cleanPhone = "0" + cleanPhone.slice(4);
  }

  /*
    8801XXXXXXXXX
    ↓
    01XXXXXXXXX
  */

  if (cleanPhone.startsWith("8801")) {
    cleanPhone = "0" + cleanPhone.slice(3);
  }

  if (!/^01\d{9}$/.test(cleanPhone)) {
    throw new Error(
      "Invalid Bangladesh phone number"
    );
  }

  const encodedPhone =
    encodeURIComponent(cleanPhone);

  return request(
    `/orders/fraud-check/${encodedPhone}`
  );
};


/* =========================================================
   FRAUD CHECK ALIASES

   Different components can use any of these names.
========================================================= */

export const fraudCheck = checkFraud;

export const getFraudCheck = checkFraud;


/* =========================================================
   SET PRINT STATUS

   PUT /api/orders/:id
========================================================= */

export const setPrintStatus = async (
  id,
  printStatus
) => {
  if (!id) {
    throw new Error("Order ID is required");
  }

  if (!printStatus) {
    throw new Error("Print status is required");
  }

  const allowedPrintStatuses = [
    "not_printed",
    "queued",
    "printing",
    "printed",
    "failed",
  ];

  if (
    !allowedPrintStatuses.includes(printStatus)
  ) {
    throw new Error(
      `Invalid print status: ${printStatus}`
    );
  }

  const payload = {
    printStatus,
  };

  if (printStatus === "printed") {
    payload.printedAt =
      new Date().toISOString();
  } else {
    payload.printedAt = null;
  }

  return updateOrder(id, payload);
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

  // Fraud Check
  checkFraud,
  fraudCheck,
  getFraudCheck,

  // Print
  setPrintStatus,
};