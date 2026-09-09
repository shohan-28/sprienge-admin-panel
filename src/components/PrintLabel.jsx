// Single shipping label, built as an HTML string so it can be sent either
// to a popup window (browser print dialog path) or straight to QZ Tray's
// "pixel/html" print type (silent path) — same markup, two delivery routes.

const currency = (n) => `\u09F3${Number(n || 0).toLocaleString("en-BD")}`;

export const buildLabelHtml = (order, { widthMm = 100, heightMm = 150, brandName = "BDMart", brandLogoUrl = "" } = {}) => {
  const itemsRows = (order.items || [])
    .map(
      (it) => `
        <tr>
          <td>${it.name || ""}</td>
          <td style="text-align:center">${it.quantity || 1}</td>
          <td style="text-align:right">${currency(it.price)}</td>
        </tr>`
    )
    .join("");

  const qrData = encodeURIComponent(
    order.trackingCode || order.consignmentId || order._id
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrData}`;

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Label - ${order._id}</title>
<style>
  @page { size: ${widthMm}mm ${heightMm}mm; margin: 3mm; }
  * { box-sizing: border-box; font-family: Arial, sans-serif; }
  body { margin: 0; padding: 0; width: ${widthMm}mm; }
  .label { padding: 4mm; }
  .brand { display: flex; align-items: center; gap: 6px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
  .brand img { height: 24px; }
  .brand-name { font-size: 15px; font-weight: 800; }
  .cod { text-align: right; font-size: 13px; font-weight: 700; }
  .section { margin-bottom: 6px; }
  .label-title { font-size: 9px; text-transform: uppercase; color: #555; letter-spacing: 0.5px; }
  .value { font-size: 13px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
  th, td { border-bottom: 1px dashed #ccc; padding: 2px 0; text-align: left; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; border-top: 2px solid #000; padding-top: 4px; }
  .ids { font-size: 9px; }
  .ids b { font-size: 11px; }
</style>
</head>
<body>
  <div class="label">
    <div class="brand">
      ${brandLogoUrl ? `<img src="${brandLogoUrl}" />` : ""}
      <span class="brand-name">${brandName}</span>
    </div>

    <div class="section">
      <div class="label-title">Customer</div>
      <div class="value">${order.name || ""}</div>
      <div class="value">${order.phone || ""}</div>
      <div style="font-size:11px;">${order.address || ""}, ${order.thana || ""}, ${order.district || ""}</div>
    </div>

    <table>
      <thead>
        <tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="cod">COD: ${currency(order.total)}</div>

    <div class="footer">
      <div class="ids">
        Order: <b>${order._id}</b><br/>
        ${order.consignmentId ? `Consignment: <b>${order.consignmentId}</b><br/>` : ""}
        ${order.trackingCode ? `Tracking: <b>${order.trackingCode}</b>` : ""}
      </div>
      <img src="${qrUrl}" width="60" height="60" />
    </div>
  </div>
</body>
</html>`;
};
