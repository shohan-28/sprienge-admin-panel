// Label size, brand info, and printer/auto-print config.
// Defaults below are used until an admin changes them on the Settings page
// (src/pages/Settings.jsx), which persists overrides to localStorage.
const DEFAULTS = {
  widthMm: 100,
  heightMm: 150,
  brandName: "BDMart",
  brandLogoUrl: "",
  // QZ Tray settings — leave printerName empty to keep using the browser's
  // normal print dialog. Set it (via the Settings page's "Find Printers"
  // button) to switch to silent, direct-to-printer output.
  printerName: "",
  autoPrint: false,
};

const KEY = "bdmart_label_settings";

export const getLabelSettings = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return DEFAULTS;
  }
};

export const saveLabelSettings = (settings) => {
  localStorage.setItem(KEY, JSON.stringify(settings));
};
