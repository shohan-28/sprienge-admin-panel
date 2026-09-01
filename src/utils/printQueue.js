import { buildLabelHtml } from "../components/PrintLabel.jsx";
import { setPrintStatus } from "../api/orders.js";
import { printHtmlViaQz, isQzAvailable } from "./qzTray.js";

// Two delivery routes for the same label HTML:
//
// 1. QZ Tray (silent) — used automatically when Settings has a printer
//    selected. No dialog, no click; goes straight to the printer's driver
//    (works for the KD-582 over its paired Bluetooth/SPP connection).
//
// 2. Browser print dialog (fallback) — used when no QZ Tray printer is
//    configured. A small popup opens per label and the OS print dialog
//    appears; the admin clicks Print. No extra software needed.
//
// Both paths are run strictly one at a time (never in parallel), matching
// "one printer, one job at a time" from the spec.

const printOneViaQz = async (order, labelSettings) => {
  const html = buildLabelHtml(order, labelSettings);
  try {
    await printHtmlViaQz(labelSettings.printerName, html, labelSettings);
    return { order, ok: true };
  } catch (e) {
    return { order, ok: false, reason: e.message };
  }
};

const printOneViaBrowser = (order, labelSettings) =>
  new Promise((resolve) => {
    const html = buildLabelHtml(order, labelSettings);
    const win = window.open("", "_blank", "width=420,height=620");

    if (!win) {
      resolve({ order, ok: false, reason: "popup_blocked" });
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();

    win.addEventListener("afterprint", () => win.close());

    const poll = setInterval(() => {
      if (win.closed) {
        clearInterval(poll);
        resolve({ order, ok: true });
      }
    }, 400);

    win.onload = () => {
      win.focus();
      win.print();
    };
  });

// Runs orders through the print queue one at a time. Calls
// onProgress(orderId, status) as each item starts/finishes so the UI can
// show "Printing… / Printed / Failed" per row.
export const runPrintQueue = async (
  orders,
  labelSettings,
  { onProgress, markServerStatus = true } = {}
) => {
  const useQz = isQzAvailable() && !!labelSettings.printerName;
  const results = [];

  for (const order of orders) {
    onProgress?.(order._id, "printing");
    const result = useQz
      ? await printOneViaQz(order, labelSettings)
      : await printOneViaBrowser(order, labelSettings);
    results.push(result);
    onProgress?.(order._id, result.ok ? "printed" : "failed");

    if (markServerStatus) {
      try {
        await setPrintStatus(order._id, result.ok ? "printed" : "failed");
      } catch {
        // Backend route for this may not exist yet — don't block the
        // print queue on it, just leave the local UI status as-is.
      }
    }
  }
  return results;
};
