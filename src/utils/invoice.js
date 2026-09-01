// A4-style printable invoice, separate from the small shipping label
// (PrintLabel.jsx). Same "build HTML string, print via a popup + browser
// print dialog" approach — no PDF library needed, since the browser's own
// print-to-PDF (in the print dialog) covers "save as PDF" already.

const currency = (n) => `\u09F3${Number(n || 0).toLocaleString("en-BD")}`;

// Deterministic, no-collision-in-practice invoice number derived from the
// order id + creation date — stable every time it's printed/reprinted
// rather than incrementing (which would need server-side coordination
// across concurrent admins to be reliable).
export const getInvoiceNumber = (order) => {
  const datePart = new Date(order.createdAt).toISOString().slice(0, 10).replace(/-/g, "");
  const idPart = order._id.slice(-6).toUpperCase();
  return `INV-${datePart}-${idPart}`;
};

export const buildInvoiceHtml = (order, { brandName = "BDMart", brandLogoUrl = "", tenantName = "" } = {}) => {
  const invoiceNo = getInvoiceNumber(order);
  const rows = (order.items || [])
    .map(
      (it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.name || ""}</td>
        <td style="text-align:center">${it.quantity || 1}</td>
        <td style="text-align:right">${currency(it.price)}</td>
        <td style="text-align:right">${currency((it.price || 0) * (it.quantity || 1))}</td>
      </tr>`
    )
    .join("");

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(invoiceNo)}`;

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${invoiceNo}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; font-family: Arial, sans-serif; }
  body { margin: 0; color: #0f172a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { height: 40px; }
  .brand-name { font-size: 22px; font-weight: 800; }
  .tenant { font-size: 12px; color: #64748b; }
  .invoice-meta { text-align: right; font-size: 12px; }
  .invoice-meta h2 { margin: 0 0 4px; font-size: 18px; }
  .section { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .section h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #64748b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 12px; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .totals { width: 260px; margin-left: auto; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals .grand { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 800; }
  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${brandLogoUrl ? `<img src="${brandLogoUrl}" />` : ""}
      <div>
        <div class="brand-name">${brandName}</div>
        ${tenantName ? `<div class="tenant">${tenantName}</div>` : ""}
      </div>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <div>${invoiceNo}</div>
      <div>${new Date(order.createdAt).toLocaleDateString("en-GB")}</div>
    </div>
  </div>

  <div class="section">
    <div>
      <h4>Bill To</h4>
      <div style="font-weight:700">${order.name || ""}</div>
      <div>${order.phone || ""}</div>
      <div>${order.address || ""}, ${order.thana || ""}, ${order.district || ""}</div>
    </div>
    <div style="text-align:right">
      <h4>Order Info</h4>
      <div>Order ID: ${order._id}</div>
      ${order.trackingCode ? `<div>Tracking: ${order.trackingCode}</div>` : ""}
      <div>Status: ${order.status}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${currency(order.subtotal)}</span></div>
    <div><span>Delivery</span><span>${currency(order.deliveryCharge)}</span></div>
    ${order.additionalDiscount ? `<div><span>Discount</span><span>-${currency(order.additionalDiscount)}</span></div>` : ""}
    ${order.advanceAmount ? `<div><span>Advance Paid</span><span>-${currency(order.advanceAmount)}</span></div>` : ""}
    <div class="grand"><span>Total Due</span><span>${currency(order.total)}</span></div>
  </div>

  <div class="footer">
    <div>Thank you for your order!</div>
    <img src="${qrUrl}" width="70" height="70" />
  </div>
</body>
</html>`;
};

export const printInvoice = (order, brandSettings) => {
  const html = buildInvoiceHtml(order, brandSettings);
  const win = window.open("", "_blank", "width=650,height=800");
  if (!win) {
    alert("পপ-আপ ব্লক করা আছে — ব্রাউজারে পপ-আপ অনুমতি দিন।");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
};
