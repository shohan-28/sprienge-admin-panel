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
import { getAdminById } from "../config/admins.js";

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
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
};

const Dashboard = () => {
  const { admin, admins } = useAuth();
  const [orders, setOrders] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch(() => setErr("অর্ডার লোড করা যায়নি। Backend চলছে কিনা চেক করুন।"))
      .finally(() => setLoading(false));
    setAssignments(getAllAssignments());
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((o) => isWithinRange(o.createdAt, dateRange)),
    [orders, dateRange]
  );

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const pending = filteredOrders.filter((o) => o.status === "pending").length;
    const delivered = filteredOrders.filter((o) => o.status === "delivered").length;
    const revenue = filteredOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const myAssigned = filteredOrders.filter(
      (o) => admin && assignments[o._id]?.adminId === admin.id
    ).length;
    const unassigned = filteredOrders.filter((o) => !assignments[o._id]).length;
    return { total, pending, delivered, revenue, myAssigned, unassigned };
  }, [filteredOrders, assignments, admin]);

  const adminPerformance = useMemo(() => {
    const map = {};
    admins?.forEach((a) => {
      map[a.id] = { admin: a, orderCount: 0, amount: 0 };
    });
    filteredOrders.forEach((o) => {
      const adminId = assignments[o._id]?.adminId;
      if (!adminId) return;
      if (!map[adminId]) {
        const a = getAdminById(adminId);
        if (!a) return;
        map[adminId] = { admin: a, orderCount: 0, amount: 0 };
      }
      map[adminId].orderCount += 1;
      if (o.status !== "cancelled") map[adminId].amount += o.total || 0;
    });
    return Object.values(map).sort((a, b) => b.orderCount - a.orderCount);
  }, [filteredOrders, assignments, admins]);

  const topProducts = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      if (o.status === "cancelled") return;
      (o.items || []).forEach((it) => {
        const key = it.name || "Unnamed";
        if (!map[key]) {
          map[key] = { name: key, image: it.image, qty: 0, amount: 0 };
        }
        map[key].qty += Number(it.quantity) || 0;
        map[key].amount += (Number(it.price) || 0) * (Number(it.quantity) || 0);
      });
    });
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [filteredOrders]);

  const chartData = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      map[key] = (map[key] || 0) + (o.total || 0);
    });
    return Object.entries(map)
      .map(([date, total]) => ({ date, total }))
      .slice(-7);
  }, [filteredOrders]);

  const recentOrders = useMemo(
    () =>
      [...filteredOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6),
    [filteredOrders]
  );

  return (
    <AdminLayout title="Dashboard" subtitle="আজকের অর্ডার ও বিক্রয়ের সারাংশ">
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
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
          {err}
        </div>
      ) : (
        <>
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

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
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
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EA580C" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#EA580C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      formatter={(v) => currency(v)}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
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

            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-4 shadow-card sm:p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink-900">
                  সাম্প্রতিক অর্ডার
                </h3>
                <Link
                  to="/orders"
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  সব দেখুন <ArrowUpRight size={13} />
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
                      <p className="text-xs text-slate-400">{o.phone}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="hidden text-sm font-semibold text-ink-900 sm:inline">
                        {currency(o.total)}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-4 shadow-card sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <UserCheck size={17} className="text-brand-600" />
                Admin পারফরম্যান্স
              </h3>
              {adminPerformance.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  এখনো কোনো অর্ডার অ্যাসাইন হয়নি
                </p>
              ) : (
                <div className="space-y-2.5">
                  {adminPerformance.map(({ admin: a, orderCount, amount }) => (
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
                          <p className="text-[11px] text-slate-400">{a.role}</p>
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
                  ))}
                </div>
              )}
            </div>

            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-4 shadow-card sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <Trophy size={17} className="text-brand-600" />
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
                      key={p.name + i}
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
                            <Package size={14} className="text-slate-300" />
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
        </>
      )}
    </AdminLayout>
  );
};

export default Dashboard;
