import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Package,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  History,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import BarcodeImage from "../components/BarcodeImage.jsx";
import {
  getProducts,
  saveProduct,
  deleteProduct,
  adjustStock,
  getStockAdjustments,
  generateBarcode,
} from "../api/products.js";
import { getTenants } from "../config/tenants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { hasPermission } from "../config/admins.js";

const currency = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const emptyForm = {
  name: "",
  price: "",
  costPrice: "",
  image: "",
  sku: "",
  barcode: "",
  category: "",
  supplier: "",
  tenantId: "",
  stock: "",
};

const Products = () => {
  const { admin } = useAuth();
  const canManage = hasPermission(admin, "manageProducts");
  const [products, setProducts] = useState(getProducts());
  const tenants = getTenants();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [historyFor, setHistoryFor] = useState(null);

  const refresh = () => setProducts(getProducts());

  const startNew = () => {
    setForm({ ...emptyForm, tenantId: tenants[0]?.id || "", barcode: generateBarcode() });
    setEditing("new");
  };

  const startEdit = (p) => {
    setForm({
      name: p.name,
      price: p.price,
      costPrice: p.costPrice ?? "",
      image: p.image || "",
      sku: p.sku || "",
      barcode: p.barcode || "",
      category: p.category || "",
      supplier: p.supplier || "",
      tenantId: p.tenantId || "",
      stock: p.stock ?? "",
    });
    setEditing(p.id);
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    saveProduct({
      id: editing === "new" ? undefined : editing,
      name: form.name,
      price: Number(form.price) || 0,
      costPrice: form.costPrice === "" ? 0 : Number(form.costPrice),
      image: form.image,
      sku: form.sku,
      barcode: form.barcode,
      category: form.category,
      supplier: form.supplier,
      tenantId: form.tenantId,
      stock: form.stock === "" ? undefined : Number(form.stock),
    });
    setEditing(null);
    refresh();
  };

  const handleDelete = (id) => {
    if (!confirm("এই প্রোডাক্টটি ক্যাটালগ থেকে মুছে ফেলতে চান?")) return;
    deleteProduct(id);
    refresh();
  };

  const handleAdjust = (p, direction) => {
    const amountStr = prompt(
      `${direction > 0 ? "কত পিস যোগ করবেন" : "কত পিস কমাবেন"} (${p.name})?`,
      "1"
    );
    const amount = Number(amountStr);
    if (!amount || amount <= 0) return;
    const reason = prompt("কারণ লিখুন (যেমন: নতুন স্টক এলো / নষ্ট হয়েছে):", "") || "";
    adjustStock(p.id, direction * amount, reason, admin?.id);
    refresh();
  };

  return (
    <AdminLayout title="Products" subtitle="Create Order-এ প্রোডাক্ট সিলেক্ট করার ক্যাটালগ">
      {canManage && (
        <div className="mb-5 flex justify-end">
          <button
            onClick={startNew}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} /> নতুন প্রোডাক্ট
          </button>
        </div>
      )}

      {editing && (
        <div className="animate-in mb-5 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-ink-900">
              {editing === "new" ? "নতুন প্রোডাক্ট যোগ করুন" : "প্রোডাক্ট এডিট করুন"}
            </h3>
            <button onClick={() => setEditing(null)}>
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              placeholder="প্রোডাক্ট নাম *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              placeholder="বিক্রয় দাম (৳) *"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              placeholder="ক্রয়/purchase দাম (৳) — profit হিসাবের জন্য"
              value={form.costPrice}
              onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              placeholder="ক্যাটেগরি"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              placeholder="সাপ্লায়ার"
              value={form.supplier}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              placeholder="SKU"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              placeholder="বারকোড (খালি রাখলে auto তৈরি হবে)"
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              placeholder="স্টক"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              placeholder="ছবির URL"
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 sm:col-span-2"
            />
            <select
              value={form.tenantId}
              onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 sm:col-span-2"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Save size={14} /> সেভ করুন
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const profit = (Number(p.price) || 0) - (Number(p.costPrice) || 0);
          return (
            <div
              key={p.id}
              className="animate-in flex flex-col gap-3 rounded-2xl border border-mist-200 bg-white p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-14 w-14 flex-shrink-0 rounded-xl bg-mist-100 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-mist-100">
                    <Package size={20} className="text-slate-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{p.name}</p>
                  <p className="text-xs font-bold text-brand-600">{currency(p.price)}</p>
                  {p.category && (
                    <p className="text-[10px] text-slate-400">{p.category}</p>
                  )}
                  {typeof p.stock === "number" && (
                    <p
                      className={`mt-0.5 flex items-center gap-1 text-[11px] ${
                        p.stock <= 5 ? "text-rose-500" : "text-slate-400"
                      }`}
                    >
                      {p.stock <= 5 && <AlertTriangle size={10} />}
                      স্টক: {p.stock}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex flex-shrink-0 flex-col gap-1">
                    <button
                      onClick={() => startEdit(p)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-mist-100"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {p.costPrice > 0 && (
                <p className="text-[11px] text-slate-400">
                  Cost {currency(p.costPrice)} → Profit/unit{" "}
                  <span className={profit >= 0 ? "text-emerald-600" : "text-rose-500"}>
                    {currency(profit)}
                  </span>
                </p>
              )}

              {p.barcode && (
                <div className="rounded-lg border border-mist-100 bg-mist-50 py-2">
                  <BarcodeImage value={p.barcode} height={32} />
                  <p className="mt-1 text-center text-[10px] text-slate-400">{p.barcode}</p>
                </div>
              )}

              {canManage && (
                <div className="flex items-center justify-between border-t border-mist-100 pt-2.5">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAdjust(p, 1)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-100"
                    >
                      <PlusCircle size={11} /> স্টক
                    </button>
                    <button
                      onClick={() => handleAdjust(p, -1)}
                      className="flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
                    >
                      <MinusCircle size={11} /> স্টক
                    </button>
                  </div>
                  <button
                    onClick={() => setHistoryFor(historyFor === p.id ? null : p.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                  >
                    <History size={11} /> হিস্টোরি
                  </button>
                </div>
              )}

              {historyFor === p.id && (
                <div className="max-h-32 space-y-1 overflow-y-auto border-t border-mist-100 pt-2">
                  {getStockAdjustments(p.id).length === 0 && (
                    <p className="text-[11px] text-slate-300">কোনো এডজাস্টমেন্ট নেই</p>
                  )}
                  {getStockAdjustments(p.id).map((a) => (
                    <p key={a.id} className="text-[11px] text-slate-500">
                      {a.delta > 0 ? "+" : ""}
                      {a.delta} ({a.before}→{a.after}) — {a.reason || "কারণ নেই"}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-mist-200 bg-white py-16 text-slate-400 shadow-card">
          <Package size={32} className="mb-3" />
          <p className="text-sm font-medium">এখনো কোনো প্রোডাক্ট যোগ করা হয়নি</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default Products;
