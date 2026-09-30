/*
==================================================
LABEL / PRINT SETTINGS
==================================================

These settings are local to the admin/browser.

Tenant data is NOT stored here.
Tenant data is stored on the backend/MongoDB.
*/

const DEFAULTS = {
  widthMm: 100,
  heightMm: 150,

  brandName: "BDMart",
  brandLogoUrl: "",

  // QZ Tray
  // Empty = normal browser print dialog
  printerName: "",

  // Silent auto print
  autoPrint: false,
};

const KEY = "bdmart_label_settings";

/*
==================================================
GET SETTINGS
==================================================
*/

export const getLabelSettings = () => {
  try {
    const stored =
      localStorage.getItem(KEY);

    if (!stored) {
      return { ...DEFAULTS };
    }

    const parsed =
      JSON.parse(stored);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ...DEFAULTS };
    }

    return {
      ...DEFAULTS,
      ...parsed,
    };
  } catch (error) {
    console.error(
      "GET LABEL SETTINGS ERROR:",
      error
    );

    return { ...DEFAULTS };
  }
};

/*
==================================================
SAVE SETTINGS
==================================================
*/

export const saveLabelSettings = (
  settings
) => {
  try {
    const safeSettings = {
      ...DEFAULTS,
      ...(settings || {}),
    };

    localStorage.setItem(
      KEY,
      JSON.stringify(safeSettings)
    );

    return safeSettings;
  } catch (error) {
    console.error(
      "SAVE LABEL SETTINGS ERROR:",
      error
    );

    return null;
  }
};

/*
==================================================
RESET SETTINGS
==================================================
*/

export const resetLabelSettings = () => {
  try {
    localStorage.removeItem(KEY);
  } catch (error) {
    console.error(
      "RESET LABEL SETTINGS ERROR:",
      error
    );
  }

  return { ...DEFAULTS };
};