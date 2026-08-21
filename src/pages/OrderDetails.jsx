import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Phone,
  MapPin,
  StickyNote,
  Trash2,
  Pencil,
  Save,
  X,
  UserPlus,
  UserMinus,
  Lock,
  Printer,
  Plus,
  Minus,
  PackageCheck,
  Truck,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  RotateCcw,
  Send,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import AssignedBadge from "../components/AssignedBadge.jsx";
import SourceBadge from "../components/SourceBadge.jsx";
import { getTenantById } from "../config/tenants.js";
import { getAdminById } from "../config/admins.js";
import FraudCheckPanel from "../components/FraudCheckPanel.jsx";
import { COURIERS, DEFAULT_COURIER } from "../config/couriers.js";
import {
  getOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  confirmOrder,
  createSteadfastParcel,
} from "../api/orders.js";
import {
  getAssignment,
  assignOrder,
  unassignOrder,
  getLastEdit,
  recordEdit,
} from "../api/assignments.js";
import { getComments, addComment } from "../api/comments.js";
import { decrementStock } from "../api/products.js";
import { useAuth } from "../context/AuthContext.jsx";
import { runPrintQueue } from "../utils/printQueue.js";
import { getLabelSettings } from "../config/settings.js";

const currency = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const emptyForm = {
  name: "",
  phone: "",
  address: "",
  thana: "",
  district: "",
  note: "",
  deliveryCharge: 0,
  items: [],
};

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [lastEdit, setLastEdit] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [confirming, setConfirming] = useState(false);
  const [creatingParcel, setCreatingParcel] = useState(false);
  const [parcelError, setParcelError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [liveTracking, setLiveTracking] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [returnForm, setReturnForm] = useState({
    returnReason: "",
    refundAmount: "",
    refundStatus: "pending",
  });
  const [savingReturn, setSavingReturn] = useState(false);

  const load = () => {
    setLoading(true);
    getOrder(id)
      .then((data) => {
        setOrder(data);
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          address: data.address || "",
          thana: data.thana || "",
          district: data.district || "",
          note: data.note || "",
          deliveryCharge: data.deliveryCharge || 0,
          items: (data.items || []).map((it) => ({ ...it })),
        });
        setReturnForm({
          returnReason: data.returnReason || "",
          refundAmount: data.refundAmount || "",
          refundStatus: data.refundStatus || "pending",
        });
      })
      .catch(() => setErr("অর্ডারটি খুঁজে পাওয়া যায়নি।"))
      .finally(() => setLoading(false));
    setAssignment(getAssignment(id));
    setLastEdit(getLastEdit(id));
    setComments(getComments(id));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Live courier tracking: once a Steadfast consignment exists, poll the
  // order every 20s and merge in only the courier-related fields. Your
  // backend webhook (see backend-reference/) is what keeps these fresh in
  // the DB in near-real-time — this poll just picks up whatever the
  // webhook last wrote, without needing WebSockets.
  useEffect(() => {
    if (!liveTracking || !order?.consignmentId) return;

    const tick = async () => {
      try {
        const fresh = await getOrder(id);
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                courierStatus: fresh.courierStatus,
                trackingCode: fresh.trackingCode,
                consignmentId: fresh.consignmentId,
                courierHistory: fresh.courierHistory,
                parcelCreatedAt: fresh.parcelCreatedAt,
              }
            : fresh
        );
        setLastChecked(new Date());
      } catch {
        // silent — a missed poll isn't worth interrupting the admin with
      }
    };

    const interval = setInterval(tick, 20000);
    return () => clearInterval(interval);
  }, [id, liveTracking, order?.consignmentId]);

  const isAssignedToMe = admin && assignment?.adminId === admin.id;
  const isAssignedToOther = assignment && !isAssignedToMe;
  const canEdit = isAssignedToMe;

  const handleAssignToMe = () => {
    if (!admin) return;
    const a = assignOrder(id, admin.id);
    setAssignment(a);
  };

  const handleUnassign = () => {
    if (!confirm("এই অর্ডার থেকে অ্যাসাইনমেন্ট সরিয়ে ফেলতে চান?")) return;
    unassignOrder(id, admin?.id);
    setAssignment(null);
    setEditing(false);
  };

  const handleStatusChange = async (status) => {
    setSaving(true);
    try {
      const updated = await updateOrderStatus(id, status);
      setOrder(updated);
      if (admin) setLastEdit(recordEdit(id, admin.id, `status → ${status}`));
    } catch {
      alert("স্ট্যাটাস আপডেট করা যায়নি।");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("এই অর্ডারটি স্থায়ীভাবে মুছে ফেলতে চান?")) return;
    try {
      await deleteOrder(id);
      if (admin) recordEdit(id, admin.id, "deleted order");
      unassignOrder(id);
      navigate("/orders");
    } catch {
      alert("অর্ডার মুছে ফেলা যায়নি।");
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !admin) return;
    addComment(id, admin.id, commentText.trim());
    setComments(getComments(id));
    setCommentText("");
  };

  const handleSaveReturn = async () => {
    setSavingReturn(true);
    try {
      const updated = await updateOrder(id, {
        returnReason: returnForm.returnReason,
        refundAmount: Number(returnForm.refundAmount) || 0,
        refundStatus: returnForm.refundStatus,
      });
      setOrder(updated);
      if (admin)
        setLastEdit(recordEdit(id, admin.id, "updated return/refund", returnForm.refundStatus));
    } catch {
      alert(
        "রিটার্ন/রিফান্ড তথ্য সেভ করা যায়নি। ব্যাকএন্ডে returnReason/refundAmount/refundStatus ফিল্ড যোগ করা আছে কিনা যাচাই করুন।"
      );
    } finally {
      setSavingReturn(false);
    }
  };

  const itemsSubtotal = form.items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
    0
  );
  const formTotal = itemsSubtotal + (Number(form.deliveryCharge) || 0);

  const updateItemField = (idx, field, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };

  const removeItem = (idx) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  // "সব ঠিক থাকলে Confirm চাপলে সব সেভ হবে" — saves any pending edits (if
  // mid-edit) and moves the order to confirmed in one shot.
  const handleConfirmOrder = async () => {
    setConfirming(true);
    try {
      if (editing) {
        const payload = {
          name: form.name,
          phone: form.phone,
          address: form.address,
          thana: form.thana,
          district: form.district,
          note: form.note,
          deliveryCharge: Number(form.deliveryCharge) || 0,
          items: form.items,
          subtotal: itemsSubtotal,
          total: formTotal,
        };
        await updateOrder(id, payload);
        setEditing(false);
      }
      const updated = await confirmOrder(id);
      setOrder(updated);
      if (admin) setLastEdit(recordEdit(id, admin.id, "confirmed order"));

      // Decrement catalog stock now that the order is truly confirmed —
      // only works for items that carry a productId (i.e. added via the
      // Create Order product picker); orders from elsewhere just skip this.
      // Guarded by order.status so re-confirming an already-confirmed
      // order (e.g. a page refresh) never double-decrements.
      if (order?.status !== "confirmed") {
        (updated.items || []).forEach((it) => {
          if (it.productId) decrementStock(it.productId, it.quantity);
        });
      }
    } catch {
      alert(
        "অর্ডার কনফার্ম করা যায়নি। ব্যাকএন্ডে POST /orders/:id/confirm রুট যোগ করা আছে কিনা যাচাই করুন।"
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleCreateParcel = async (force = false) => {
    setParcelError("");
    setCreatingParcel(true);
    try {
      const updated = await createSteadfastParcel(id, { force });
      setOrder(updated);
      if (admin) setLastEdit(recordEdit(id, admin.id, "created Steadfast parcel"));

      // Auto Print: if enabled in Settings, the label prints itself the
      // instant the parcel is created — no separate click needed.
      const settings = getLabelSettings();
      if (settings.autoPrint) {
        await runPrintQueue([updated], settings, { markServerStatus: true });
      }
    } catch (e) {
      setParcelError(
        e?.response?.data?.error ||
          "Steadfast parcel তৈরি করা যায়নি। ব্যাকএন্ডে /orders/:id/create-parcel রুট ও Steadfast API credentials যাচাই করুন।"
      );
    } finally {
      setCreatingParcel(false);
    }
  };

  const handlePrintLabel = async () => {
    setPrinting(true);
    try {
      await runPrintQueue([order], getLabelSettings(), { markServerStatus: true });
    } finally {
      setPrinting(false);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        thana: form.thana,
        district: form.district,
        note: form.note,
        deliveryCharge: Number(form.deliveryCharge) || 0,
        items: form.items,
        subtotal: itemsSubtotal,
        total: formTotal,
      };
      const updated = await updateOrder(id, payload);
      setOrder(updated);
      setEditing(false);
      if (admin) setLastEdit(recordEdit(id, admin.id, "edited order details"));
    } catch {
      alert(
        "অর্ডার আপডেট করা যায়নি। ব্যাকএন্ডে PUT /orders/:id ফুল-এডিট সাপোর্ট করে কিনা যাচাই করুন।"
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (!order) return;
    setForm({
      name: order.name || "",
      phone: order.phone || "",
      address: order.address || "",
      thana: order.thana || "",
      district: order.district || "",
      note: order.note || "",
      deliveryCharge: order.deliveryCharge || 0,
      items: (order.items || []).map((it) => ({ ...it })),
    });
    setEditing(false);
  };

  return (
    <AdminLayout title="Order Details" subtitle={`Order ID: ${id}`}>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink-900"
        >
          <ArrowLeft size={15} /> সব অর্ডারে ফিরে যান
        </Link>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" size={26} />
        </div>
      ) : err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
          {err}
        </div>
      ) : (
        <div className="print-area grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Left: customer + items */}
          <div className="space-y-5 lg:col-span-2">
            {/* Assignment banner */}
            <div className="no-print animate-in flex flex-col gap-3 rounded-2xl border border-mist-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  এডিট অ্যাক্সেস
                </p>
                <AssignedBadge adminId={assignment?.adminId} size="md" />
              </div>
              <div className="flex items-center gap-2">
                {!assignment && (
                  <button
                    onClick={handleAssignToMe}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    <UserPlus size={14} /> নিজেকে অ্যাসাইন করুন
                  </button>
                )}
                {isAssignedToMe && (
                  <button
                    onClick={handleUnassign}
                    className="flex items-center gap-1.5 rounded-xl border border-mist-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-mist-100"
                  >
                    <UserMinus size={14} /> আনঅ্যাসাইন করুন
                  </button>
                )}
                {isAssignedToOther && (
                  <span className="flex items-center gap-1.5 rounded-xl bg-mist-100 px-3.5 py-2 text-xs font-medium text-slate-500">
                    <Lock size={13} /> এডিট লকড
                  </span>
                )}
              </div>
            </div>

            {/* Customer info */}
            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink-900">
                  কাস্টমার তথ্য
                </h3>
                <div className="no-print flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      disabled={!canEdit}
                      title={
                        canEdit
                          ? "তথ্য এডিট করুন"
                          : "এডিট করতে হলে প্রথমে নিজেকে অ্যাসাইন করুন"
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-mist-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Pencil size={13} /> এডিট
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Save size={13} /> সেভ
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100"
                      >
                        <X size={13} /> বাতিল
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {(order.tenantId || order.source) && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {order.tenantId && (
                    <span className="inline-flex items-center rounded-full bg-mist-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                      {getTenantById(order.tenantId)?.name || order.tenantId}
                    </span>
                  )}
                  <SourceBadge source={order.source} />
                </div>
              )}

              {!editing ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      নাম
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-900">
                      {order.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      ফোন
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                      <Phone size={13} className="text-slate-400" />
                      {order.phone}
                    </p>
                    <FraudCheckPanel phone={order.phone} />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      ঠিকানা
                    </p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-900">
                      <MapPin
                        size={13}
                        className="mt-0.5 flex-shrink-0 text-slate-400"
                      />
                      {order.address}, {order.thana}, {order.district}
                    </p>
                  </div>
                  {order.note && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        অর্ডার নোট (কাস্টমার)
                      </p>
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                        <StickyNote
                          size={13}
                          className="mt-0.5 flex-shrink-0 text-slate-400"
                        />
                        {order.note}
                      </p>
                    </div>
                  )}
                  {order.officeOrderNote && (
                    <div className="no-print sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-500">
                        অফিস নোট (শুধু admin-দের জন্য)
                      </p>
                      <p className="mt-1 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-sm text-amber-800">
                        <StickyNote
                          size={13}
                          className="mt-0.5 flex-shrink-0 text-amber-500"
                        />
                        {order.officeOrderNote}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      নাম
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      ফোন
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      জেলা
                    </label>
                    <input
                      value={form.district}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, district: e.target.value }))
                      }
                      className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      থানা
                    </label>
                    <input
                      value={form.thana}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, thana: e.target.value }))
                      }
                      className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      ঠিকানা
                    </label>
                    <input
                      value={form.address}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, address: e.target.value }))
                      }
                      className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      অর্ডার নোট
                    </label>
                    <textarea
                      value={form.note}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, note: e.target.value }))
                      }
                      rows={2}
                      className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
              <h3 className="mb-4 font-display text-base font-bold text-ink-900">
                অর্ডার আইটেম ({(editing ? form.items : order.items)?.length || 0})
              </h3>

              {!editing ? (
                <div className="divide-y divide-mist-100">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 py-3.5">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 flex-shrink-0 rounded-xl bg-mist-100 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {[item.brand, item.variant, item.size, item.color]
                            .filter(Boolean)
                            .join(" · ")}
                          {item.brand || item.variant || item.size || item.color
                            ? " · "
                            : ""}
                          Qty: {item.quantity}
                        </p>
                        {item.sku && (
                          <p className="text-[11px] text-slate-300">
                            SKU: {item.sku}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold text-ink-900">
                          {currency(item.price * item.quantity)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {currency(item.price)} / প্রতিটি
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-mist-100">
                  {form.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-3.5">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-14 w-14 flex-shrink-0 rounded-xl bg-mist-100 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400">{item.brand}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateItemField(
                              i,
                              "quantity",
                              Math.max(1, (Number(item.quantity) || 1) - 1)
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist-100 text-slate-500 hover:bg-mist-200"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "quantity",
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          className="w-12 rounded-lg border border-mist-200 px-1.5 py-1 text-center text-sm"
                        />
                        <button
                          onClick={() =>
                            updateItemField(
                              i,
                              "quantity",
                              (Number(item.quantity) || 1) + 1
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist-100 text-slate-500 hover:bg-mist-200"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={item.price}
                        onChange={(e) =>
                          updateItemField(i, "price", e.target.value)
                        }
                        className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                      />
                      <button
                        onClick={() => removeItem(i)}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {form.items.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-400">
                      কোনো আইটেম নেই
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: status + summary + courier */}
          <div className="space-y-5">
            <div className="no-print animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
              <h3 className="mb-3 font-display text-base font-bold text-ink-900">
                অর্ডার স্ট্যাটাস
              </h3>
              <div className="space-y-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    disabled={saving}
                    onClick={() => handleStatusChange(s)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium capitalize transition ${
                      order.status === s
                        ? "bg-ink-900 text-white"
                        : "bg-mist-50 text-slate-600 hover:bg-mist-100"
                    }`}
                  >
                    {s}
                    {order.status === s && (
                      <span className="text-xs">✓ বর্তমান</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
              <h3 className="mb-4 font-display text-base font-bold text-ink-900">
                পেমেন্ট সামারি
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-ink-900">
                    {currency(editing ? itemsSubtotal : order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Delivery</span>
                  {editing ? (
                    <input
                      type="number"
                      min={0}
                      value={form.deliveryCharge}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          deliveryCharge: e.target.value,
                        }))
                      }
                      className="w-24 rounded-lg border border-mist-200 px-2 py-1 text-right text-sm"
                    />
                  ) : (
                    <span className="font-medium text-ink-900">
                      {currency(order.deliveryCharge)}
                    </span>
                  )}
                </div>
                <div className="my-2 h-px bg-mist-200" />
                <div className="flex justify-between text-base font-bold text-ink-900">
                  <span>Total</span>
                  <span className="text-brand-600">
                    {currency(editing ? formTotal : order.total)}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                অর্ডার করা হয়েছে:{" "}
                {new Date(order.createdAt).toLocaleString("en-GB")}
              </p>
              {lastEdit && (
                <p className="mt-1 text-xs text-slate-400">
                  সর্বশেষ পরিবর্তন:{" "}
                  {new Date(lastEdit.at).toLocaleString("en-GB")}
                </p>
              )}
            </div>

            {/* Internal comments — admin-to-admin only, never printed or
                shown to the customer. */}
            <div className="no-print animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
              <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <MessageSquare size={17} className="text-brand-600" />
                অভ্যন্তরীণ কমেন্ট
              </h3>
              <div className="mb-3 max-h-56 space-y-2.5 overflow-y-auto">
                {comments.length === 0 && (
                  <p className="text-xs text-slate-400">কোনো কমেন্ট নেই</p>
                )}
                {comments.map((c) => {
                  const commentAdmin = getAdminById(c.adminId);
                  return (
                    <div key={c.id} className="flex gap-2">
                      {commentAdmin?.avatar && (
                        <img
                          src={commentAdmin.avatar}
                          alt={commentAdmin.name}
                          className="h-6 w-6 flex-shrink-0 rounded-full ring-1 ring-mist-200"
                        />
                      )}
                      <div className="min-w-0 flex-1 rounded-xl bg-mist-50 px-3 py-2">
                        <p className="text-xs font-semibold text-ink-900">
                          {commentAdmin?.name || c.adminId}
                        </p>
                        <p className="text-sm text-slate-600">{c.text}</p>
                        <p className="mt-0.5 text-[10px] text-slate-300">
                          {new Date(c.at).toLocaleString("en-GB")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="একটা নোট লিখুন..."
                  className="flex-1 rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  onClick={handleAddComment}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>

            {/* Return / Refund — only relevant once an order has actually
                gone bad (cancelled, or courier reports a return/partial
                delivery), so it stays out of the way otherwise. */}
            {(order.status === "cancelled" ||
              ["returned", "partial_delivered", "hold"].includes(order.courierStatus)) && (
              <div className="no-print animate-in rounded-2xl border border-rose-200 bg-rose-50/40 p-6 shadow-card">
                <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-rose-700">
                  <RotateCcw size={17} />
                  রিটার্ন / রিফান্ড
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      রিটার্নের কারণ
                    </label>
                    <textarea
                      value={returnForm.returnReason}
                      onChange={(e) =>
                        setReturnForm((f) => ({ ...f, returnReason: e.target.value }))
                      }
                      rows={2}
                      className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        রিফান্ড পরিমাণ
                      </label>
                      <input
                        type="number"
                        value={returnForm.refundAmount}
                        onChange={(e) =>
                          setReturnForm((f) => ({ ...f, refundAmount: e.target.value }))
                        }
                        className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        রিফান্ড স্ট্যাটাস
                      </label>
                      <select
                        value={returnForm.refundStatus}
                        onChange={(e) =>
                          setReturnForm((f) => ({ ...f, refundStatus: e.target.value }))
                        }
                        className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveReturn}
                    disabled={savingReturn}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {savingReturn ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    সেভ করুন
                  </button>
                </div>
              </div>
            )}

            {/* Steadfast courier + live tracking */}
            <div className="no-print animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                  <Truck size={17} className="text-brand-600" />
                  কুরিয়ার (Steadfast)
                </h3>
                {order.consignmentId && (
                  <button
                    onClick={() => setLiveTracking((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      liveTracking
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-mist-100 text-slate-400"
                    }`}
                    title="লাইভ আপডেট চালু/বন্ধ করুন"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        liveTracking ? "animate-pulse bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    {liveTracking ? "লাইভ" : "বন্ধ"}
                  </button>
                )}
              </div>

              {!order.consignmentId ? (
                <div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {COURIERS.map((c) => (
                      <span
                        key={c.id}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          c.id === DEFAULT_COURIER
                            ? "bg-ink-900 text-white"
                            : "bg-mist-100 text-slate-400"
                        }`}
                        title={c.active ? "" : "শীঘ্রই আসছে"}
                      >
                        {c.label}
                        {!c.active && " (শীঘ্রই)"}
                      </span>
                    ))}
                  </div>
                  <p className="mb-3 text-sm text-slate-500">
                    এখনো কোনো Steadfast parcel তৈরি হয়নি।
                  </p>
                  {admin?.canManageCourier ? (
                    <button
                      onClick={() => handleCreateParcel(false)}
                      disabled={creatingParcel}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-900/90 disabled:opacity-60"
                    >
                      {creatingParcel ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <PackageCheck size={15} />
                      )}
                      Steadfast Parcel তৈরি করুন
                    </button>
                  ) : (
                    <p className="rounded-lg bg-mist-50 px-3 py-2 text-xs font-medium text-slate-400">
                      শুধুমাত্র কুরিয়ার ম্যানেজার পারমিশনপ্রাপ্ত admin parcel তৈরি
                      করতে পারবেন।
                    </p>
                  )}
                  {parcelError && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                      <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                      {parcelError}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    {order.courierStatus === "delivered" ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : order.courierStatus === "cancelled" ||
                      order.courierStatus === "failed" ? (
                      <AlertTriangle size={16} className="text-rose-600" />
                    ) : (
                      <Truck size={16} className="text-sky-600" />
                    )}
                    <span className="text-sm font-bold capitalize text-ink-900">
                      {order.courierStatus || "created"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500">
                    <p>
                      Consignment ID:{" "}
                      <span className="font-semibold text-ink-900">
                        {order.consignmentId}
                      </span>
                    </p>
                    {order.trackingCode && (
                      <p>
                        Tracking Code:{" "}
                        <span className="font-semibold text-ink-900">
                          {order.trackingCode}
                        </span>
                      </p>
                    )}
                    {order.parcelCreatedAt && (
                      <p>
                        তৈরি হয়েছে:{" "}
                        {new Date(order.parcelCreatedAt).toLocaleString("en-GB")}
                      </p>
                    )}
                    {lastChecked && (
                      <p className="text-slate-300">
                        সর্বশেষ চেক করা হয়েছে:{" "}
                        {lastChecked.toLocaleTimeString("en-GB")}
                      </p>
                    )}
                  </div>

                  {order.courierHistory?.length > 0 && (
                    <div className="mt-4 space-y-2.5 border-t border-mist-100 pt-3">
                      {[...order.courierHistory]
                        .reverse()
                        .slice(0, 6)
                        .map((ev, i) => (
                          <div key={i} className="flex gap-2 text-xs">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                            <div>
                              <p className="font-semibold capitalize text-ink-900">
                                {ev.status}
                              </p>
                              {ev.note && (
                                <p className="text-slate-400">{ev.note}</p>
                              )}
                              <p className="text-slate-300">
                                {new Date(ev.at).toLocaleString("en-GB")}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={`https://steadfast.com.bd/user/consignment/${order.consignmentId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100"
                    >
                      <ExternalLink size={12} /> ট্র্যাক করুন
                    </a>
                    {admin?.canManageCourier &&
                      (order.courierStatus === "failed" ? (
                        <button
                          onClick={() => handleCreateParcel(false)}
                          disabled={creatingParcel}
                          className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                          <RefreshCw size={12} /> আবার চেষ্টা করুন
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "নতুন করে parcel তৈরি করতে চান? এটি পুরনো consignment প্রতিস্থাপন করবে।"
                              )
                            )
                              handleCreateParcel(true);
                          }}
                          disabled={creatingParcel}
                          className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100 disabled:opacity-60"
                        >
                          <RefreshCw size={12} /> রি-ক্রিয়েট
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handlePrintLabel}
              disabled={printing}
              className="no-print flex w-full items-center justify-center gap-2 rounded-xl border border-mist-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-mist-100 disabled:opacity-60"
            >
              {printing ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Printer size={15} />
              )}
              শিপিং লেবেল প্রিন্ট করুন
            </button>

            {order.status !== "confirmed" &&
              order.status !== "delivered" &&
              order.status !== "cancelled" && (
                <button
                  onClick={handleConfirmOrder}
                  disabled={confirming || saving}
                  className="no-print flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {confirming ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Confirm Order — সব সেভ করে কনফার্ম করুন
                </button>
              )}

            <button
              onClick={handleDelete}
              className="no-print flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              <Trash2 size={15} /> অর্ডার ডিলিট করুন
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default OrderDetails;
