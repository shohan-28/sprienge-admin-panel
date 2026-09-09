
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  BadgeDollarSign,
  ArrowUpRight,
  Loader2,
  UserCheck,
  Package,
  Trophy,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import AdminLayout from "../layouts/AdminLayout.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

import { getOrders } from "../api/orders.js";
import { getAllAssignments } from "../api/assignments.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getAdminById, hasPermission } from "../config/admins.js";
import { getProducts } from "../api/products.js";
import { getTenantById } from "../config/tenants.js";

const currency = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const RANGE_OPTIONS = [
  { value: "today", label: "আজ" },
  { value: "week", label: "এই সপ্তাহ" },
  { value: "month", label: "এই মাস" },
  { value: "all", label: "সব সময়" },
];

const isWithinRange = (dateStr, range) => {
  if (range === "all") return true;

  const d = new Date(dateStr);
  const now = new Date();

  if (range === "today") {
    return d.toDateString() === now.toDateString();
  }

  if (range === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }

  if (range === "month") {
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }

  return true;
};

const Dashboard = () => {
  const { admin, admins } = useAuth();

  const canViewFinance = hasPermission(admin, "viewFinance");

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dateRange, setDateRange] = useState("all");

  // =========================================================
  // LOAD DASHBOARD DATA
  // =========================================================
  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      setLoading(true);

      try {
        const [ordersData, productsData] = await Promise.all([
          getOrders(),
          getProducts(),
        ]);

        if (!mounted) return;

        // Always make sure state receives arrays
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);

        setAssignments(getAllAssignments());
      } catch (error) {
        console.error("Dashboard loading error:", error);

        if (!mounted) return;

        setOrders([]);
        setProducts([]);

        setErr(
          "ড্যাশবোর্ডের ডেটা লোড করা যায়নি। Backend চলছে কিনা এবং API ঠিক আছে কিনা চেক করুন।"
        );
      } finally {
        if (mounted) {
          setLoading(false);
          setProductsLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // FILTERED ORDERS
  // =========================================================
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    return orders.filter((o) =>
      isWithinRange(o.createdAt, dateRange)
    );
  }, [orders, dateRange]);

  // =========================================================
  // BASIC STATS
  // =========================================================
  const stats = useMemo(() => {
    const total = filteredOrders.length;

    const pending = filteredOrders.filter(
      (o) => o.status === "pending"
    ).length;

    const delivered = filteredOrders.filter(
      (o) => o.status === "delivered"
    ).length;

    const revenue = filteredOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const myAssigned = filteredOrders.filter(
      (o) => admin && assignments[o._id]?.adminId === admin.id
    ).length;

    const unassigned = filteredOrders.filter(
      (o) => !assignments[o._id]
    ).length;

    return {
      total,
      pending,
      delivered,
      revenue,
      myAssigned,
      unassigned,
    };
  }, [filteredOrders, assignments, admin]);

  // =========================================================
  // ADMIN PERFORMANCE
  // =========================================================
  const adminPerformance = useMemo(() => {
    const map = {};

    if (Array.isArray(admins)) {
      admins.forEach((a) => {
        map[a.id] = {
          admin: a,
          orderCount: 0,
          amount: 0,
        };
      });
    }

    filteredOrders.forEach((o) => {
      const adminId = assignments[o._id]?.adminId;

      if (!adminId) return;

      if (!map[adminId]) {
        const a = getAdminById(adminId);

        if (!a) return;

        map[adminId] = {
          admin: a,
          orderCount: 0,
          amount: 0,
        };
      }

      map[adminId].orderCount += 1;

      if (o.status !== "cancelled") {
        map[adminId].amount += Number(o.total || 0);
      }
    });

    return Object.values(map).sort(
      (a, b) => b.orderCount - a.orderCount
    );
  }, [filteredOrders, assignments, admins]);

  // =========================================================
  // TOP PRODUCTS
  // =========================================================
  const topProducts = useMemo(() => {
    const map = {};

    filteredOrders.forEach((o) => {
      if (o.status === "cancelled") return;

      const items = Array.isArray(o.items) ? o.items : [];

      items.forEach((it) => {
        const key = it.name || "Unnamed";

        if (!map[key]) {
          map[key] = {
            name: key,
            image: it.image || "",
            qty: 0,
            amount: 0,
          };
        }

        map[key].qty += Number(it.quantity) || 0;

        map[key].amount +=
          (Number(it.price) || 0) *
          (Number(it.quantity) || 0);
      });
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [filteredOrders]);

  // =========================================================
  // RATE / PROFIT METRICS
  // =========================================================
  const rates = useMemo(() => {
    const total = filteredOrders.length || 1;

    const confirmed = filteredOrders.filter(
      (o) => o.status !== "pending"
    ).length;

    const delivered = filteredOrders.filter(
      (o) => o.status === "delivered"
    ).length;

    const returned = filteredOrders.filter(
      (o) => o.returnReason || Number(o.refundAmount || 0) > 0
    ).length;

    const cancelled = filteredOrders.filter(
      (o) => o.status === "cancelled"
    ).length;

    const revenue = filteredOrders
      .filter((o) => o.status !== "cancelled")
      .reduce(
        (sum, o) => sum + Number(o.total || 0),
        0
      );

    const aov =
      filteredOrders.length > 0
        ? revenue / filteredOrders.length
        : 0;

    // ---------------------------------------------------------
    // TODAY ORDERS
    // ---------------------------------------------------------
    const todayStr = new Date().toDateString();

    const todayOrders = orders.filter(
      (o) =>
        new Date(o.createdAt).toDateString() === todayStr &&
        o.status !== "cancelled"
    );

    // ---------------------------------------------------------
    // PRODUCT LOOKUP
    // ---------------------------------------------------------
    const productById = {};

    if (Array.isArray(products)) {
      products.forEach((p) => {
        const id = p.productId ?? p.id ?? p._id;

        if (id !== undefined && id !== null) {
          productById[String(id)] = p;
        }
      });
    }

    // ---------------------------------------------------------
    // TODAY PROFIT
    // ---------------------------------------------------------
    const todayProfit = todayOrders.reduce((sum, o) => {
      const items = Array.isArray(o.items) ? o.items : [];

      const itemProfit = items.reduce((s, it) => {
        const productId = it.productId;

        const product = productId
          ? productById[String(productId)]
          : null;

        const cost = Number(product?.costPrice || 0);
        const price = Number(it.price || 0);
        const quantity = Number(it.quantity || 1);

        return s + (price - cost) * quantity;
      }, 0);

      return sum + itemProfit;
    }, 0);

    return {
      confirmationRate: Math.round(
        (confirmed / total) * 100
      ),

      deliveryRate: Math.round(
        (delivered / total) * 100
      ),

      returnRate: Math.round(
        (returned / total) * 100
      ),

      cancellationRate: Math.round(
        (cancelled / total) * 100
      ),

      aov,

      todayOrderCount: todayOrders.length,

      todayProfit,
    };
  }, [filteredOrders, orders, products]);

  // =========================================================
  // BEST TENANT
  // =========================================================
  const bestTenant = useMemo(() => {
    const map = {};

    filteredOrders.forEach((o) => {
      if (!o.tenantId || o.status === "cancelled") return;

      map[o.tenantId] =
        (map[o.tenantId] || 0) +
        Number(o.total || 0);
    });

    const entries = Object.entries(map).sort(
      (a, b) => b[1] - a[1]
    );

    if (entries.length === 0) return null;

    const t = getTenantById(entries[0][0]);

    return {
      name: t?.name || entries[0][0],
      amount: entries[0][1],
    };
  }, [filteredOrders]);

  // =========================================================
  // BEST CATEGORY
  // =========================================================
  const bestCategory = useMemo(() => {
    const productByName = {};

    if (Array.isArray(products)) {
      products.forEach((p) => {
        if (p.name) {
          productByName[p.name] = p;
        }
      });
    }

    const map = {};

    filteredOrders.forEach((o) => {
      if (o.status === "cancelled") return;

      const items = Array.isArray(o.items) ? o.items : [];

      items.forEach((it) => {
        const product = productByName[it.name];

        const category = product?.category;

        if (!category) return;

        map[category] =
          (map[category] || 0) +
          Number(it.quantity || 0);
      });
    });

    const entries = Object.entries(map).sort(
      (a, b) => b[1] - a[1]
    );

    return entries.length > 0
      ? {
          name: entries[0][0],
          qty: entries[0][1],
        }
      : null;
  }, [filteredOrders, products]);

  // =========================================================
  // CHART DATA
  // =========================================================
  const chartData = useMemo(() => {
    const map = {};

    filteredOrders.forEach((o) => {
      const d = new Date(o.createdAt);

      const key = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });

      map[key] =
        (map[key] || 0) +
        Number(o.total || 0);
    });

    return Object.entries(map)
      .map(([date, total]) => ({
        date,
        total,
      }))
      .slice(-7);
  }, [filteredOrders]);

  // =========================================================
  // RECENT ORDERS
  // =========================================================
  const recentOrders = useMemo(
    () =>
      [...filteredOrders]
        .sort(
          (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        )
        .slice(0, 6),
    [filteredOrders]
  );

  // =========================================================
  // UI
  // =========================================================
  return (
    <AdminLayout
      title="Dashboard"
      subtitle="আজকের অর্ডার ও বিক্রয়ের সারাংশ"
    >
      {/* DATE RANGE */}
      <div className="mb-4 flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setDateRange(r.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              dateRange === r.value
                ? "bg-ink-900 text-white"
                : "bg-white text-slate-500 ring-1 ring-mist-200 hover:bg-mist-100"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2
            className="animate-spin"
            size={28}
          />
        </div>
      ) : err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
          {err}
        </div>
      ) : (
        <>
          {/* ================================================= */}
          {/* BASIC STATS */}
          {/* ================================================= */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="মোট অর্ডার"
              value={stats.total}
              icon={ShoppingBag}
              accent="brand"
            />

            <StatCard
              label="অপেক্ষমান"
              value={stats.pending}
              icon={Clock}
              accent="sky"
            />

            <StatCard
              label="ডেলিভারড"
              value={stats.delivered}
              icon={CheckCircle2}
              accent="emerald"
            />

            <StatCard
              label="মোট বিক্রয়"
              value={currency(stats.revenue)}
              icon={BadgeDollarSign}
              accent="rose"
            />
          </div>

          {/* ================================================= */}
          {/* ASSIGNMENT STATS */}
          {/* ================================================= */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <StatCard
              label="আমাকে অ্যাসাইনকৃত অর্ডার"
              value={stats.myAssigned}
              icon={UserCheck}
              accent="violet"
              hint={admin ? admin.name : ""}
            />

            <StatCard
              label="অ্যাসাইন বাকি"
              value={stats.unassigned}
              icon={UserCheck}
              accent="sky"
              hint="সম্পাদনার জন্য অ্যাসাইন প্রয়োজন"
            />
          </div>

          {/* ================================================= */}
          {/* RATES */}
          {/* ================================================= */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="কনফার্মেশন রেট"
              value={`${rates.confirmationRate}%`}
              icon={CheckCircle2}
              accent="sky"
            />

            <StatCard
              label="ডেলিভারি সাকসেস"
              value={`${rates.deliveryRate}%`}
              icon={CheckCircle2}
              accent="emerald"
            />

            <StatCard
              label="ক্যান্সেলেশন রেট"
              value={`${rates.cancellationRate}%`}
              icon={Clock}
              accent="rose"
            />

            <StatCard
              label="রিটার্ন রেট"
              value={`${rates.returnRate}%`}
              icon={Clock}
              accent="rose"
            />

            <StatCard
              label="Avg Order Value"
              value={currency(rates.aov)}
              icon={BadgeDollarSign}
              accent="brand"
            />

            {canViewFinance && (
              <StatCard
                label="আজকের লাভ"
                value={currency(rates.todayProfit)}
                icon={BadgeDollarSign}
                accent="violet"
                hint={`${rates.todayOrderCount} টি অর্ডার`}
              />
            )}
          </div>

          {/* ================================================= */}
          {/* TENANT + CATEGORY */}
          {/* ================================================= */}
          {(bestTenant || bestCategory) && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bestTenant && (
                <StatCard
                  label="সেরা Tenant/Store"
                  value={bestTenant.name}
                  icon={BadgeDollarSign}
                  accent="brand"
                  hint={currency(bestTenant.amount)}
                />
              )}

              {bestCategory && (
                <StatCard
                  label="সেরা ক্যাটেগরি"
                  value={bestCategory.name}
                  icon={ShoppingBag}
                  accent="sky"
                  hint={`${bestCategory.qty} পিস বিক্রি হয়েছে`}
                />
              )}
            </div>
          )}

          {/* ================================================= */}
          {/* CHART + RECENT ORDERS */}
          {/* ================================================= */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
            {/* SALES CHART */}
            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-4 shadow-card sm:p-6 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink-900">
                  বিক্রয় ট্রেন্ড
                </h3>

                <span className="text-xs font-medium text-slate-400">
                  সাম্প্রতিক দিনসমূহ
                </span>
              </div>

              {chartData.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-sm text-slate-400">
                  এখনো কোনো ডেটা নেই
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={230}
                >
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="rev"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#EA580C"
                          stopOpacity={0.3}
                        />

                        <stop
                          offset="100%"
                          stopColor="#EA580C"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="#F1F5F9"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 12,
                        fill: "#94A3B8",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{
                        fontSize: 12,
                        fill: "#94A3B8",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />

                    <Tooltip
                      formatter={(v) => currency(v)}
                      contentStyle={{
                        borderRadius: 12,
                        border:
                          "1px solid #E2E8F0",
                        fontSize: 13,
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#EA580C"
                      strokeWidth={2.5}
                      fill="url(#rev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* RECENT ORDERS */}
            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-4 shadow-card sm:p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink-900">
                  সাম্প্রতিক অর্ডার
                </h3>

                <Link
                  to="/orders"
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  সব দেখুন
                  <ArrowUpRight size={13} />
                </Link>
              </div>

              <div className="space-y-1">
                {recentOrders.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">
                    কোনো অর্ডার নেই
                  </p>
                )}

                {recentOrders.map((o) => (
                  <Link
                    to={`/orders/${o._id}`}
                    key={o._id}
                    className="flex items-center justify-between gap-2 rounded-xl px-2 py-2.5 transition hover:bg-mist-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {o.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {o.phone}
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="hidden text-sm font-semibold text-ink-900 sm:inline">
                        {currency(o.total)}
                      </span>

                      <StatusBadge
                        status={o.status}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* ADMIN + TOP PRODUCTS */}
          {/* ================================================= */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* ADMIN PERFORMANCE */}
            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-4 shadow-card sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <UserCheck
                  size={17}
                  className="text-brand-600"
                />
                Admin পারফরম্যান্স
              </h3>

              {adminPerformance.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  এখনো কোনো অর্ডার অ্যাসাইন হয়নি
                </p>
              ) : (
                <div className="space-y-2.5">
                  {adminPerformance.map(
                    ({
                      admin: a,
                      orderCount,
                      amount,
                    }) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-xl bg-mist-50 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={a.avatar}
                            alt={a.name}
                            className="h-8 w-8 rounded-full ring-1 ring-mist-200"
                          />

                          <div>
                            <p className="text-sm font-semibold text-ink-900">
                              {a.name}
                            </p>

                            <p className="text-[11px] text-slate-400">
                              {a.role}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-ink-900">
                            {orderCount} টি অর্ডার
                          </p>

                          <p className="text-xs text-brand-600">
                            {currency(amount)}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* TOP PRODUCTS */}
            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-4 shadow-card sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <Trophy
                  size={17}
                  className="text-brand-600"
                />
                সর্বাধিক বিক্রিত পণ্য
              </h3>

              {topProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  এখনো কোনো প্রোডাক্ট ডেটা নেই
                </p>
              ) : (
                <div className="space-y-2.5">
                  {topProducts.map((p, i) => (
                    <div
                      key={`${p.name}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-mist-50 px-3.5 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                          {i + 1}
                        </span>

                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-9 w-9 flex-shrink-0 rounded-lg bg-white object-cover ring-1 ring-mist-200"
                          />
                        ) : (
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-mist-200">
                            <Package
                              size={14}
                              className="text-slate-300"
                            />
                          </div>
                        )}

                        <p className="truncate text-sm font-semibold text-ink-900">
                          {p.name}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold text-ink-900">
                          {p.qty} বার
                        </p>

                        <p className="text-xs text-brand-600">
                          {currency(p.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PRODUCT LOADING INDICATOR */}
          {productsLoading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2
                size={14}
                className="animate-spin"
              />
              Product data loading...
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default Dashboard;
