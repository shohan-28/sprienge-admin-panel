import { useEffect, useState } from "react";
import {
  Save,
  Printer,
  Wifi,
  WifiOff,
  RefreshCw,
  Store,
  Plus,
  Trash2,
} from "lucide-react";

import AdminLayout from "../layouts/AdminLayout.jsx";

import {
  getLabelSettings,
  saveLabelSettings,
} from "../config/settings.js";

import {
  runPrintQueue,
} from "../utils/printQueue.js";

import {
  listPrinters,
  isQzAvailable,
} from "../utils/qzTray.js";

import {
  getTenants,
  addTenant,
  removeTenant,
} from "../config/tenants.js";

/*
==================================================
SAMPLE ORDER
==================================================
*/

const SAMPLE_ORDER = {
  _id: "SAMPLE-0001",

  name: "Test Customer",

  phone: "01700000000",

  address: "House 12, Road 5",

  deliveryArea: "inside-dhaka",

  total: 1250,

  consignmentId: "SF-DEMO-123",

  trackingCode: "TRK-DEMO-123",

  items: [
    {
      name: "Sample Product",
      quantity: 2,
      price: 500,
    },
  ],
};

/*
==================================================
SETTINGS
==================================================
*/

const Settings = () => {
  /*
  ==================================================
  LABEL SETTINGS
  ==================================================
  */

  const [settings, setSettings] = useState(
    getLabelSettings()
  );

  const [saved, setSaved] = useState(false);

  /*
  ==================================================
  PRINTER
  ==================================================
  */

  const [printers, setPrinters] = useState([]);

  const [findingPrinters, setFindingPrinters] =
    useState(false);

  const [qzError, setQzError] = useState("");

  /*
  ==================================================
  TENANTS
  ==================================================
  */

  const [tenants, setTenants] = useState([]);

  const [loadingTenants, setLoadingTenants] =
    useState(true);

  const [tenantLoading, setTenantLoading] =
    useState(false);

  const [tenantError, setTenantError] =
    useState("");

  const [newTenantName, setNewTenantName] =
    useState("");

  const [newTenantLogo, setNewTenantLogo] =
    useState("");

  /*
  ==================================================
  LOAD TENANTS FROM SERVER
  ==================================================
  */

  const loadTenants = async () => {
    setLoadingTenants(true);
    setTenantError("");

    try {
      const data = await getTenants();

      setTenants(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "LOAD TENANTS ERROR:",
        error
      );

      setTenantError(
        error?.message ||
          "Tenant list load করতে সমস্যা হয়েছে।"
      );

      setTenants([]);
    } finally {
      setLoadingTenants(false);
    }
  };

  /*
  ==================================================
  INITIAL LOAD
  ==================================================
  */

  useEffect(() => {
    loadTenants();
  }, []);

  /*
  ==================================================
  LABEL SETTINGS CHANGE
  ==================================================
  */

  const handleChange = (
    field,
    value
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  };

  /*
  ==================================================
  SAVE LABEL SETTINGS
  ==================================================
  */

  const handleSave = () => {
    try {
      saveLabelSettings(settings);

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (error) {
      console.error(
        "SAVE SETTINGS ERROR:",
        error
      );
    }
  };

  /*
  ==================================================
  TEST PRINT
  ==================================================
  */

  const handleTestPrint = async () => {
    setQzError("");

    try {
      await runPrintQueue(
        [SAMPLE_ORDER],
        settings,
        {
          markServerStatus: false,
        }
      );
    } catch (error) {
      console.error(
        "TEST PRINT ERROR:",
        error
      );

      setQzError(
        error?.message ||
          "Test print করতে সমস্যা হয়েছে।"
      );
    }
  };

  /*
  ==================================================
  FIND PRINTERS
  ==================================================
  */

  const handleFindPrinters =
    async () => {
      setQzError("");
      setFindingPrinters(true);

      try {
        const found =
          await listPrinters();

        const printerList =
          Array.isArray(found)
            ? found
            : [];

        setPrinters(
          printerList
        );

        if (
          printerList.length ===
          0
        ) {
          setQzError(
            "কোনো প্রিন্টার পাওয়া যায়নি — PC-তে প্রিন্টার ইনস্টল/paired আছে কিনা চেক করুন।"
          );
        }
      } catch (error) {
        console.error(
          "FIND PRINTER ERROR:",
          error
        );

        setQzError(
          error?.message ||
            "প্রিন্টার খুঁজে পাওয়া যায়নি।"
        );
      } finally {
        setFindingPrinters(false);
      }
    };

  /*
  ==================================================
  ADD TENANT
  ==================================================
  */

  const handleAddTenant =
    async () => {
      const name =
        newTenantName.trim();

      const logo =
        newTenantLogo.trim();

      if (!name) {
        setTenantError(
          "নতুন Tenant/Store নাম দিন।"
        );

        return;
      }

      setTenantLoading(true);
      setTenantError("");

      try {
        const created =
          await addTenant(
            name,
            logo
          );

        if (created) {
          /*
          ------------------------------------------
          Add server-created tenant to UI
          ------------------------------------------
          */

          setTenants(
            (current) => [
              created,
              ...current,
            ]
          );
        } else {
          await loadTenants();
        }

        setNewTenantName("");
        setNewTenantLogo("");
      } catch (error) {
        console.error(
          "ADD TENANT ERROR:",
          error
        );

        setTenantError(
          error?.message ||
            "Tenant তৈরি করতে সমস্যা হয়েছে।"
        );
      } finally {
        setTenantLoading(false);
      }
    };

  /*
  ==================================================
  REMOVE TENANT
  ==================================================
  */

  const handleRemoveTenant =
    async (id) => {
      if (!id) {
        return;
      }

      const tenant =
        tenants.find(
          (item) =>
            item.id === id ||
            item.tenantId === id
        );

      const tenantName =
        tenant?.name ||
        "এই Tenant";

      const confirmed =
        window.confirm(
          `${tenantName} মুছে ফেলতে চান?\n\nএর সাথে যুক্ত Product/Order database থেকে delete হবে না। শুধু Tenant inactive হয়ে যাবে।`
        );

      if (!confirmed) {
        return;
      }

      setTenantLoading(true);
      setTenantError("");

      try {
        await removeTenant(id);

        /*
        ------------------------------------------
        Remove from current UI
        ------------------------------------------
        */

        setTenants(
          (current) =>
            current.filter(
              (item) =>
                item.id !== id &&
                item.tenantId !== id
            )
        );
      } catch (error) {
        console.error(
          "REMOVE TENANT ERROR:",
          error
        );

        setTenantError(
          error?.message ||
            "Tenant remove করতে সমস্যা হয়েছে।"
        );
      } finally {
        setTenantLoading(false);
      }
    };

  /*
  ==================================================
  RENDER
  ==================================================
  */

  return (
    <AdminLayout
      title="Settings"
      subtitle="লেবেল, প্রিন্টার ও অটো-প্রিন্ট কনফিগার করুন"
    >
      <div className="max-w-xl space-y-5">

        {/* ==================================================
            LABEL SETTINGS
        ================================================== */}

        <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
          <h3 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-ink-900">
            <Printer
              size={17}
              className="text-brand-600"
            />

            শিপিং লেবেল সেটিংস
          </h3>

          <p className="mb-5 text-xs text-slate-400">
            আপনার থার্মাল প্রিন্টারের লেবেল
            স্টকের সাইজ অনুযায়ী এখানে
            পরিবর্তন করুন।
          </p>

          <div className="grid grid-cols-2 gap-4">

            {/* WIDTH */}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Width (mm)
              </label>

              <input
                type="number"
                value={
                  settings.widthMm
                }
                onChange={(e) =>
                  handleChange(
                    "widthMm",
                    Number(
                      e.target.value
                    )
                  )
                }
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* HEIGHT */}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Height (mm)
              </label>

              <input
                type="number"
                value={
                  settings.heightMm
                }
                onChange={(e) =>
                  handleChange(
                    "heightMm",
                    Number(
                      e.target.value
                    )
                  )
                }
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* BRAND NAME */}

            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Brand Name (লেবেলে দেখাবে)
              </label>

              <input
                value={
                  settings.brandName
                }
                onChange={(e) =>
                  handleChange(
                    "brandName",
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* BRAND LOGO */}

            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Brand Logo URL (ঐচ্ছিক)
              </label>

              <input
                value={
                  settings.brandLogoUrl
                }
                onChange={(e) =>
                  handleChange(
                    "brandLogoUrl",
                    e.target.value
                  )
                }
                placeholder="https://..."
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        {/* ==================================================
            QZ TRAY / PRINTER
        ================================================== */}

        <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
          <h3 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-ink-900">

            {isQzAvailable() ? (
              <Wifi
                size={17}
                className="text-emerald-600"
              />
            ) : (
              <WifiOff
                size={17}
                className="text-slate-400"
              />
            )}

            সাইলেন্ট প্রিন্টিং (QZ Tray)
          </h3>

          <p className="mb-4 text-xs text-slate-400">
            KD-582 বা অন্য যেকোনো installed
            প্রিন্টারে popup ছাড়াই সরাসরি
            প্রিন্ট পাঠাতে হলে PC-তে{" "}
            <a
              href="https://qz.io/download/"
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 underline"
            >
              QZ Tray
            </a>{" "}
            ইনস্টল করে চালু রাখুন, তারপর
            নিচে "প্রিন্টার খুঁজুন" চাপুন।
            প্রিন্টার সিলেক্ট না করলে সাধারণ
            browser print dialog ব্যবহার হবে।
          </p>

          {/* FIND PRINTER */}

          <button
            onClick={
              handleFindPrinters
            }
            disabled={
              findingPrinters
            }
            className="mb-3 flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-mist-100 disabled:opacity-60"
          >
            {findingPrinters ? (
              <Loader2Icon />
            ) : (
              <RefreshCw
                size={13}
              />
            )}

            {findingPrinters
              ? "খোঁজা হচ্ছে..."
              : "প্রিন্টার খুঁজুন"}
          </button>

          {/* QZ ERROR */}

          {qzError && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {qzError}
            </p>
          )}

          {/* PRINTER LIST */}

          {printers.length > 0 && (
            <div className="mb-4">

              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                প্রিন্টার সিলেক্ট করুন
              </label>

              <select
                value={
                  settings.printerName
                }
                onChange={(e) =>
                  handleChange(
                    "printerName",
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">
                  — browser print dialog
                  ব্যবহার করুন —
                </option>

                {printers.map(
                  (p) => (
                    <option
                      key={p}
                      value={p}
                    >
                      {p}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* AUTO PRINT */}

          {settings.printerName && (
            <label className="flex items-center gap-2.5 rounded-xl bg-mist-50 px-3.5 py-3 text-sm">

              <input
                type="checkbox"
                checked={
                  settings.autoPrint
                }
                onChange={(e) =>
                  handleChange(
                    "autoPrint",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border-mist-300 text-brand-600 focus:ring-brand-500"
              />

              <span>
                <span className="font-semibold text-ink-900">
                  Auto Print চালু করুন
                </span>

                <br />

                <span className="text-xs text-slate-400">
                  ON থাকলে Steadfast parcel
                  তৈরি হওয়া মাত্রই label
                  automatically{" "}
                  {
                    settings.printerName
                  }
                  -তে প্রিন্ট হয়ে যাবে,
                  কোনো বাটন চাপতে হবে না।
                </span>
              </span>
            </label>
          )}
        </div>

        {/* ==================================================
            TENANT / STORE MANAGEMENT
        ================================================== */}

        <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-card">

          <h3 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-ink-900">

            <Store
              size={17}
              className="text-brand-600"
            />

            Tenant / Store ব্যবস্থাপনা
          </h3>

          <p className="mb-4 text-xs leading-5 text-slate-400">
            একাধিক ব্র্যান্ড/পেজ/স্টোর থেকে
            অর্ডার আসলে, প্রতিটাকে আলাদা
            Tenant হিসেবে যোগ করুন —
            Create Order ও Products পেজে
            এখান থেকে সিলেক্ট করা যাবে।
          </p>

          {/* TENANT ERROR */}

          {tenantError && (
            <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {tenantError}
            </div>
          )}

          {/* ADD TENANT */}

          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">

            {/* NAME */}

            <input
              value={
                newTenantName
              }
              onChange={(e) =>
                setNewTenantName(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  handleAddTenant();
                }
              }}
              placeholder="নতুন Tenant/Store নাম (যেমন: Ali Shop)"
              disabled={
                tenantLoading
              }
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />

            {/* LOGO */}

            <input
              value={
                newTenantLogo
              }
              onChange={(e) =>
                setNewTenantLogo(
                  e.target.value
                )
              }
              placeholder="লোগো URL (ঐচ্ছিক)"
              disabled={
                tenantLoading
              }
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* ADD BUTTON */}

          <button
            onClick={
              handleAddTenant
            }
            disabled={
              tenantLoading ||
              !newTenantName.trim()
            }
            className="mb-3 flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus
              size={14}
            />

            {tenantLoading
              ? "Processing..."
              : "যোগ করুন"}
          </button>

          {/* TENANT LIST */}

          <div className="space-y-1.5">

            {loadingTenants ? (
              <div className="rounded-lg bg-mist-50 px-3 py-4 text-center text-xs text-slate-400">
                Tenant load হচ্ছে...
              </div>
            ) : tenants.length ===
              0 ? (
              <div className="rounded-lg bg-mist-50 px-3 py-4 text-center text-xs text-slate-400">
                এখনো কোনো Tenant
                তৈরি করা হয়নি।
              </div>
            ) : (
              tenants.map(
                (t) => {
                  const tenantId =
                    t.id ||
                    t.tenantId;

                  return (
                    <div
                      key={
                        tenantId
                      }
                      className="flex items-center justify-between gap-2 rounded-lg bg-mist-50 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">

                        {/* LOGO */}

                        {t.logo ? (
                          <img
                            src={
                              t.logo
                            }
                            alt={
                              t.name
                            }
                            className="h-6 w-6 shrink-0 rounded object-contain"
                            onError={(
                              e
                            ) => {
                              e.currentTarget.style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white">
                            <Store
                              size={
                                13
                              }
                              className="text-slate-400"
                            />
                          </div>
                        )}

                        {/* NAME */}

                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink-900">
                            {
                              t.name
                            }
                          </span>

                          <span className="block truncate text-[10px] text-slate-400">
                            {
                              t.tenantId ||
                              t.id
                            }
                          </span>
                        </div>
                      </div>

                      {/* DELETE */}

                      <button
                        onClick={() =>
                          handleRemoveTenant(
                            tenantId
                          )
                        }
                        disabled={
                          tenantLoading
                        }
                        title="Tenant remove করুন"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2
                          size={13}
                        />
                      </button>
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* SERVER INFO */}

          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] leading-5 text-amber-700">
              Tenant এখন browser
              localStorage-এ save হবে না।
              MongoDB server-এ save হবে।
              তাই অন্য browser বা অন্য PC
              থেকেও একই Tenant list পাওয়া
              যাবে।
            </p>
          </div>
        </div>

        {/* ==================================================
            BOTTOM ACTIONS
        ================================================== */}

        <div className="flex flex-wrap items-center gap-3">

          {/* SAVE */}

          <button
            onClick={
              handleSave
            }
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Save
              size={15}
            />

            সেভ করুন
          </button>

          {/* TEST PRINT */}

          <button
            onClick={
              handleTestPrint
            }
            className="flex items-center gap-1.5 rounded-xl border border-mist-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-mist-100"
          >
            <Printer
              size={15}
            />

            টেস্ট প্রিন্ট
          </button>

          {saved && (
            <span className="text-sm font-medium text-emerald-600">
              ✓ সেভ হয়েছে
            </span>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

/*
==================================================
LOADER
==================================================
*/

const Loader2Icon = () => (
  <svg
    className="h-3.5 w-3.5 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />

    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

export default Settings;