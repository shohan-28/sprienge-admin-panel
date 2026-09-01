import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  AlertTriangle,
  Loader2,
  ShoppingCart,
  X,
  Save,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { getOrders } from "../api/orders.js";
import { getProducts, saveProduct } from "../api/products.js";
import { getTenants } from "../config/tenants.js";
import { ORDER_SOURCES } from "../config/orderSources.js";
import { useAuth } from "../context/AuthContext.jsx";
import FraudCheckPanel from "../components/FraudCheckPanel.jsx";
import api from "../api/axios.js";

const currency = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const emptyNewProduct = { name: "", price: "", image: "", sku: "", stock: "" };

const CreateOrder = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const [products, setProducts] = useState(getProducts());
  const tenants = getTenants();

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    district: "",
    thana: "",
    address: "",
    note: "",
  });
  const [tenantId, setTenantId] = useState(tenants[0]?.id || "");
  const [source, setSource] = useState("phone");
  const [officeOrderNote, setOfficeOrderNote] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(60);
  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState([]); // [{ productId, name, image, price, quantity }]
  const [submitting, setSubmitting] = useState(false);
  const [repeatCount, setRepeatCount] = useState(null);
  const [duplicateTodayCount, setDuplicateTodayCount] = useState(0);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyNewProduct);

  const filteredProducts = useMemo(() => {
    const inTenant = products.filter((p) => !tenantId || p.tenantId === tenantId);
    if (!productQuery) return inTenant;
    return inTenant.filter((p) =>
      p.name.toLowerCase().includes(productQuery.toLowerCase())
    );
  }, [products, productQuery, tenantId]);

  const addToCart = (product) => {
    if (typeof product.stock === "number" && product.stock <= 0) return; // out of stock — refuse silently, tile already shows this
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const handleCreateProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    const created = saveProduct({
      name: newProduct.name,
      price: Number(newProduct.price) || 0,
      image: newProduct.image,
      sku: newProduct.sku,
      tenantId,
      stock: newProduct.stock === "" ? undefined : Number(newProduct.stock),
    });
    setProducts(getProducts());
    addToCart(created);
    setNewProduct(emptyNewProduct);
    setShowNewProduct(false);
  };

  const updateCartLine = (productId, field, value) => {
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, [field]: value } : c))
    );
  };

  const removeCartLine = (productId) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const subtotal = cart.reduce(
    (sum, c) => sum + (Number(c.price) || 0) * (Number(c.quantity) || 0),
    0
  );
  const total =
    subtotal + (Number(deliveryCharge) || 0) - (Number(additionalDiscount) || 0);
  const due = total - (Number(advanceAmount) || 0);

  // Quick repeat-customer check + same-day duplicate/fraud flag: as soon as
  // 11 digits are typed, see how many past orders share this phone number
  // in total, and specifically how many were placed TODAY — a same-day
  // repeat is either an accidental double-submit or worth a quick call to
  // confirm before shipping two parcels.
  const handlePhoneChange = async (value) => {
    const digits = value.replace(/\D/g, "");
    setCustomer((c) => ({ ...c, phone: digits }));
    if (digits.length === 11) {
      try {
        const all = await getOrders();
        const matches = all.filter((o) => o.phone === digits);
        setRepeatCount(matches.length);
        const today = new Date().toDateString();
        const todayMatches = matches.filter(
          (o) => new Date(o.createdAt).toDateString() === today
        );
        setDuplicateTodayCount(todayMatches.length);
      } catch {
        setRepeatCount(null);
        setDuplicateTodayCount(0);
      }
    } else {
      setRepeatCount(null);
      setDuplicateTodayCount(0);
    }
  };

  const handleSubmit = async () => {
    if (!customer.name || customer.phone.length !== 11 || cart.length === 0) {
      alert("নাম, ১১ ডিজিটের ফোন নাম্বার, এবং অন্তত একটি প্রোডাক্ট আবশ্যক।");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...customer,
        items: cart.map((c) => ({
          productId: c.productId,
          name: c.name,
          image: c.image,
          price: Number(c.price) || 0,
          quantity: Number(c.quantity) || 1,
        })),
        subtotal,
        deliveryCharge: Number(deliveryCharge) || 0,
        additionalDiscount: Number(additionalDiscount) || 0,
        advanceAmount: Number(advanceAmount) || 0,
        total: due,
        status: "pending",
        source,
        tenantId,
        officeOrderNote,
        createdBy: admin?.id,
      };
      const { data } = await api.post("/orders", payload);
      // Stock is decremented when the order is CONFIRMED (Order Details ->
      // Confirm Order), not at creation — a pending order shouldn't reduce
      // stock, since it might still be cancelled before confirmation.
      const newId = data?.order?._id || data?._id;
      navigate(newId ? `/orders/${newId}` : "/orders");
    } catch {
      alert("অর্ডার তৈরি করা যায়নি। Backend চলছে কিনা চেক করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Create Order" subtitle="অ্যাডমিন প্যানেল থেকে সরাসরি নতুন অর্ডার তৈরি করুন">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: customer + products */}
        <div className="space-y-5 lg:col-span-2">
          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 font-display text-base font-bold text-ink-900">
              কাস্টমার তথ্য
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                placeholder="কাস্টমার নাম *"
                value={customer.name}
                onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              <div>
                <input
                  placeholder="মোবাইল নাম্বার *"
                  value={customer.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={11}
                  className="w-full rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                {repeatCount !== null && (
                  <p
                    className={`mt-1 text-xs ${
                      repeatCount > 0 ? "font-semibold text-brand-600" : "text-slate-400"
                    }`}
                  >
                    {repeatCount > 0
                      ? `এই নাম্বারে আগে ${repeatCount} টি অর্ডার আছে — রিপিট কাস্টমার`
                      : "নতুন কাস্টমার"}
                  </p>
                )}
                {duplicateTodayCount > 0 && (
                  <p className="mt-1 flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-600">
                    <AlertTriangle size={12} />
                    ⚠️ আজকে এই নাম্বার থেকে ইতিমধ্যে {duplicateTodayCount} টি অর্ডার
                    এসেছে — ডুপ্লিকেট/ভুয়া অর্ডার কিনা যাচাই করুন
                  </p>
                )}
                <FraudCheckPanel phone={customer.phone} />
              </div>
              <input
                placeholder="জেলা"
                value={customer.district}
                onChange={(e) => setCustomer((c) => ({ ...c, district: e.target.value }))}
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              <input
                placeholder="থানা"
                value={customer.thana}
                onChange={(e) => setCustomer((c) => ({ ...c, thana: e.target.value }))}
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              <textarea
                placeholder="সম্পূর্ণ ঠিকানা"
                value={customer.address}
                onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                rows={2}
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:col-span-2"
              />
              <textarea
                placeholder="কাস্টমার নোট (ঐচ্ছিক)"
                value={customer.note}
                onChange={(e) => setCustomer((c) => ({ ...c, note: e.target.value }))}
                rows={2}
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:col-span-2"
              />
            </div>
          </div>

          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink-900">
                প্রোডাক্ট সিলেক্ট করুন
              </h3>
              <button
                onClick={() => setShowNewProduct((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100"
              >
                {showNewProduct ? <X size={13} /> : <Plus size={13} />}
                নতুন প্রোডাক্ট
              </button>
            </div>

            {showNewProduct && (
              <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    placeholder="নাম *"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                    className="rounded-lg border border-mist-200 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <input
                    type="number"
                    placeholder="দাম *"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                    className="rounded-lg border border-mist-200 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <input
                    placeholder="ছবির URL"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct((p) => ({ ...p, image: e.target.value }))}
                    className="col-span-2 rounded-lg border border-mist-200 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <input
                    placeholder="SKU (ঐচ্ছিক)"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
                    className="rounded-lg border border-mist-200 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <input
                    type="number"
                    placeholder="স্টক (ঐচ্ছিক)"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct((p) => ({ ...p, stock: e.target.value }))}
                    className="rounded-lg border border-mist-200 px-2.5 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <button
                  onClick={handleCreateProduct}
                  className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <Save size={13} /> সেভ করে অর্ডারে যোগ করুন
                </button>
              </div>
            )}

            <div className="relative mb-4">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="প্রোডাক্ট খুঁজুন..."
                className="w-full rounded-xl border border-mist-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {filteredProducts.map((p) => {
                const outOfStock = typeof p.stock === "number" && p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                      outOfStock
                        ? "cursor-not-allowed border-mist-200 opacity-40"
                        : "border-mist-200 hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-14 w-14 rounded-lg bg-mist-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-mist-100">
                        <Package size={18} className="text-slate-300" />
                      </div>
                    )}
                    <p className="line-clamp-2 text-xs font-semibold text-ink-900">
                      {p.name}
                    </p>
                    <p className="text-xs font-bold text-brand-600">{currency(p.price)}</p>
                    {outOfStock ? (
                      <p className="flex items-center gap-1 text-[10px] font-semibold text-rose-500">
                        স্টক নেই
                      </p>
                    ) : (
                      typeof p.stock === "number" &&
                      p.stock <= 5 && (
                        <p className="flex items-center gap-1 text-[10px] text-rose-500">
                          <AlertTriangle size={9} /> স্টক {p.stock}
                        </p>
                      )
                    )}
                  </button>
                );
              })}
              {filteredProducts.length === 0 && (
                <p className="col-span-full py-6 text-center text-sm text-slate-400">
                  কোনো প্রোডাক্ট পাওয়া যায়নি — উপরে "নতুন প্রোডাক্ট" চেপে একটা
                  যোগ করুন
                </p>
              )}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <ShoppingCart size={17} className="text-brand-600" />
                সিলেক্টেড প্রোডাক্ট ({cart.length})
              </h3>
              <div className="divide-y divide-mist-100">
                {cart.map((c) => (
                  <div key={c.productId} className="flex items-center gap-3 py-3">
                    {c.image ? (
                      <img
                        src={c.image}
                        alt={c.name}
                        className="h-12 w-12 flex-shrink-0 rounded-lg bg-mist-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-mist-100">
                        <Package size={16} className="text-slate-300" />
                      </div>
                    )}
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                      {c.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateCartLine(c.productId, "quantity", Math.max(1, c.quantity - 1))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist-100 text-slate-500 hover:bg-mist-200"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={c.quantity}
                        onChange={(e) =>
                          updateCartLine(c.productId, "quantity", Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-12 rounded-lg border border-mist-200 px-1.5 py-1 text-center text-sm"
                      />
                      <button
                        onClick={() => updateCartLine(c.productId, "quantity", c.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist-100 text-slate-500 hover:bg-mist-200"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    {/* Price is editable here — per-order discount/override,
                        independent of the catalog price. */}
                    <input
                      type="number"
                      min={0}
                      value={c.price}
                      onChange={(e) => updateCartLine(c.productId, "price", e.target.value)}
                      className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                    />
                    <button
                      onClick={() => removeCartLine(c.productId)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: order meta + pricing */}
        <div className="space-y-5">
          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 font-display text-base font-bold text-ink-900">
              অর্ডার তথ্য
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tenant / Store
                </label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  অর্ডার সোর্স
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {ORDER_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  অফিস নোট (শুধু admin-দের জন্য)
                </label>
                <textarea
                  value={officeOrderNote}
                  onChange={(e) => setOfficeOrderNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 font-display text-base font-bold text-ink-900">
              মূল্য হিসাব
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-ink-900">{currency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Delivery Charge</span>
                <input
                  type="number"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                  className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Additional Discount</span>
                <input
                  type="number"
                  value={additionalDiscount}
                  onChange={(e) => setAdditionalDiscount(e.target.value)}
                  className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Advance Amount</span>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                />
              </div>
              <div className="h-px bg-mist-200" />
              <div className="flex items-center justify-between text-base font-bold text-ink-900">
                <span>Due (COD)</span>
                <span className="text-brand-600">{currency(due)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Submit Order
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CreateOrder;
