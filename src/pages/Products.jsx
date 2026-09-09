import { useEffect, useState } from "react";

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
  RefreshCw,
  Loader2,
  Barcode,
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

const currency = (n) =>
  `৳${Number(n || 0).toLocaleString(
    "en-BD"
  )}`;

/*
==================================================
EMPTY FORM
==================================================
*/

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

/*
==================================================
PRODUCTS
==================================================
*/

const Products = () => {
  const { admin } = useAuth();

  const canManage =
    hasPermission(
      admin,
      "manageProducts"
    );

  const tenants =
    getTenants();

  /*
  ----------------------------------------------
  STATE
  ----------------------------------------------
  */

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    adjustingId,
    setAdjustingId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    editing,
    setEditing,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState(
    emptyForm
  );

  const [
    historyFor,
    setHistoryFor,
  ] = useState(null);

  const [
    history,
    setHistory,
  ] = useState([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  /*
  ==================================================
  LOAD PRODUCTS
  ==================================================
  */

  const loadProducts =
    async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getProducts();

        setProducts(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          "LOAD PRODUCTS ERROR:",
          err
        );

        setError(
          err.message ||
            "Products load করা যায়নি"
        );
      } finally {
        setLoading(false);
      }
    };

  /*
  ==================================================
  INITIAL LOAD
  ==================================================
  */

  useEffect(() => {
    loadProducts();
  }, []);

  /*
  ==================================================
  CLEAR MESSAGES
  ==================================================
  */

  const showSuccess =
    (message) => {
      setSuccess(message);

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    };

  /*
  ==================================================
  NEW PRODUCT
  ==================================================
  */

  const startNew =
    async () => {
      try {
        setError("");

        setSuccess("");

        const barcode =
          await generateBarcode();

        setForm({
          ...emptyForm,

          tenantId:
            tenants[0]?.id || "",

          barcode,
        });

        setEditing("new");
      } catch (err) {
        console.error(
          "BARCODE ERROR:",
          err
        );

        /*
        Fallback barcode
        */

        setForm({
          ...emptyForm,

          tenantId:
            tenants[0]?.id || "",

          barcode: `BD${Date.now()
            .toString()
            .slice(-12)}`,
        });

        setEditing("new");
      }
    };

  /*
  ==================================================
  EDIT PRODUCT
  ==================================================
  */

  const startEdit =
    (p) => {
      setError("");

      setSuccess("");

      setForm({
        name:
          p.name || "",

        price:
          p.price ?? "",

        costPrice:
          p.costPrice ?? "",

        image:
          p.image || "",

        sku:
          p.sku || "",

        barcode:
          p.barcode || "",

        category:
          p.category || "",

        supplier:
          p.supplier || "",

        tenantId:
          p.tenantId || "",

        stock:
          p.stock ?? "",
      });

      setEditing(
        p._id || p.id
      );
    };

  /*
  ==================================================
  SAVE PRODUCT
  ==================================================
  */

  const handleSave =
    async () => {
      setError("");

      setSuccess("");

      const name =
        String(
          form.name || ""
        ).trim();

      if (!name) {
        setError(
          "Product name দিন"
        );

        return;
      }

      const price =
        Number(form.price);

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        setError(
          "Valid price দিন"
        );

        return;
      }

      const stock =
        form.stock === ""
          ? 0
          : Number(form.stock);

      if (
        !Number.isFinite(stock) ||
        stock < 0
      ) {
        setError(
          "Valid stock দিন"
        );

        return;
      }

      try {
        setSaving(true);

        const payload = {
          name,

          price,

          costPrice:
            form.costPrice === ""
              ? 0
              : Number(
                  form.costPrice
                ),

          image:
            form.image.trim(),

          sku:
            form.sku.trim(),

          barcode:
            form.barcode.trim(),

          category:
            form.category.trim(),

          supplier:
            form.supplier.trim(),

          tenantId:
            form.tenantId.trim(),

          stock,
        };

        if (
          editing !== "new"
        ) {
          payload.id =
            editing;
        }

        const saved =
          await saveProduct(
            payload
          );

        console.log(
          "PRODUCT SAVED:",
          saved
        );

        setEditing(null);

        setForm(
          emptyForm
        );

        await loadProducts();

        showSuccess(
          editing === "new"
            ? "নতুন প্রোডাক্ট সফলভাবে যোগ হয়েছে"
            : "প্রোডাক্ট সফলভাবে আপডেট হয়েছে"
        );
      } catch (err) {
        console.error(
          "SAVE PRODUCT ERROR:",
          err
        );

        setError(
          err.message ||
            "Product save করা যায়নি"
        );
      } finally {
        setSaving(false);
      }
    };

  /*
  ==================================================
  DELETE PRODUCT
  ==================================================
  */

  const handleDelete =
    async (p) => {
      const productId =
        p._id || p.id;

      if (!productId) {
        setError(
          "Product ID পাওয়া যায়নি"
        );

        return;
      }

      const confirmed =
        window.confirm(
          `“${p.name}” প্রোডাক্টটি মুছে ফেলতে চান?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(
          productId
        );

        setError("");

        await deleteProduct(
          productId
        );

        if (
          historyFor ===
          productId
        ) {
          setHistoryFor(null);
          setHistory([]);
        }

        await loadProducts();

        showSuccess(
          "Product সফলভাবে delete হয়েছে"
        );
      } catch (err) {
        console.error(
          "DELETE PRODUCT ERROR:",
          err
        );

        setError(
          err.message ||
            "Product delete করা যায়নি"
        );
      } finally {
        setDeletingId(null);
      }
    };

  /*
  ==================================================
  ADJUST STOCK
  ==================================================
  */

  const handleAdjust =
    async (
      product,
      direction
    ) => {
      const productId =
        product._id ||
        product.id;

      const amountStr =
        window.prompt(
          direction > 0
            ? `কত পিস যোগ করবেন?\n\n${product.name}`
            : `কত পিস কমাবেন?\n\n${product.name}`,
          "1"
        );

      if (
        amountStr === null
      ) {
        return;
      }

      const amount =
        Number(amountStr);

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        return;
      }

      /*
      ----------------------------------------------
      PREVENT NEGATIVE STOCK
      ----------------------------------------------
      */

      if (
        direction < 0 &&
        amount >
          Number(
            product.stock || 0
          )
      ) {
        setError(
          `এত স্টক নেই। বর্তমান stock: ${
            product.stock || 0
          }`
        );

        return;
      }

      const reason =
        window.prompt(
          "কারণ লিখুন:",
          direction > 0
            ? "নতুন স্টক এসেছে"
            : "স্টক কমানো হয়েছে"
        );

      if (
        reason === null
      ) {
        return;
      }

      try {
        setAdjustingId(
          productId
        );

        setError("");

        await adjustStock(
          productId,
          direction * amount,
          reason,
          admin?.id
        );

        await loadProducts();

        /*
        যদি history open থাকে,
        সেটাও refresh হবে
        */

        if (
          historyFor ===
          productId
        ) {
          await loadHistory(
            productId
          );
        }

        showSuccess(
          direction > 0
            ? "Stock সফলভাবে যোগ হয়েছে"
            : "Stock সফলভাবে কমানো হয়েছে"
        );
      } catch (err) {
        console.error(
          "ADJUST STOCK ERROR:",
          err
        );

        setError(
          err.message ||
            "Stock adjust করা যায়নি"
        );
      } finally {
        setAdjustingId(
          null
        );
      }
    };

  /*
  ==================================================
  LOAD HISTORY
  ==================================================
  */

  const loadHistory =
    async (productId) => {
      try {
        setHistoryLoading(
          true
        );

        const data =
          await getStockAdjustments(
            productId
          );

        setHistory(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          "HISTORY ERROR:",
          err
        );

        setHistory([]);
      } finally {
        setHistoryLoading(
          false
        );
      }
    };

  /*
  ==================================================
  TOGGLE HISTORY
  ==================================================
  */

  const toggleHistory =
    async (productId) => {
      if (
        historyFor ===
        productId
      ) {
        setHistoryFor(null);
        setHistory([]);

        return;
      }

      setHistoryFor(
        productId
      );

      await loadHistory(
        productId
      );
    };

  /*
  ==================================================
  FORM FIELD HELPER
  ==================================================
  */

  const updateForm =
    (field, value) => {
      setForm(
        (previous) => ({
          ...previous,
          [field]: value,
        })
      );
    };

  /*
  ==================================================
  RENDER
  ==================================================
  */

  return (
    <AdminLayout
      title="Products"
      subtitle="MongoDB-based product catalog & stock management"
    >
      {/* =========================================
          ALERTS
      ========================================= */}

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>

          <button
            onClick={() =>
              setError("")
            }
            className="text-rose-400 hover:text-rose-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* =========================================
          HEADER ACTIONS
      ========================================= */}

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">
            মোট প্রোডাক্ট
          </p>

          <p className="text-xl font-bold text-ink-900">
            {products.length}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-mist-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-mist-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          {canManage && (
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={16} />

              নতুন প্রোডাক্ট
            </button>
          )}
        </div>
      </div>

      {/* =========================================
          PRODUCT FORM
      ========================================= */}

      {editing && (
        <div className="animate-in mb-5 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-ink-900">
                {editing === "new"
                  ? "নতুন প্রোডাক্ট যোগ করুন"
                  : "প্রোডাক্ট এডিট করুন"}
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Product data MongoDB-তে save হবে
              </p>
            </div>

            <button
              onClick={() =>
                setEditing(null)
              }
              className="rounded-lg p-1 hover:bg-white"
            >
              <X
                size={17}
                className="text-slate-400"
              />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* NAME */}

            <input
              placeholder="প্রোডাক্ট নাম *"
              value={form.name}
              onChange={(e) =>
                updateForm(
                  "name",
                  e.target.value
                )
              }
              className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />

            {/* PRICE */}

            <input
              type="number"
              min="0"
              placeholder="বিক্রয় দাম (৳) *"
              value={form.price}
              onChange={(e) =>
                updateForm(
                  "price",
                  e.target.value
                )
              }
              className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />

            {/* COST PRICE */}

            <input
              type="number"
              min="0"
              placeholder="ক্রয়/purchase দাম (৳)"
              value={
                form.costPrice
              }
              onChange={(e) =>
                updateForm(
                  "costPrice",
                  e.target.value
                )
              }
              className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />

            {/* CATEGORY */}

            <input
              placeholder="ক্যাটেগরি"
              value={
                form.category
              }
              onChange={(e) =>
                updateForm(
                  "category",
                  e.target.value
                )
              }
              className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />

            {/* SUPPLIER */}

            <input
              placeholder="সাপ্লায়ার"
              value={
                form.supplier
              }
              onChange={(e) =>
                updateForm(
                  "supplier",
                  e.target.value
                )
              }
              className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />

            {/* SKU */}

            <input
              placeholder="SKU"
              value={form.sku}
              onChange={(e) =>
                updateForm(
                  "sku",
                  e.target.value
                )
              }
              className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />

            {/* BARCODE */}

            <div className="relative">
              <Barcode
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                placeholder="Barcode"
                value={
                  form.barcode
                }
                onChange={(e) =>
                  updateForm(
                    "barcode",
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-mist-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
              />
            </div>

            {/* STOCK */}

            <input
              type="number"
              min="0"
              placeholder="স্টক"
              value={
                form.stock
              }
              onChange={(e) =>
                updateForm(
                  "stock",
                  e.target.value
                )
              }
              disabled={
                editing !==
                "new"
              }
              className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400"
            />

            {/* IMAGE */}

            <input
              placeholder="ছবির URL"
              value={
                form.image
              }
              onChange={(e) =>
                updateForm(
                  "image",
                  e.target.value
                )
              }
              className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 sm:col-span-2"
            />

            {/* TENANT */}

            <select
              value={
                form.tenantId
              }
              onChange={(e) =>
                updateForm(
                  "tenantId",
                  e.target.value
                )
              }
              className="rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 sm:col-span-2"
            >
              <option value="">
                Tenant নির্বাচন করুন
              </option>

              {tenants.map(
                (tenant) => (
                  <option
                    key={
                      tenant.id
                    }
                    value={
                      tenant.id
                    }
                  >
                    {
                      tenant.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* BARCODE PREVIEW */}

          {form.barcode && (
            <div className="mt-4 max-w-xs rounded-xl border border-mist-200 bg-white p-3">
              <BarcodeImage
                value={
                  form.barcode
                }
                height={40}
              />

              <p className="mt-1 text-center text-[10px] text-slate-400">
                {form.barcode}
              </p>
            </div>
          )}

          {/* SAVE */}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Save size={14} />
              )}

              {saving
                ? "Saving..."
                : "সেভ করুন"}
            </button>

            <button
              onClick={() =>
                setEditing(null)
              }
              disabled={saving}
              className="rounded-lg border border-mist-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-mist-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* =========================================
          LOADING
      ========================================= */}

      {loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-mist-200 bg-white py-16 shadow-card">
          <Loader2
            size={30}
            className="mb-3 animate-spin text-brand-600"
          />

          <p className="text-sm text-slate-400">
            Products loading...
          </p>
        </div>
      )}

      {/* =========================================
          PRODUCTS
      ========================================= */}

      {!loading &&
        products.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map(
              (p) => {
                const productId =
                  p._id ||
                  p.id;

                const price =
                  Number(
                    p.price || 0
                  );

                const costPrice =
                  Number(
                    p.costPrice ||
                      0
                  );

                const stock =
                  Number(
                    p.stock || 0
                  );

                const profit =
                  price -
                  costPrice;

                const isDeleting =
                  deletingId ===
                  productId;

                const isAdjusting =
                  adjustingId ===
                  productId;

                return (
                  <div
                    key={
                      productId
                    }
                    className="animate-in flex flex-col gap-3 rounded-2xl border border-mist-200 bg-white p-4 shadow-card"
                  >
                    {/* =================================
                        TOP
                    ================================= */}

                    <div className="flex items-center gap-3">
                      {/* IMAGE */}

                      {p.image ? (
                        <img
                          src={
                            p.image
                          }
                          alt={
                            p.name
                          }
                          className="h-14 w-14 flex-shrink-0 rounded-xl bg-mist-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-mist-100">
                          <Package
                            size={
                              20
                            }
                            className="text-slate-300"
                          />
                        </div>
                      )}

                      {/* INFO */}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {
                            p.name
                          }
                        </p>

                        <p className="text-xs font-bold text-brand-600">
                          {currency(
                            price
                          )}
                        </p>

                        {p.category && (
                          <p className="text-[10px] text-slate-400">
                            {
                              p.category
                            }
                          </p>
                        )}

                        <p
                          className={`mt-0.5 flex items-center gap-1 text-[11px] ${
                            stock <=
                            5
                              ? "text-rose-500"
                              : "text-slate-400"
                          }`}
                        >
                          {stock <=
                            5 && (
                            <AlertTriangle
                              size={
                                10
                              }
                            />
                          )}

                          স্টক:{" "}
                          {
                            stock
                          }
                        </p>
                      </div>

                      {/* ACTIONS */}

                      {canManage && (
                        <div className="flex flex-shrink-0 flex-col gap-1">
                          <button
                            onClick={() =>
                              startEdit(
                                p
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-mist-100"
                          >
                            <Pencil
                              size={
                                13
                              }
                            />
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                p
                              )
                            }
                            disabled={
                              isDeleting
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2
                                size={
                                  13
                                }
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={
                                  13
                                }
                              />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* =================================
                        PRODUCT META
                    ================================= */}

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg bg-mist-50 p-2">
                        <p className="text-slate-400">
                          Product ID
                        </p>

                        <p className="mt-0.5 font-semibold text-slate-700">
                          {
                            p.productId
                          }
                        </p>
                      </div>

                      <div className="rounded-lg bg-mist-50 p-2">
                        <p className="text-slate-400">
                          SKU
                        </p>

                        <p className="mt-0.5 truncate font-semibold text-slate-700">
                          {p.sku ||
                            "—"}
                        </p>
                      </div>
                    </div>

                    {/* =================================
                        PROFIT
                    ================================= */}

                    {costPrice >
                      0 && (
                      <p className="text-[11px] text-slate-400">
                        Cost{" "}
                        {currency(
                          costPrice
                        )}{" "}
                        → Profit/unit{" "}
                        <span
                          className={
                            profit >=
                            0
                              ? "text-emerald-600"
                              : "text-rose-500"
                          }
                        >
                          {currency(
                            profit
                          )}
                        </span>
                      </p>
                    )}

                    {/* =================================
                        BARCODE
                    ================================= */}

                    {p.barcode && (
                      <div className="rounded-lg border border-mist-100 bg-mist-50 py-2">
                        <BarcodeImage
                          value={
                            p.barcode
                          }
                          height={
                            32
                          }
                        />

                        <p className="mt-1 text-center text-[10px] text-slate-400">
                          {
                            p.barcode
                          }
                        </p>
                      </div>
                    )}

                    {/* =================================
                        STOCK ACTIONS
                    ================================= */}

                    {canManage && (
                      <div className="flex items-center justify-between border-t border-mist-100 pt-2.5">
                        <div className="flex gap-1.5">
                          {/* ADD */}

                          <button
                            onClick={() =>
                              handleAdjust(
                                p,
                                1
                              )
                            }
                            disabled={
                              isAdjusting
                            }
                            className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {isAdjusting ? (
                              <Loader2
                                size={
                                  11
                                }
                                className="animate-spin"
                              />
                            ) : (
                              <PlusCircle
                                size={
                                  11
                                }
                              />
                            )}

                            স্টক +
                          </button>

                          {/* REMOVE */}

                          <button
                            onClick={() =>
                              handleAdjust(
                                p,
                                -1
                              )
                            }
                            disabled={
                              isAdjusting ||
                              stock ===
                                0
                            }
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <MinusCircle
                              size={
                                11
                              }
                            />

                            স্টক -
                          </button>
                        </div>

                        {/* HISTORY */}

                        <button
                          onClick={() =>
                            toggleHistory(
                              productId
                            )
                          }
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                        >
                          <History
                            size={
                              11
                            }
                          />

                          হিস্টোরি
                        </button>
                      </div>
                    )}

                    {/* =================================
                        HISTORY
                    ================================= */}

                    {historyFor ===
                      productId && (
                      <div className="border-t border-mist-100 pt-2">
                        {historyLoading ? (
                          <div className="flex items-center gap-2 py-2 text-[11px] text-slate-400">
                            <Loader2
                              size={
                                12
                              }
                              className="animate-spin"
                            />

                            Loading history...
                          </div>
                        ) : history.length ===
                          0 ? (
                          <p className="py-1 text-[11px] text-slate-300">
                            কোনো stock adjustment নেই
                          </p>
                        ) : (
                          <div className="max-h-36 space-y-1 overflow-y-auto">
                            {history.map(
                              (
                                item
                              ) => (
                                <div
                                  key={
                                    item._id
                                  }
                                  className="rounded-lg bg-mist-50 px-2 py-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p
                                      className={`text-[11px] font-semibold ${
                                        item.delta >
                                        0
                                          ? "text-emerald-600"
                                          : "text-rose-600"
                                      }`}
                                    >
                                      {item.delta >
                                      0
                                        ? "+"
                                        : ""}
                                      {
                                        item.delta
                                      }
                                    </p>

                                    <p className="text-[10px] text-slate-400">
                                      {
                                        item.before
                                      }{" "}
                                      →{" "}
                                      {
                                        item.after
                                      }
                                    </p>
                                  </div>

                                  <p className="truncate text-[10px] text-slate-500">
                                    {item.reason ||
                                      "কারণ নেই"}
                                  </p>

                                  <p className="text-[9px] text-slate-300">
                                    {item.createdAt
                                      ? new Date(
                                          item.createdAt
                                        ).toLocaleString(
                                          "en-BD"
                                        )
                                      : ""}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

      {/* =========================================
          EMPTY
      ========================================= */}

      {!loading &&
        products.length ===
          0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-mist-200 bg-white py-16 text-slate-400 shadow-card">
            <Package
              size={32}
              className="mb-3"
            />

            <p className="text-sm font-medium">
              এখনো কোনো প্রোডাক্ট যোগ করা হয়নি
            </p>

            {canManage && (
              <button
                onClick={startNew}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <Plus size={14} />

                প্রথম প্রোডাক্ট যোগ করুন
              </button>
            )}
          </div>
        )}
    </AdminLayout>
  );
};

export default Products;