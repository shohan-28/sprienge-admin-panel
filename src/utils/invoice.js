import { setPrintStatus } from "../api/orders.js";

/* =========================================================
   HELPERS
========================================================= */

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const currency = (value) => {
  const amount = Number(value);

  return `৳${Number.isFinite(amount) ? amount.toLocaleString("en-BD") : "0"}`;
};

/* =========================================================
   SAFE DATE
========================================================= */

const getValidDate = (value) => {
  /*
    Try provided date first
  */

  if (value) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  /*
    Fallback to current date.

    This prevents:

    RangeError: Invalid time value
  */

  return new Date();
};

/* =========================================================
   GET ORDER DATE
========================================================= */

const getOrderDate = (order) => {
  return getValidDate(
    order?.createdAt ||
      order?.updatedAt ||
      order?.orderDate ||
      order?.date
  );
};

/* =========================================================
   GET INVOICE NUMBER
========================================================= */

/*
  Stable invoice number:

  INV-YYYYMMDD-ORDERID

  Example:

  INV-20260907-A1B2C3
*/

export const getInvoiceNumber = (order = {}) => {
  /*
    If invoiceNumber already exists in database,
    always use that.
  */

  if (order?.invoiceNumber) {
    return String(order.invoiceNumber);
  }

  const date = getOrderDate(order);

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  /*
    Support MongoDB _id and fallback ids.
  */

  const rawId =
    order?._id ||
    order?.id ||
    order?.orderId ||
    "";

  const idPart = String(rawId)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6)
    .toUpperCase();

  /*
    If order ID exists
  */

  if (idPart) {
    return `INV-${year}${month}${day}-${idPart}`;
  }

  /*
    Last fallback.
  */

  return `INV-${year}${month}${day}`;
};

/* =========================================================
   GET ORDER ITEMS
========================================================= */

const getOrderItems = (order) => {
  /*
    New order structure
  */

  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items;
  }

  /*
    Backward compatibility with old single-product orders.
  */

  if (order?.productName || order?.name) {
    return [
      {
        productName:
          order.productName ||
          order.name ||
          "Product",

        productImage:
          order.productImage ||
          order.image ||
          "",

        variantId:
          order.variantId ||
          "",

        selectedColor:
          order.selectedColor ||
          order.color ||
          "",

        selectedSize:
          order.selectedSize ||
          order.size ||
          "",

        price:
          Number(order.price) || 0,

        quantity:
          Number(order.quantity) || 1,

        subtotal:
          Number(order.subtotal) ||
          Number(order.price || 0) *
            Number(order.quantity || 1),
      },
    ];
  }

  return [];
};

/* =========================================================
   BUILD ITEM ROWS
========================================================= */

const buildItemRows = (order) => {
  const items = getOrderItems(order);

  if (!items.length) {
    return `
      <tr>
        <td colspan="5" style="text-align:center;color:#64748b;">
          No items found
        </td>
      </tr>
    `;
  }

  return items
    .map((item, index) => {
      const name =
        item?.productName ||
        item?.name ||
        "Product";

      const quantity =
        Number(item?.quantity) || 1;

      const price =
        Number(item?.price) || 0;

      const subtotal =
        Number(item?.subtotal) ||
        price * quantity;

      const color = item?.selectedColor || "";

      const size = item?.selectedSize || "";

      const variantInfo = [
        color ? `Color: ${escapeHtml(color)}` : "",
        size ? `Size: ${escapeHtml(size)}` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      return `
        <tr>
          <td>${index + 1}</td>

          <td>
            <div style="font-weight:700;">
              ${escapeHtml(name)}
            </div>

            ${
              variantInfo
                ? `
                  <div
                    style="
                      margin-top:3px;
                      font-size:10px;
                      color:#64748b;
                    "
                  >
                    ${variantInfo}
                  </div>
                `
                : ""
            }
          </td>

          <td style="text-align:center;">
            ${quantity}
          </td>

          <td style="text-align:right;">
            ${currency(price)}
          </td>

          <td style="text-align:right;font-weight:600;">
            ${currency(subtotal)}
          </td>
        </tr>
      `;
    })
    .join("");
};

/* =========================================================
   BUILD INVOICE HTML
========================================================= */

export const buildInvoiceHtml = (
  order = {},
  {
    brandName = "Spriengge",
    brandLogoUrl = "",
    tenantName = "",
  } = {}
) => {
  const invoiceNo = getInvoiceNumber(order);

  const orderDate = getOrderDate(order);

  const formattedDate = orderDate.toLocaleDateString("en-GB");

  const rows = buildItemRows(order);

  const orderId = escapeHtml(
    order?._id ||
      order?.id ||
      order?.orderId ||
      "-"
  );

  const customerName = escapeHtml(
    order?.name || "Customer"
  );

  const phone = escapeHtml(
    order?.phone || ""
  );

  const addressParts = [
    order?.address,
    order?.thana,
    order?.district,
  ]
    .filter(Boolean)
    .map(escapeHtml);

  const customerAddress =
    addressParts.length > 0
      ? addressParts.join(", ")
      : "-";

  const trackingCode = escapeHtml(
    order?.trackingCode || ""
  );

  const status = escapeHtml(
    order?.status || "pending"
  );

  const paymentMethod = escapeHtml(
    order?.paymentMethod || "COD"
  );

  const paymentStatus = escapeHtml(
    order?.paymentStatus || "pending"
  );

  const subtotal =
    Number(order?.subtotal) || 0;

  const deliveryCharge =
    Number(order?.deliveryCharge) || 0;

  const additionalDiscount =
    Number(order?.additionalDiscount) || 0;

  const advanceAmount =
    Number(order?.advanceAmount) || 0;

  /*
    Calculate total safely.

    Prefer backend total if available.
  */

  const calculatedTotal =
    subtotal +
    deliveryCharge -
    additionalDiscount -
    advanceAmount;

  const total =
    Number.isFinite(Number(order?.total))
      ? Number(order.total)
      : calculatedTotal;

  const safeBrandName = escapeHtml(
    brandName || "Spriengge"
  );

  const safeTenantName = escapeHtml(
    tenantName || ""
  );

  const safeLogoUrl = escapeHtml(
    brandLogoUrl || ""
  );

  /*
    QR code contains invoice number.
  */

  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=120x120&data=` +
    encodeURIComponent(invoiceNo);

  return `
<!doctype html>

<html>
<head>

<meta charset="utf-8" />

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
/>

<title>${escapeHtml(invoiceNo)}</title>

<style>

  @page {
    size: A4;
    margin: 15mm;
  }

  * {
    box-sizing: border-box;
    font-family:
      Arial,
      "Noto Sans Bengali",
      sans-serif;
  }

  body {
    margin: 0;
    color: #0f172a;
    background: #ffffff;
  }

  .invoice {
    width: 100%;
    max-width: 100%;
  }

  /* ==============================
     HEADER
  ============================== */

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    border-bottom: 3px solid #0f172a;

    padding-bottom: 12px;
    margin-bottom: 22px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand img {
    width: auto;
    height: 42px;
    object-fit: contain;
  }

  .brand-name {
    font-size: 22px;
    font-weight: 800;
  }

  .tenant {
    margin-top: 3px;
    font-size: 11px;
    color: #64748b;
  }

  .invoice-meta {
    text-align: right;
    font-size: 12px;
    line-height: 1.6;
  }

  .invoice-meta h2 {
    margin: 0 0 3px;
    font-size: 20px;
    letter-spacing: 1px;
  }

  .invoice-number {
    font-weight: 700;
  }

  /* ==============================
     CUSTOMER / ORDER INFO
  ============================== */

  .section {
    display: flex;
    justify-content: space-between;
    gap: 30px;

    margin-bottom: 22px;
  }

  .section-column {
    width: 50%;
  }

  .section-column.right {
    text-align: right;
  }

  .section h4 {
    margin: 0 0 7px;

    font-size: 10px;
    font-weight: 700;

    text-transform: uppercase;

    color: #64748b;

    letter-spacing: 0.5px;
  }

  .customer-name {
    margin-bottom: 3px;
    font-size: 14px;
    font-weight: 700;
  }

  .customer-info {
    font-size: 12px;
    line-height: 1.6;
  }

  .order-info {
    font-size: 12px;
    line-height: 1.7;
  }

  /* ==============================
     TABLE
  ============================== */

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }

  thead {
    display: table-header-group;
  }

  tr {
    page-break-inside: avoid;
  }

  th {
    background: #f1f5f9;

    text-align: left;

    padding: 9px 8px;

    font-size: 11px;
    font-weight: 700;

    border-bottom: 1px solid #cbd5e1;
  }

  td {
    padding: 9px 8px;

    font-size: 12px;

    border-bottom: 1px solid #e2e8f0;

    vertical-align: top;
  }

  /* ==============================
     TOTALS
  ============================== */

  .summary-wrapper {
    display: flex;
    justify-content: flex-end;
  }

  .totals {
    width: 280px;
  }

  .totals-row {
    display: flex;
    justify-content: space-between;

    padding: 5px 0;

    font-size: 12px;
  }

  .totals-row.discount {
    color: #dc2626;
  }

  .totals-row.advance {
    color: #2563eb;
  }

  .totals .grand {
    display: flex;
    justify-content: space-between;

    border-top: 2px solid #0f172a;

    margin-top: 6px;
    padding-top: 9px;

    font-size: 16px;
    font-weight: 800;
  }

  /* ==============================
     PAYMENT
  ============================== */

  .payment-box {
    margin-top: 20px;

    padding: 10px 12px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;

    font-size: 11px;

    background: #f8fafc;
  }

  .payment-box strong {
    margin-right: 5px;
  }

  /* ==============================
     FOOTER
  ============================== */

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    margin-top: 30px;

    border-top: 1px solid #e2e8f0;

    padding-top: 12px;

    font-size: 10px;

    color: #64748b;
  }

  .footer-message {
    max-width: 70%;
  }

  .qr {
    width: 70px;
    height: 70px;
    object-fit: contain;
  }

  /* ==============================
     PRINT
  ============================== */

  @media print {

    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .invoice {
      width: 100%;
    }

  }

</style>

</head>

<body>

<div class="invoice">

  <!-- HEADER -->

  <div class="header">

    <div class="brand">

      ${
        safeLogoUrl
          ? `
            <img
              src="${safeLogoUrl}"
              alt="${safeBrandName}"
            />
          `
          : ""
      }

      <div>

        <div class="brand-name">
          ${safeBrandName}
        </div>

        ${
          safeTenantName
            ? `
              <div class="tenant">
                ${safeTenantName}
              </div>
            `
            : ""
        }

      </div>

    </div>

    <div class="invoice-meta">

      <h2>INVOICE</h2>

      <div class="invoice-number">
        ${escapeHtml(invoiceNo)}
      </div>

      <div>
        Date: ${formattedDate}
      </div>

    </div>

  </div>


  <!-- CUSTOMER + ORDER -->

  <div class="section">

    <div class="section-column">

      <h4>Bill To</h4>

      <div class="customer-name">
        ${customerName}
      </div>

      <div class="customer-info">
        ${phone}
      </div>

      <div class="customer-info">
        ${customerAddress}
      </div>

    </div>


    <div class="section-column right">

      <h4>Order Info</h4>

      <div class="order-info">
        <strong>Order ID:</strong>
        ${orderId}
      </div>

      ${
        trackingCode
          ? `
            <div class="order-info">
              <strong>Tracking:</strong>
              ${trackingCode}
            </div>
          `
          : ""
      }

      <div class="order-info">
        <strong>Status:</strong>
        ${status}
      </div>

    </div>

  </div>


  <!-- ITEMS -->

  <table>

    <thead>

      <tr>

        <th style="width:45px;">
          #
        </th>

        <th>
          Item
        </th>

        <th style="width:60px;text-align:center;">
          Qty
        </th>

        <th style="width:100px;text-align:right;">
          Price
        </th>

        <th style="width:110px;text-align:right;">
          Total
        </th>

      </tr>

    </thead>

    <tbody>

      ${rows}

    </tbody>

  </table>


  <!-- TOTALS -->

  <div class="summary-wrapper">

    <div class="totals">

      <div class="totals-row">

        <span>
          Subtotal
        </span>

        <span>
          ${currency(subtotal)}
        </span>

      </div>


      <div class="totals-row">

        <span>
          Delivery
        </span>

        <span>
          ${currency(deliveryCharge)}
        </span>

      </div>


      ${
        additionalDiscount > 0
          ? `
            <div class="totals-row discount">

              <span>
                Discount
              </span>

              <span>
                -${currency(additionalDiscount)}
              </span>

            </div>
          `
          : ""
      }


      ${
        advanceAmount > 0
          ? `
            <div class="totals-row advance">

              <span>
                Advance Paid
              </span>

              <span>
                -${currency(advanceAmount)}
              </span>

            </div>
          `
          : ""
      }


      <div class="grand">

        <span>
          Total Due
        </span>

        <span>
          ${currency(total)}
        </span>

      </div>

    </div>

  </div>


  <!-- PAYMENT -->

  <div class="payment-box">

    <strong>
      Payment Method:
    </strong>

    ${paymentMethod}

    &nbsp;&nbsp;

    <strong>
      Payment Status:
    </strong>

    ${paymentStatus}

  </div>


  <!-- FOOTER -->

  <div class="footer">

    <div class="footer-message">

      <div>
        Thank you for your order!
      </div>

      <div style="margin-top:4px;">
        Invoice: ${escapeHtml(invoiceNo)}
      </div>

    </div>

    <img
      class="qr"
      src="${qrUrl}"
      alt="Invoice QR"
    />

  </div>

</div>

</body>
</html>
`;
};

/* =========================================================
   PRINT INVOICE
========================================================= */

export const printInvoice = async (
  order,
  brandSettings = {}
) => {
  if (!order) {
    console.error("Cannot print invoice: order is missing");
    return;
  }

  const html = buildInvoiceHtml(
    order,
    brandSettings
  );

  const win = window.open(
    "",
    "_blank",
    "width=850,height=900"
  );

  if (!win) {
    alert(
      "পপ-আপ ব্লক করা আছে — ব্রাউজারে পপ-আপ অনুমতি দিন।"
    );

    return;
  }

  try {
    win.document.open();

    win.document.write(html);

    win.document.close();

    /*
      Wait for document/images to load.
    */

    win.onload = async () => {
      win.focus();

      /*
        Mark invoice as printed.

        This is intentionally non-blocking.
        Even if API fails, printing should continue.
      */

      try {
        if (order?._id) {
          await setPrintStatus(
            order._id,
            "printed"
          );
        }
      } catch (error) {
        console.error(
          "Failed to update print status:",
          error
        );
      }

      win.print();
    };

  } catch (error) {
    console.error(
      "Failed to print invoice:",
      error
    );

    try {
      win.close();
    } catch {
      // Ignore
    }
  }
};