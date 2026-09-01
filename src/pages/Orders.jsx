import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Loader2,
  Trash2,
  Eye,
  PackageX,
  ArrowUpDown,
  Download,
  MapPin,
  Truck,
  Printer,
  PackageCheck,
  CheckSquare,
  Square,
  Plus,
  Lock,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import AssignedBadge from "../components/AssignedBadge.jsx";
import SourceBadge from "../components/SourceBadge.jsx";
import {
  getOrders,
  updateOrderStatus,
  deleteOrder,
  createSteadfastParcel,
} from "../api/orders.js";
import { getAllAssignments, recordEdit } from "../api/assignments.js";
import { useAuth } from "../context/AuthContext.jsx";
import { hasPermission } from "../config/admins.js";
import { runPrintQueue } from "../utils/printQueue.js";
import { getLabelSettings } from "../config/settings.js";
import { getTenantById } from "../config/tenants.js";

const currency = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "তারিখ: নতুন আগে" },
  { value: "date_asc", label: "তারিখ: পুরাতন আগে" },
  { value: "total_desc", label: "মোট: বেশি আগে" },
  { value: "total_asc", label: "মোট: কম আগে" },
];

const PAGE_SIZE = 10;

const CourierBadge = ({ order }) => {
  if (!order.consignmentId) {
    return <span className="text-xs text-slate-300">—</span>;
  }
  const status = order.courierStatus || "created";
  const tone =
    status === "delivered"
      ? "bg-emerald-50 text-emerald-600"
      : status === "cancelled" || status === "failed"
      ? "bg-rose-50 text-rose-600"
      : "bg-sky-50 text-sky-600";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${tone}`}
    >
      <Truck size={11} />
      {status}
    </span>
  );
};

const Orders = () => {
  const { admin } = useAuth();
  const canDelete = hasPermission(admin, "deleteOrders");
  const canExport = hasPermission(admin, "exportData");
  const [orders, setOrders] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [rowProgress, setRowProgress] = useState({});

  const load = () => {
    setLoading(true);
    getOrders()
      .then(setOrders)
      .catch(() => setErr("অর্ডার লোড করা যায়নি। Backend চলছে কিনা চেক করুন।"))
      .finally(() => setLoading(false));
    setAssignments(getAllAssignments());
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = orders.filter((o) => {
      const matchesQuery =
        !query ||
        o.name?.toLowerCase().includes(query.toLowerCase()) ||
        o.phone?.includes(query) ||
        o._id?.includes(query);
      const matchesStatus =
        statusFilter === "all" || o.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "total_desc":
          return (b.total || 0) - (a.total || 0);
        case "total_asc":
          return (a.total || 0) - (b.total || 0);
        case "date_desc":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return list;
  }, [orders, query, statusFilter, sortBy]);

  useEffect(() => setPage(1), [query, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange = async (id, status, order) => {
    if (order?.courierStatus && !admin?.canManageCourier) {
      alert("Steadfast থেকে status নির্ধারিত হয়ে গেছে — শুধুমাত্র কুরিয়ার ম্যানেজার এটা পরিবর্তন করতে পারবেন।");
      return;
    }
    setBusyId(id);
    try {
      const updated = await updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)));
      if (admin) recordEdit(id, admin.id, `status → ${status}`);
    } catch {
      alert("স্ট্যাটাস আপডেট করা যায়নি।");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("এই অর্ডারটি স্থায়ীভাবে মুছে ফেলতে চান?")) return;
    setBusyId(id);
    try {
      await deleteOrder(id);
      if (admin) recordEdit(id, admin.id, "deleted order");
      setOrders((prev) => prev.filter((o) => o._id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      alert("অর্ডার মুছে ফেলা যায়নি।");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const header = [
      "Order ID",
      "Name",
      "Phone",
      "District",
      "Thana",
      "Items",
      "Total",
      "Status",
      "Courier Status",
      "Consignment ID",
      "Date",
    ];
    const rows = filtered.map((o) => [
      o._id,
      o.name,
      o.phone,
      o.district,
      o.thana,
      o.items?.length || 0,
      o.total,
      o.status,
      o.courierStatus || "",
      o.consignmentId || "",
      new Date(o.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bdmart-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const pageIdsSelected = paged.every((o) => selected.has(o._id)) && paged.length > 0;

  const toggleSelectPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageIdsSelected) {
        paged.forEach((o) => next.delete(o._id));
      } else {
        paged.forEach((o) => next.add(o._id));
      }
      return next;
    });
  };

  const selectedOrders = orders.filter((o) => selected.has(o._id));

  const handleBulkCreateAndPrint = async () => {
    if (selectedOrders.length === 0) return;
    setBulkRunning(true);
    try {
      const readyToPrint = [];
      for (const order of selectedOrders) {
        setRowProgress((p) => ({ ...p, [order._id]: "creating" }));
        if (order.consignmentId) {
          readyToPrint.push(order);
          setRowProgress((p) => ({ ...p, [order._id]: "already-created" }));
          continue;
        }
        try {
          const updated = await createSteadfastParcel(order._id);
          setOrders((prev) =>
            prev.map((o) => (o._id === order._id ? updated : o))
          );
          readyToPrint.push(updated);
          setRowProgress((p) => ({ ...p, [order._id]: "created" }));
        } catch {
          setRowProgress((p) => ({ ...p, [order._id]: "parcel-failed" }));
        }
      }

      await runPrintQueue(readyToPrint, getLabelSettings(), {
        onProgress: (id, status) =>
          setRowProgress((p) => ({ ...p, [id]: status })),
      });
    } finally {
      setBulkRunning(false);
    }
  };

  const handlePrintSelected = async () => {
    if (selectedOrders.length === 0) return;
    setBulkRunning(true);
    try {
      await runPrintQueue(selectedOrders, getLabelSettings(), {
        onProgress: (id, status) =>
          setRowProgress((p) => ({ ...p, [id]: status })),
      });
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <AdminLayout title="Orders" subtitle={`মোট ${orders.length} টি অর্ডার`}>
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="নাম, ফোন বা অর্ডার আইডি খুঁজুন..."
              className="w-full rounded-xl border border-mist-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <ArrowUpDown
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-xl border border-mist-200 bg-white py-2.5 pl-8 pr-8 text-xs font-semibold text-slate-600 outline-none focus:border-brand-500"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {canExport && (
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 rounded-xl border border-mist-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-mist-100"
                title="CSV এক্সপোর্ট করুন"
              >
                <Download size={14} />
                CSV
              </button>
            )}
            <Link
              to="/orders/new"
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={14} />
              Create Order
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                statusFilter === s
                  ? "bg-ink-900 text-white"
                  : "bg-white text-slate-500 ring-1 ring-mist-200 hover:bg-mist-100"
              }`}
            >
              {s === "all" ? "সব" : s}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="no-print animate-in mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
          <span className="text-sm font-semibold text-brand-700">
            {selected.size} টি অর্ডার সিলেক্টেড
          </span>
          <div className="flex flex-wrap gap-2">
            {admin?.canManageCourier && (
              <button
                onClick={handleBulkCreateAndPrint}
                disabled={bulkRunning}
                className="flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-900/90 disabled:opacity-60"
              >
                {bulkRunning ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <PackageCheck size={13} />
                )}
                Steadfast Parcel তৈরি করে প্রিন্ট করুন
              </button>
            )}
            <button
              onClick={handlePrintSelected}
              disabled={bulkRunning}
              className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100 disabled:opacity-60"
            >
              <Printer size={13} /> শুধু লেবেল প্রিন্ট করুন
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              সিলেকশন বাতিল
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" size={26} />
        </div>
      ) : err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-600">
          {err}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-mist-200 bg-white py-16 text-slate-400 shadow-card">
          <PackageX size={32} className="mb-3" />
          <p className="text-sm font-medium">কোনো অর্ডার পাওয়া যায়নি</p>
        </div>
      ) : (
        <>
          <div className="animate-in hidden overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-card lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mist-200 bg-mist-50/60 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3.5">
                      <button onClick={toggleSelectPage} className="flex items-center">
                        {pageIdsSelected ? (
                          <CheckSquare size={16} className="text-brand-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="px-5 py-3.5">কাস্টমার</th>
                    <th className="px-5 py-3.5">জেলা</th>
                    <th className="px-5 py-3.5">সোর্স</th>
                    <th className="px-5 py-3.5">আইটেম</th>
                    <th className="px-5 py-3.5">মোট</th>
                    <th className="px-5 py-3.5">স্ট্যাটাস</th>
                    <th className="px-5 py-3.5">কুরিয়ার</th>
                    <th className="px-5 py-3.5">অ্যাসাইনড</th>
                    <th className="px-5 py-3.5">তারিখ</th>
                    <th className="px-5 py-3.5 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-100">
                  {paged.map((o) => (
                    <tr
                      key={o._id}
                      className={`transition hover:bg-mist-50/70 ${
                        busyId === o._id ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <button onClick={() => toggleSelect(o._id)} className="flex items-center">
                          {selected.has(o._id) ? (
                            <CheckSquare size={16} className="text-brand-600" />
                          ) : (
                            <Square size={16} className="text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-ink-900">{o.name}</p>
                        <p className="text-xs text-slate-400">{o.phone}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {o.district}
                        {o.thana ? `, ${o.thana}` : ""}
                        {o.tenantId && (
                          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                            {getTenantById(o.tenantId)?.name || o.tenantId}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <SourceBadge source={o.source} />
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {o.items?.length || 0} টি
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-ink-900">
                        {currency(o.total)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="relative inline-flex items-center gap-1">
                          <StatusBadge status={o.status} />
                          {o.courierStatus && !admin?.canManageCourier && (
                            <Lock size={11} className="text-slate-400" />
                          )}
                          <select
                            value={o.status}
                            disabled={
                              busyId === o._id ||
                              (o.courierStatus && !admin?.canManageCourier)
                            }
                            onChange={(e) =>
                              handleStatusChange(o._id, e.target.value, o)
                            }
                            className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <CourierBadge order={o} />
                        {rowProgress[o._id] && (
                          <p className="mt-1 text-[10px] capitalize text-slate-400">
                            {rowProgress[o._id]}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <AssignedBadge adminId={assignments[o._id]?.adminId} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {new Date(o.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/orders/${o._id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye size={16} />
                          </Link>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(o._id)}
                              disabled={busyId === o._id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="animate-in grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {paged.map((o) => (
              <div
                key={o._id}
                className={`rounded-2xl border border-mist-200 bg-white p-4 shadow-card ${
                  busyId === o._id ? "opacity-50" : ""
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <button
                      onClick={() => toggleSelect(o._id)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {selected.has(o._id) ? (
                        <CheckSquare size={16} className="text-brand-600" />
                      ) : (
                        <Square size={16} className="text-slate-300" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-900">
                        {o.name}
                      </p>
                      <p className="text-xs text-slate-400">{o.phone}</p>
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={12} className="flex-shrink-0" />
                  <span className="truncate">
                    {o.district}
                    {o.thana ? `, ${o.thana}` : ""}
                  </span>
                  <SourceBadge source={o.source} />
                </div>

                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {o.items?.length || 0} টি আইটেম
                  </span>
                  <span className="font-bold text-ink-900">
                    {currency(o.total)}
                  </span>
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <AssignedBadge adminId={assignments[o._id]?.adminId} />
                  <CourierBadge order={o} />
                </div>

                <div className="flex items-center justify-between border-t border-mist-100 pt-3">
                  <span className="text-xs text-slate-400">
                    {new Date(o.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/orders/${o._id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Eye size={16} />
                    </Link>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(o._id)}
                        disabled={busyId === o._id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between text-sm">
              <p className="text-slate-500">
                পাতা {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-mist-200 bg-white px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
                >
                  আগে
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-mist-200 bg-white px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
                >
                  পরে
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default Orders;
