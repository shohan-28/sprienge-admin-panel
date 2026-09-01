import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Package, ShoppingBag } from "lucide-react";
import { getOrders } from "../api/orders.js";
import { getProducts } from "../api/products.js";

// Triggered from the Topbar search icon (or the "/" keyboard shortcut,
// wired in AdminLayout). Searches across order id / customer name / phone
// / tracking code, and product name / barcode / SKU — in one box, from
// any page.
const GlobalSearch = ({ onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [products] = useState(getProducts());

  useEffect(() => {
    getOrders().then(setOrders).catch(() => {});
  }, []);

  const orderResults = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return orders
      .filter(
        (o) =>
          o._id?.toLowerCase().includes(q) ||
          o.name?.toLowerCase().includes(q) ||
          o.phone?.includes(query) ||
          o.trackingCode?.toLowerCase().includes(q) ||
          o.consignmentId?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, orders]);

  const productResults = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, products]);

  const goToOrder = (id) => {
    onClose();
    navigate(`/orders/${id}`);
  };

  const goToProducts = () => {
    onClose();
    navigate("/products");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/50 px-4 pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-mist-200 px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order ID, নাম, ফোন, Tracking ID, প্রোডাক্ট, বারকোড..."
            className="flex-1 text-sm outline-none"
          />
          <button onClick={onClose}>
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {query.length < 2 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              অন্তত ২ অক্ষর টাইপ করুন
            </p>
          ) : (
            <>
              {orderResults.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    অর্ডার
                  </p>
                  {orderResults.map((o) => (
                    <button
                      key={o._id}
                      onClick={() => goToOrder(o._id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-mist-50"
                    >
                      <ShoppingBag size={15} className="flex-shrink-0 text-brand-600" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {o.name} — {o.phone}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          #{o._id.slice(-8)}
                          {o.trackingCode ? ` · ${o.trackingCode}` : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {productResults.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    প্রোডাক্ট
                  </p>
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={goToProducts}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-mist-50"
                    >
                      <Package size={15} className="flex-shrink-0 text-brand-600" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {p.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {p.sku || p.barcode || ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {orderResults.length === 0 && productResults.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-slate-400">
                  কোনো ফলাফল পাওয়া যায়নি
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
