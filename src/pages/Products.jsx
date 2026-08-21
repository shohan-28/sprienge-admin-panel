import { useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Package, AlertTriangle } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { getProducts, saveProduct, deleteProduct } from "../api/products.js";
import { getTenants } from "../config/tenants.js";

const currency = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const emptyForm = { name: "", price: "", image: "", sku: "", tenantId: "", stock: "" };

const Products = () => {
  const [products, setProducts] = useState(getProducts());
  const tenants = getTenants();
  const [editing, setEditing] = useState(null); // product id being edited, or "new"
  const [form, setForm] = useState(emptyForm);

  const refresh = () => setProducts(getProducts());

  const startNew = () => {
    setForm({ ...emptyForm, tenantId: tenants[0]?.id || "" });
    setEditing("new");
  };

  const startEdit = (p) => {
    setForm({
      name: p.name,
      price: p.price,
      image: p.image || "",
      sku: p.sku || "",
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
      image: form.image,
      sku: form.sku,
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

  return (
    <AdminLayout title="Products" subtitle="Create Order-এ প্রোডাক্ট সিলেক্ট করার ক্যাটালগ">
      <div className="mb-5 flex justify-end">
        <button
          onClick={startNew}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> নতুন প্রোডাক্ট
        </button>
      </div>

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
              placeholder="দাম (৳) *"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              placeholder="ছবির URL"
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 sm:col-span-2"
            />
            <input
              placeholder="SKU (ঐচ্ছিক)"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              placeholder="স্টক (ঐচ্ছিক)"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              className="rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
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
        {products.map((p) => (
          <div
            key={p.id}
            className="animate-in flex items-center gap-3 rounded-2xl border border-mist-200 bg-white p-4 shadow-card"
          >
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
          </div>
        ))}
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
