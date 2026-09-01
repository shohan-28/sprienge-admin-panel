// Thin wrapper around window.qz (QZ Tray's client library, loaded via CDN
// in index.html). QZ Tray is a small free local agent (https://qz.io) that
// the admin installs once on the PC connected to the printer — it lets a
// normal website send print jobs straight to an installed printer (USB,
// Bluetooth/SPP, network) with NO print dialog and NO manual "Print" click.
//
// Everything here fails soft: if QZ Tray isn't installed/running, callers
// get a clear error they can show the admin instead of a silent crash.
//
// NOTE on trust prompts: without setting up QZ Tray's certificate/signing
// (an extra one-time setup on their docs, optional), QZ Tray will show a
// one-time "Allow this website to print?" dialog per browser session —
// after clicking Allow once, all further prints in that session are fully
// silent. That's expected and not a bug.

export const isQzAvailable = () => typeof window !== "undefined" && !!window.qz;

export const ensureQzConnected = async () => {
  if (!isQzAvailable()) {
    throw new Error(
      "QZ Tray client লোড হয়নি। ইন্টারনেট সংযোগ চেক করুন (CDN script)।"
    );
  }
  if (window.qz.websocket.isActive()) return;
  try {
    await window.qz.websocket.connect();
  } catch {
    throw new Error(
      "QZ Tray-এর সাথে সংযোগ করা যায়নি। PC-তে QZ Tray চালু আছে কিনা নিশ্চিত করুন (system tray icon)।"
    );
  }
};

export const listPrinters = async () => {
  await ensureQzConnected();
  return window.qz.printers.find();
};

// Sends the label as rendered HTML straight to the given printer via QZ
// Tray's "pixel" print type — this uses the printer's normal Windows
// driver (the one created when you paired KD-582 over Bluetooth), so no
// hand-written ESC/POS or TSPL command generation is needed, and the QR
// code + text layout renders exactly like the on-screen preview.
export const printHtmlViaQz = async (printerName, html, { widthMm, heightMm } = {}) => {
  await ensureQzConnected();
  if (!printerName) {
    throw new Error(
      "কোনো প্রিন্টার সিলেক্ট করা নেই। Settings পেজে গিয়ে প্রিন্টার বেছে নিন।"
    );
  }

  const config = window.qz.configs.create(printerName, {
    size: widthMm && heightMm ? { width: widthMm, height: heightMm } : undefined,
    units: "mm",
    margins: 0,
    scaleContent: true,
  });

  const data = [
    {
      type: "pixel",
      format: "html",
      flavor: "plain",
      data: html,
    },
  ];

  await window.qz.print(config, data);
};
