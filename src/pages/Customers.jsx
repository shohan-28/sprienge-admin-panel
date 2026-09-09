import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, Star, UserX, Phone, TrendingUp } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { getOrders } from "../api/orders.js";
import { buildCustomerDirectory, setBlacklisted } from "../api/customers.js";

const currency = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const TAG_STYLE = {
  VIP: "bg-amber-50 text-amber-700 ring-amber-600/30",
  Regular: "bg-sky-50 text-sky-700 ring-sky-600/20",
  New: "bg-mist-100 text-slate-500 ring-slate-300/40",
};

const Customers = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [, forceRefresh] = useState(0);

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const customers = useMemo(() => buildCustomerDirectory(orders), [orders]);

  const filtered = customers.filter(
    (c) =>
      !query ||
      c.name?.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query)
  );

  const handleToggleBlacklist = (c) => {
    const reason = c.blacklisted
      ? ""
      : prompt("ব্ল্যাকলিস্ট করার কারণ লিখুন (ঐচ্ছিক):") || "";
    setBlacklisted(c.phone, !c.blacklisted, reason);
    forceRefresh((x) => x + 1);
  };

  return (
    <AdminLayout title="Customers" subtitle={`মোট ${customers.length} জন কাস্টমার`}>
      <div className="relative mb-5 max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="নাম বা ফোন নাম্বার খুঁজুন..."
          className="w-full rounded-xl border border-mist-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" size={26} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((c) => (
            <div
              key={c.phone}
              className={`rounded-2xl border bg-white p-5 shadow-card ${
                c.blacklisted ? "border-rose-300" : "border-mist-200"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">{c.name}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <Phone size={11} /> {c.phone}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${TAG_STYLE[c.tag]}`}
                  >
                    {c.tag === "VIP" && <Star size={10} className="mr-1 inline" />}
                    {c.tag}
                  </span>
                  {c.blacklisted && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                      <UserX size={10} /> ব্ল্যাকলিস্টেড
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-mist-50 py-2">
                  <p className="text-sm font-bold text-ink-900">{c.totalOrders}</p>
                  <p className="text-[10px] text-slate-400">মোট অর্ডার</p>
                </div>
                <div className="rounded-xl bg-mist-50 py-2">
                  <p className="text-sm font-bold text-emerald-600">{c.successRate}%</p>
                  <p className="text-[10px] text-slate-400">সফল ডেলিভারি</p>
                </div>
                <div className="rounded-xl bg-mist-50 py-2">
                  <p className="text-sm font-bold text-brand-600">{currency(c.totalSpend)}</p>
                  <p className="text-[10px] text-slate-400">Lifetime Value</p>
                </div>
              </div>

              {c.blacklistReason && (
                <p className="mt-2 text-xs text-rose-500">কারণ: {c.blacklistReason}</p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setExpanded(expanded === c.phone ? null : c.phone)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  <TrendingUp size={12} />
                  {expanded === c.phone ? "হিস্টোরি লুকান" : "অর্ডার হিস্টোরি দেখুন"}
                </button>
                <button
                  onClick={() => handleToggleBlacklist(c)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                    c.blacklisted
                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                  }`}
                >
                  {c.blacklisted ? "আনব্লক করুন" : "ব্ল্যাকলিস্ট করুন"}
                </button>
              </div>

              {expanded === c.phone && (
                <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto border-t border-mist-100 pt-3">
                  {[...c.orders]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((o) => (
                      <Link
                        key={o._id}
                        to={`/orders/${o._id}`}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-mist-50"
                      >
                        <span className="text-slate-500">
                          {new Date(o.createdAt).toLocaleDateString("en-GB")}
                        </span>
                        <span className="font-semibold text-ink-900">{currency(o.total)}</span>
                        <StatusBadge status={o.status} />
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-16 text-center text-sm text-slate-400">
              কোনো কাস্টমার পাওয়া যায়নি
            </p>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default Customers;
