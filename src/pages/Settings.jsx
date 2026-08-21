import { useState } from "react";
import { Save, Printer, Wifi, WifiOff, RefreshCw, Store, Plus, Trash2 } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { getLabelSettings, saveLabelSettings } from "../config/settings.js";
import { runPrintQueue } from "../utils/printQueue.js";
import { listPrinters, isQzAvailable } from "../utils/qzTray.js";
import { getTenants, addTenant, removeTenant } from "../config/tenants.js";

const SAMPLE_ORDER = {
  _id: "SAMPLE-0001",
  name: "Test Customer",
  phone: "01700000000",
  address: "House 12, Road 5",
  thana: "Gulshan",
  district: "Dhaka",
  total: 1250,
  consignmentId: "SF-DEMO-123",
  trackingCode: "TRK-DEMO-123",
  items: [{ name: "Sample Product", quantity: 2, price: 500 }],
};

const Settings = () => {
  const [settings, setSettings] = useState(getLabelSettings());
  const [saved, setSaved] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [findingPrinters, setFindingPrinters] = useState(false);
  const [qzError, setQzError] = useState("");
  const [tenants, setTenants] = useState(getTenants());
  const [newTenantName, setNewTenantName] = useState("");

  const handleChange = (field, value) => {
    setSettings((s) => ({ ...s, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveLabelSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestPrint = () => {
    runPrintQueue([SAMPLE_ORDER], settings, { markServerStatus: false });
  };

  const handleFindPrinters = async () => {
    setQzError("");
    setFindingPrinters(true);
    try {
      const found = await listPrinters();
      setPrinters(found);
      if (found.length === 0) {
        setQzError("কোনো প্রিন্টার পাওয়া যায়নি — PC-তে প্রিন্টার ইনস্টল/paired আছে কিনা চেক করুন।");
      }
    } catch (e) {
      setQzError(e.message);
    } finally {
      setFindingPrinters(false);
    }
  };

  const handleAddTenant = () => {
    if (!newTenantName.trim()) return;
    addTenant(newTenantName.trim());
    setTenants(getTenants());
    setNewTenantName("");
  };

  const handleRemoveTenant = (id) => {
    if (!confirm("এই Tenant/Store মুছে ফেলতে চান? এর সাথে যুক্ত অর্ডার/প্রোডাক্ট থেকে যাবে, শুধু নামটা আর তালিকায় দেখাবে না।"))
      return;
    removeTenant(id);
    setTenants(getTenants());
  };

  return (
    <AdminLayout title="Settings" subtitle="লেবেল, প্রিন্টার ও অটো-প্রিন্ট কনফিগার করুন">
      <div className="max-w-xl space-y-5">
        {/* Label size + brand */}
        <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
          <h3 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-ink-900">
            <Printer size={17} className="text-brand-600" />
            শিপিং লেবেল সেটিংস
          </h3>
          <p className="mb-5 text-xs text-slate-400">
            আপনার থার্মাল প্রিন্টারের লেবেল স্টকের সাইজ অনুযায়ী এখানে পরিবর্তন করুন।
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Width (mm)
              </label>
              <input
                type="number"
                value={settings.widthMm}
                onChange={(e) => handleChange("widthMm", Number(e.target.value))}
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Height (mm)
              </label>
              <input
                type="number"
                value={settings.heightMm}
                onChange={(e) => handleChange("heightMm", Number(e.target.value))}
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Brand Name (লেবেলে দেখাবে)
              </label>
              <input
                value={settings.brandName}
                onChange={(e) => handleChange("brandName", e.target.value)}
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Brand Logo URL (ঐচ্ছিক)
              </label>
              <input
                value={settings.brandLogoUrl}
                onChange={(e) => handleChange("brandLogoUrl", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        {/* QZ Tray / printer + auto print */}
        <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
          <h3 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-ink-900">
            {isQzAvailable() ? (
              <Wifi size={17} className="text-emerald-600" />
            ) : (
              <WifiOff size={17} className="text-slate-400" />
            )}
            সাইলেন্ট প্রিন্টিং (QZ Tray)
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            KD-582 বা অন্য যেকোনো installed প্রিন্টারে popup ছাড়াই সরাসরি প্রিন্ট
            পাঠাতে হলে PC-তে{" "}
            <a
              href="https://qz.io/download/"
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 underline"
            >
              QZ Tray
            </a>{" "}
            ইনস্টল করে চালু রাখুন, তারপর নিচে "প্রিন্টার খুঁজুন" চাপুন। প্রিন্টার
            সিলেক্ট না করলে সাধারণ browser print dialog ব্যবহার হবে।
          </p>

          <button
            onClick={handleFindPrinters}
            disabled={findingPrinters}
            className="mb-3 flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-mist-100 disabled:opacity-60"
          >
            {findingPrinters ? (
              <Loader2Icon />
            ) : (
              <RefreshCw size={13} />
            )}
            প্রিন্টার খুঁজুন
          </button>

          {qzError && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {qzError}
            </p>
          )}

          {printers.length > 0 && (
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                প্রিন্টার সিলেক্ট করুন
              </label>
              <select
                value={settings.printerName}
                onChange={(e) => handleChange("printerName", e.target.value)}
                className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">— browser print dialog ব্যবহার করুন —</option>
                {printers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {settings.printerName && (
            <label className="flex items-center gap-2.5 rounded-xl bg-mist-50 px-3.5 py-3 text-sm">
              <input
                type="checkbox"
                checked={settings.autoPrint}
                onChange={(e) => handleChange("autoPrint", e.target.checked)}
                className="h-4 w-4 rounded border-mist-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                <span className="font-semibold text-ink-900">Auto Print চালু করুন</span>
                <br />
                <span className="text-xs text-slate-400">
                  ON থাকলে Steadfast parcel তৈরি হওয়া মাত্রই label automatically{" "}
                  {settings.printerName}-তে প্রিন্ট হয়ে যাবে, কোনো বাটন চাপতে হবে না।
                </span>
              </span>
            </label>
          )}
        </div>

        {/* Tenant / store management */}
        <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
          <h3 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-ink-900">
            <Store size={17} className="text-brand-600" />
            Tenant / Store ব্যবস্থাপনা
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            একাধিক ব্র্যান্ড/পেজ/স্টোর থেকে অর্ডার আসলে, প্রতিটাকে আলাদা Tenant
            হিসেবে যোগ করুন — Create Order ও Products পেজে এখান থেকে সিলেক্ট
            করা যাবে।
          </p>

          <div className="mb-3 flex gap-2">
            <input
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="নতুন Tenant/Store নাম (যেমন: Ali Shop)"
              className="flex-1 rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              onClick={handleAddTenant}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={14} /> যোগ করুন
            </button>
          </div>

          <div className="space-y-1.5">
            {tenants.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg bg-mist-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-ink-900">{t.name}</span>
                <button
                  onClick={() => handleRemoveTenant(t.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Save size={15} /> সেভ করুন
          </button>
          <button
            onClick={handleTestPrint}
            className="flex items-center gap-1.5 rounded-xl border border-mist-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-mist-100"
          >
            <Printer size={15} /> টেস্ট প্রিন্ট
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

// Tiny inline spinner so we don't need an extra top-level import churn.
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
