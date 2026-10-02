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
  FileText,
  CircleAlert,
} from "lucide-react";

import AdminLayout from "../layouts/AdminLayout.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import AssignedBadge from "../components/AssignedBadge.jsx";
import SourceBadge from "../components/SourceBadge.jsx";

import { getTenantById } from "../config/tenants.js";
import { getAdminById, hasPermission } from "../config/admins.js";

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

import { useAuth } from "../context/AuthContext.jsx";

import { runPrintQueue } from "../utils/printQueue.js";
import { printInvoice, getInvoiceNumber } from "../utils/invoice.js";
import { getLabelSettings } from "../config/settings.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const currency = (n) =>
  `৳${Number(n || 0).toLocaleString("en-BD")}`;

/*
|--------------------------------------------------------------------------
| STATUS OPTIONS
|--------------------------------------------------------------------------
|
| "confirmed" আলাদাভাবে confirmOrder() দিয়ে update হবে।
| কারণ backend confirmation-এর সময় stock deduction করে।
|
*/

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
  "duplicate",
];

/*
|--------------------------------------------------------------------------
| EMPTY FORM
|--------------------------------------------------------------------------
|
| IMPORTANT:
| district / thana আর নেই।
| Customer শুধু full address দেবে।
|
*/

const emptyForm = {
  name: "",
  phone: "",
  address: "",
  note: "",
  deliveryCharge: 0,
  items: [],
};

/*
|--------------------------------------------------------------------------
| NORMALIZE API RESPONSE
|--------------------------------------------------------------------------
*/

const normalizeOrder = (response) => {
  if (!response) return null;

  let data = response;

  // Axios response
  if (
    data?.data !== undefined &&
    data?.config
  ) {
    data = data.data;
  }

  // { data: {...} }
  if (
    data?.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data)
  ) {
    data = data.data;
  }

  // { order: {...} }
  if (
    data?.order &&
    typeof data.order === "object" &&
    !Array.isArray(data.order)
  ) {
    data = data.order;
  }

  // { result: {...} }
  if (
    data?.result &&
    typeof data.result === "object" &&
    !Array.isArray(data.result)
  ) {
    data = data.result;
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| ERROR MESSAGE HELPER
|--------------------------------------------------------------------------
*/

const getApiErrorMessage = (
  error,
  fallback,
) => {
  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.error ||
    error?.message ||
    fallback
  );
};

/*
|--------------------------------------------------------------------------
| SAFE ORDER FIELDS
|--------------------------------------------------------------------------
*/

const getOrderName = (data) => {
  return (
    data?.name ||
    data?.customerName ||
    data?.customer?.name ||
    ""
  );
};

const getOrderPhone = (data) => {
  return (
    data?.phone ||
    data?.customerPhone ||
    data?.customer?.phone ||
    ""
  );
};

const getOrderAddress = (data) => {
  return (
    data?.address ||
    data?.customerAddress ||
    data?.customer?.address ||
    ""
  );
};

const getOrderNote = (data) => {
  return (
    data?.note ||
    data?.orderNote ||
    data?.customerNote ||
    ""
  );
};

const getOrderItems = (data) => {
  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.orderItems)) {
    return data.orderItems;
  }

  return [];
};

const getOrderDeliveryCharge = (data) => {
  return Number(
    data?.deliveryCharge ??
      data?.delivery_fee ??
      data?.deliveryFee ??
      0,
  );
};

const getOrderSubtotal = (data) => {
  if (
    data?.subtotal !== undefined &&
    data?.subtotal !== null
  ) {
    return Number(data.subtotal) || 0;
  }

  return getOrderItems(data).reduce(
    (sum, item) =>
      sum +
      (Number(item?.price) || 0) *
        (Number(item?.quantity) || 0),
    0,
  );
};

const getOrderTotal = (data) => {
  if (
    data?.total !== undefined &&
    data?.total !== null
  ) {
    return Number(data.total) || 0;
  }

  return (
    getOrderSubtotal(data) +
    getOrderDeliveryCharge(data)
  );
};

/*
|--------------------------------------------------------------------------
| CREATE FORM FROM ORDER
|--------------------------------------------------------------------------
*/

const makeFormFromOrder = (data) => {
  const order = normalizeOrder(data);

  if (!order) {
    return {
      ...emptyForm,
      items: [],
    };
  }

  return {
    name: getOrderName(order),
    phone: getOrderPhone(order),
    address: getOrderAddress(order),
    note: getOrderNote(order),
    deliveryCharge:
      getOrderDeliveryCharge(order),

    items: getOrderItems(order).map(
      (item) => ({
        ...item,
        quantity:
          Number(item?.quantity) || 1,
        price:
          Number(item?.price) || 0,
      }),
    ),
  };
};

/*
|--------------------------------------------------------------------------
| PREMIUM ALERT MODAL
|--------------------------------------------------------------------------
*/

const PremiumAlertModal = ({
  open,
  title,
  message,
  type = "error",
  onClose,
}) => {
  if (!open) return null;

  const isSuccess =
    type === "success";

  const isWarning =
    type === "warning";

  const iconBox = isSuccess
    ? "bg-emerald-50 text-emerald-600"
    : isWarning
      ? "bg-amber-50 text-amber-600"
      : "bg-rose-50 text-rose-600";

  const buttonClass = isSuccess
    ? "bg-emerald-600 hover:bg-emerald-700"
    : isWarning
      ? "bg-amber-500 hover:bg-amber-600"
      : "bg-slate-900 hover:bg-slate-800";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[4px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) =>
          e.stopPropagation()
        }
        className="w-full max-w-[390px] overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.22)] animate-in zoom-in-95 slide-in-from-bottom-3 duration-200"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${iconBox}`}
            >
              {isSuccess ? (
                <CheckCircle2
                  size={21}
                  strokeWidth={2}
                />
              ) : isWarning ? (
                <AlertTriangle
                  size={21}
                  strokeWidth={2}
                />
              ) : (
                <CircleAlert
                  size={21}
                  strokeWidth={2}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-bold tracking-tight text-slate-900">
                {title}
              </h3>

              <p className="mt-1.5 text-[13px] leading-5 text-slate-500">
                {message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 active:scale-[0.98] ${buttonClass}`}
          >
            ঠিক আছে
          </button>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| PREMIUM CONFIRM MODAL
|--------------------------------------------------------------------------
*/

const PremiumConfirmModal = ({
  open,
  title,
  message,
  confirmText = "নিশ্চিত করুন",
  cancelText = "বাতিল",
  type = "danger",
  busy = false,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  const isWarning =
    type === "warning";

  const isSuccess =
    type === "success";

  const iconBox = isWarning
    ? "bg-amber-50 text-amber-600"
    : isSuccess
      ? "bg-emerald-50 text-emerald-600"
      : "bg-rose-50 text-rose-600";

  const confirmButton = isWarning
    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
    : isSuccess
      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[4px] animate-in fade-in duration-200"
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) =>
          e.stopPropagation()
        }
        className="w-full max-w-[390px] overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.22)] animate-in zoom-in-95 slide-in-from-bottom-3 duration-200"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${iconBox}`}
            >
              {isWarning ? (
                <AlertTriangle
                  size={21}
                />
              ) : isSuccess ? (
                <CheckCircle2
                  size={21}
                />
              ) : (
                <CircleAlert
                  size={21}
                />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-[17px] font-bold tracking-tight text-slate-900">
                {title}
              </h3>

              <p className="mt-1.5 text-[13px] leading-5 text-slate-500">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-slate-100 bg-slate-50/70 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${confirmButton}`}
          >
            {busy ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />
                প্রসেস হচ্ছে...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| ORDER DETAILS
|--------------------------------------------------------------------------
*/

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { admin } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS
  |--------------------------------------------------------------------------
  */

  const canDelete = hasPermission(
    admin,
    "deleteOrders",
  );

  const canApproveReturns =
    hasPermission(
      admin,
      "approveReturns",
    );

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [order, setOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [err, setErr] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [assignment, setAssignment] =
    useState(null);

  const [lastEdit, setLastEdit] =
    useState(null);

  const [editing, setEditing] =
    useState(false);

  const [form, setForm] =
    useState(emptyForm);

  const [confirming, setConfirming] =
    useState(false);

  const [creatingParcel, setCreatingParcel] =
    useState(false);

  const [parcelError, setParcelError] =
    useState("");

  const [printing, setPrinting] =
    useState(false);

  const [liveTracking, setLiveTracking] =
    useState(true);

  const [lastChecked, setLastChecked] =
    useState(null);

  const [comments, setComments] =
    useState([]);

  const [commentText, setCommentText] =
    useState("");

  const [returnForm, setReturnForm] =
    useState({
      returnReason: "",
      refundAmount: "",
      refundStatus: "pending",
    });

  const [savingReturn, setSavingReturn] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | DELETE MODAL
  |--------------------------------------------------------------------------
  */

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | UNIVERSAL CONFIRM MODAL
  |--------------------------------------------------------------------------
  */

  const [showConfirmModal, setShowConfirmModal] =
    useState(false);

  const [confirmModal, setConfirmModal] =
    useState({
      title: "",
      message: "",
      confirmText: "নিশ্চিত করুন",
      cancelText: "বাতিল",
      type: "danger",
      onConfirm: null,
    });

  /*
  |--------------------------------------------------------------------------
  | UNIVERSAL ALERT MODAL
  |--------------------------------------------------------------------------
  */

  const [showAlertModal, setShowAlertModal] =
    useState(false);

  const [alertModal, setAlertModal] =
    useState({
      title: "",
      message: "",
      type: "error",
    });

  /*
  |--------------------------------------------------------------------------
  | MODAL HELPERS
  |--------------------------------------------------------------------------
  */

  const openAlert = ({
    title = "সমস্যা হয়েছে",
    message = "",
    type = "error",
  }) => {
    setAlertModal({
      title,
      message,
      type,
    });

    setShowAlertModal(true);
  };

  const closeAlert = () => {
    setShowAlertModal(false);
  };

  const openConfirm = ({
    title,
    message,
    confirmText = "নিশ্চিত করুন",
    cancelText = "বাতিল",
    type = "danger",
    onConfirm,
  }) => {
    setConfirmModal({
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm,
    });

    setShowConfirmModal(true);
  };

  const closeConfirm = () => {
    setShowConfirmModal(false);

    setConfirmModal({
      title: "",
      message: "",
      confirmText: "নিশ্চিত করুন",
      cancelText: "বাতিল",
      type: "danger",
      onConfirm: null,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | ESC KEY
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (deleting) {
        return;
      }

      if (showDeleteModal) {
        setShowDeleteModal(false);
      }

      if (showConfirmModal) {
        closeConfirm();
      }

      if (showAlertModal) {
        closeAlert();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    deleting,
    showDeleteModal,
    showConfirmModal,
    showAlertModal,
  ]);

  /*
  |--------------------------------------------------------------------------
  | LOAD ORDER
  |--------------------------------------------------------------------------
  */

  const load = async () => {
    if (!id) {
      setErr(
        "Order ID পাওয়া যায়নি।",
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const response =
        await getOrder(id);

      const data =
        normalizeOrder(response);

      if (
        !data ||
        typeof data !== "object"
      ) {
        throw new Error(
          "Invalid order response",
        );
      }

      if (
        !data._id &&
        !data.id &&
        !data.name &&
        !data.phone &&
        !data.customerName
      ) {
        throw new Error(
          "Order data পাওয়া যায়নি",
        );
      }

      setOrder(data);

      setForm(
        makeFormFromOrder(data),
      );

      setReturnForm({
        returnReason:
          data.returnReason || "",
        refundAmount:
          data.refundAmount ?? "",
        refundStatus:
          data.refundStatus ||
          "pending",
      });

      setAssignment(
        getAssignment(id),
      );

      setLastEdit(
        getLastEdit(id),
      );

      setComments(
        getComments(id),
      );
    } catch (error) {
      console.error(
        "Load order error:",
        error,
      );

      setOrder(null);

      setErr(
        getApiErrorMessage(
          error,
          "অর্ডারটি খুঁজে পাওয়া যায়নি।",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | LIVE COURIER TRACKING
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !liveTracking ||
      !order?.consignmentId
    ) {
      return;
    }

    const tick = async () => {
      try {
        const response =
          await getOrder(id);

        const fresh =
          normalizeOrder(response);

        if (!fresh) return;

        setOrder((prev) =>
          prev
            ? {
                ...prev,
                courierStatus:
                  fresh.courierStatus,
                trackingCode:
                  fresh.trackingCode,
                consignmentId:
                  fresh.consignmentId,
                courierHistory:
                  fresh.courierHistory,
                parcelCreatedAt:
                  fresh.parcelCreatedAt,
                status:
                  fresh.status ||
                  prev.status,
              }
            : fresh,
        );

        setLastChecked(
          new Date(),
        );
      } catch (error) {
        console.warn(
          "Live tracking update failed:",
          error,
        );
      }
    };

    const interval = setInterval(
      tick,
      20000,
    );

    return () =>
      clearInterval(interval);
  }, [
    id,
    liveTracking,
    order?.consignmentId,
  ]);

  /*
  |--------------------------------------------------------------------------
  | ASSIGNMENT
  |--------------------------------------------------------------------------
  */

  const isAssignedToMe =
    admin &&
    assignment?.adminId ===
      admin.id;

  const isAssignedToOther =
    assignment &&
    !isAssignedToMe;

  const canEdit =
    isAssignedToMe;

  const handleAssignToMe =
    () => {
      if (!admin) {
        openAlert({
          title:
            "Admin তথ্য পাওয়া যায়নি",
          message:
            "বর্তমান admin information পাওয়া যায়নি। আবার login করে চেষ্টা করুন।",
          type: "error",
        });

        return;
      }

      const a = assignOrder(
        id,
        admin.id,
      );

      setAssignment(a);

      openAlert({
        title:
          "অর্ডার অ্যাসাইন হয়েছে",
        message:
          "অর্ডারটি সফলভাবে আপনার কাছে অ্যাসাইন করা হয়েছে। এখন আপনি এটি edit করতে পারবেন।",
        type: "success",
      });
    };

  const handleUnassign =
    () => {
      openConfirm({
        title:
          "অ্যাসাইনমেন্ট সরাবেন?",
        message:
          "এই অর্ডার থেকে আপনার অ্যাসাইনমেন্ট সরিয়ে দেওয়া হবে। এরপর অর্ডারটি আবার edit করতে assignment প্রয়োজন হবে।",
        confirmText:
          "আনঅ্যাসাইন করুন",
        cancelText:
          "বাতিল",
        type: "warning",

        onConfirm: () => {
          unassignOrder(
            id,
            admin?.id,
          );

          setAssignment(null);
          setEditing(false);

          closeConfirm();

          openAlert({
            title:
              "আনঅ্যাসাইন সম্পন্ন",
            message:
              "অর্ডারটি আপনার assignment থেকে সরিয়ে দেওয়া হয়েছে।",
            type: "success",
          });
        },
      });
    };

  /*
  |--------------------------------------------------------------------------
  | STATUS CHANGE
  |--------------------------------------------------------------------------
  |
  | confirmed হলে:
  | POST /orders/:id/confirm
  |
  | অন্য status হলে:
  | PUT /orders/:id
  |
  | এতে stock double decrement হবে না।
  |
  */

  const handleStatusChange = async (status) => {
  if (!status) return;

  if (order?.status === status) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | CONFIRMED
  |--------------------------------------------------------------------------
  |
  | Confirmed status-এর জন্য confirmOrder() ব্যবহার হবে।
  | কারণ backend এই route-এর মাধ্যমে stock decrease করে।
  |
  */

  if (status === "confirmed") {
    if (
      order?.status === "confirmed"
    ) {
      return;
    }

    openConfirm({
      title: "অর্ডার কনফার্ম করবেন?",
      message:
        "অর্ডারটি কনফার্ম হলে backend stock update করবে। Stock availability ঠিক আছে কিনা নিশ্চিত হয়ে তারপর কনফার্ম করুন।",
      confirmText: "কনফার্ম করুন",
      cancelText: "বাতিল",
      type: "success",

      onConfirm: async () => {
        closeConfirm();

        if (confirming) return;

        setConfirming(true);

        try {
          /*
          |--------------------------------------------------------------------------
          | EDITING থাকলে আগে edited information save হবে
          |--------------------------------------------------------------------------
          */

          if (editing) {
            const payload = {
              name: form.name,
              phone: form.phone,
              address: form.address,
              note: form.note,
              deliveryCharge:
                Number(
                  form.deliveryCharge
                ) || 0,
              items: form.items,
              subtotal: itemsSubtotal,
              total: formTotal,
            };

            const saveResponse =
              await updateOrder(id, payload);

            const savedOrder =
              normalizeOrder(saveResponse);

            if (savedOrder) {
              setOrder(savedOrder);
            }

            setEditing(false);
          }

          /*
          |--------------------------------------------------------------------------
          | CONFIRM
          |--------------------------------------------------------------------------
          |
          | এখানে Steadfast call হবে না।
          | শুধু backend stock validate + decrease + confirmed করবে।
          |
          */

          const response =
            await confirmOrder(id);

          const updated =
            normalizeOrder(response);

          if (!updated) {
            throw new Error(
              "Invalid confirm response"
            );
          }

          setOrder(updated);

          setForm(
            makeFormFromOrder(updated)
          );

          if (admin) {
            setLastEdit(
              recordEdit(
                id,
                admin.id,
                "confirmed order"
              )
            );
          }

          openAlert({
            title: "Order Confirmed",
            message:
              "অর্ডারটি সফলভাবে কনফার্ম হয়েছে এবং backend থেকে stock update হয়েছে।",
            type: "success",
          });
        } catch (error) {
          console.error(
            "Confirm order error:",
            error
          );

          /*
          |--------------------------------------------------------------------------
          | যদি save করার পরে confirm fail করে,
          | server-এর latest order আবার load করি।
          |--------------------------------------------------------------------------
          */

          try {
            const freshResponse =
              await getOrder(id);

            const freshOrder =
              normalizeOrder(freshResponse);

            if (freshOrder) {
              setOrder(freshOrder);

              setForm(
                makeFormFromOrder(
                  freshOrder
                )
              );
            }
          } catch (refreshError) {
            console.warn(
              "Refresh after confirm error:",
              refreshError
            );
          }

          openAlert({
            title:
              "Order confirm করা যায়নি",
            message:
              getApiErrorMessage(
                error,
                "অর্ডার কনফার্ম করা যায়নি। Stock availability এবং order তথ্য আবার check করুন।"
              ),
            type: "error",
          });
        } finally {
          setConfirming(false);
        }
      },
    });

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | OTHER STATUSES
  |--------------------------------------------------------------------------
  |
  | pending
  | processing
  | shipped
  | delivered
  | returned
  | cancelled
  | duplicate
  |
  | এগুলো normal PUT /orders/:id দিয়ে update হবে।
  |
  */

  if (saving || confirming) {
    return;
  }

  setSaving(true);

  try {
    const response =
      await updateOrderStatus(
        id,
        status
      );

    const updated =
      normalizeOrder(response);

    if (!updated) {
      throw new Error(
        "Invalid updated order response"
      );
    }

    setOrder(updated);

    setForm(
      makeFormFromOrder(updated)
    );

    if (admin) {
      setLastEdit(
        recordEdit(
          id,
          admin.id,
          `status → ${status}`
        )
      );
    }

    openAlert({
      title: "Status updated",
      message: `অর্ডারের status "${status}" করা হয়েছে।`,
      type: "success",
    });
  } catch (error) {
    console.error(
      "Status update error:",
      error
    );

    openAlert({
      title:
        "Status update ব্যর্থ",
      message:
        getApiErrorMessage(
          error,
          "স্ট্যাটাস আপডেট করা যায়নি। আবার চেষ্টা করুন।"
        ),
      type: "error",
    });
  } finally {
    setSaving(false);
  }
};

  /*
  |--------------------------------------------------------------------------
  | DELETE ORDER
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async () => {
      if (!canDelete) {
        setShowDeleteModal(false);

        openAlert({
          title:
            "Permission নেই",
          message:
            "আপনার অর্ডার ডিলিট করার permission নেই।",
          type: "warning",
        });

        return;
      }

      if (deleting) return;

      setDeleting(true);

      try {
        await deleteOrder(id);

        if (admin) {
          recordEdit(
            id,
            admin.id,
            "deleted order",
          );
        }

        unassignOrder(id);

        setShowDeleteModal(false);

        navigate("/orders");
      } catch (error) {
        console.error(
          "Delete order error:",
          error,
        );

        setShowDeleteModal(false);

        openAlert({
          title:
            "অর্ডার ডিলিট করা যায়নি",
          message:
            getApiErrorMessage(
              error,
              "অর্ডার মুছে ফেলা যায়নি।",
            ),
          type: "error",
        });
      } finally {
        setDeleting(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | COMMENTS
  |--------------------------------------------------------------------------
  */

  const handleAddComment =
    () => {
      if (
        !commentText.trim() ||
        !admin
      ) {
        return;
      }

      addComment(
        id,
        admin.id,
        commentText.trim(),
      );

      setComments(
        getComments(id),
      );

      setCommentText("");
    };

  /*
  |--------------------------------------------------------------------------
  | RETURN / REFUND
  |--------------------------------------------------------------------------
  */

  const handleSaveReturn =
    async () => {
      setSavingReturn(true);

      try {
        const response =
          await updateOrder(
            id,
            {
              returnReason:
                returnForm.returnReason,

              refundAmount:
                Number(
                  returnForm.refundAmount,
                ) || 0,

              refundStatus:
                returnForm.refundStatus,
            },
          );

        const updated =
          normalizeOrder(response);

        if (!updated) {
          throw new Error(
            "Invalid response",
          );
        }

        setOrder(updated);

        setForm(
          makeFormFromOrder(
            updated,
          ),
        );

        setReturnForm({
          returnReason:
            updated.returnReason ||
            "",
          refundAmount:
            updated.refundAmount ??
            "",
          refundStatus:
            updated.refundStatus ||
            "pending",
        });

        if (admin) {
          setLastEdit(
            recordEdit(
              id,
              admin.id,
              "updated return/refund",
              returnForm.refundStatus,
            ),
          );
        }

        openAlert({
          title:
            "তথ্য সেভ হয়েছে",
          message:
            "রিটার্ন/রিফান্ড তথ্য সফলভাবে আপডেট হয়েছে।",
          type: "success",
        });
      } catch (error) {
        console.error(
          "Return save error:",
          error,
        );

        openAlert({
          title:
            "তথ্য সেভ করা যায়নি",
          message:
            getApiErrorMessage(
              error,
              "রিটার্ন/রিফান্ড তথ্য সেভ করা যায়নি।",
            ),
          type: "error",
        });
      } finally {
        setSavingReturn(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | ITEMS
  |--------------------------------------------------------------------------
  */

  const itemsSubtotal =
    Array.isArray(form.items)
      ? form.items.reduce(
          (sum, item) =>
            sum +
            (Number(item?.price) ||
              0) *
              (Number(
                item?.quantity,
              ) || 0),
          0,
        )
      : 0;

  const formTotal =
    itemsSubtotal +
    (Number(
      form.deliveryCharge,
    ) || 0);

  const updateItemField = (
    idx,
    field,
    value,
  ) => {
    setForm((current) => {
      const items = [
        ...current.items,
      ];

      items[idx] = {
        ...items[idx],
        [field]: value,
      };

      return {
        ...current,
        items,
      };
    });
  };

  const removeItem = (idx) => {
    setForm((current) => ({
      ...current,

      items:
        current.items.filter(
          (_, i) => i !== idx,
        ),
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | CONFIRM ORDER BUTTON
  |--------------------------------------------------------------------------
  |
  | Editing অবস্থায় save করে তারপর confirm।
  | District/thana আর payload-এ যাবে না।
  |
  */

  const handleConfirmOrder =
    async () => {
      if (confirming) return;

      setConfirming(true);

      try {
        /*
        |--------------------------------------------------------------------------
        | SAVE EDITED DATA FIRST
        |--------------------------------------------------------------------------
        */

        if (editing) {
          const payload = {
            name: form.name,
            phone: form.phone,
            address: form.address,
            note: form.note,
            deliveryCharge:
              Number(
                form.deliveryCharge,
              ) || 0,
            items: form.items,
            subtotal:
              itemsSubtotal,
            total: formTotal,
          };

          const saveResponse =
            await updateOrder(
              id,
              payload,
            );

          const savedOrder =
            normalizeOrder(
              saveResponse,
            );

          if (savedOrder) {
            setOrder(
              savedOrder,
            );
          }

          setEditing(false);
        }

        /*
        |--------------------------------------------------------------------------
        | BACKEND CONFIRM
        |--------------------------------------------------------------------------
        |
        | Stock deduction ONLY backend-এ হবে।
        |
        */

        const response =
          await confirmOrder(id);

        const updated =
          normalizeOrder(response);

        if (!updated) {
          throw new Error(
            "Invalid confirm response",
          );
        }

        setOrder(updated);

        setForm(
          makeFormFromOrder(
            updated,
          ),
        );

        if (admin) {
          setLastEdit(
            recordEdit(
              id,
              admin.id,
              "confirmed order",
            ),
          );
        }

        openAlert({
          title:
            "Order Confirmed",
          message:
            "অর্ডারটি সফলভাবে কনফার্ম হয়েছে এবং stock backend থেকে update হয়েছে।",
          type: "success",
        });
      } catch (error) {
        console.error(
          "Confirm order error:",
          error,
        );

        openAlert({
          title:
            "Order confirm করা যায়নি",
          message:
            getApiErrorMessage(
              error,
              "অর্ডার কনফার্ম করা যায়নি। Stock availability এবং order তথ্য আবার check করুন।",
            ),
          type: "error",
        });
      } finally {
        setConfirming(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CREATE STEADFAST PARCEL
  |--------------------------------------------------------------------------
  */

  const handleCreateParcel =
    async (force = false) => {
      if (creatingParcel) return;

      setParcelError("");

      /*
      |--------------------------------------------------------------------------
      | SAFETY CHECK
      |--------------------------------------------------------------------------
      |
      | Backend create-parcel confirmed order চায়।
      |
      */

      if (
        order?.status !==
          "confirmed" &&
        !force
      ) {
        const message =
          "Steadfast parcel তৈরি করার আগে order-টি Confirmed হতে হবে।";

        setParcelError(message);

        openAlert({
          title:
            "Parcel তৈরি করা যাবে না",
          message,
          type: "warning",
        });

        return;
      }

      setCreatingParcel(true);

      try {
        const response =
          await createSteadfastParcel(
            id,
            {
              force,
            },
          );

        const updated =
          normalizeOrder(response);

        if (!updated) {
          throw new Error(
            "Invalid parcel response",
          );
        }

        setOrder(updated);

        setForm(
          makeFormFromOrder(
            updated,
          ),
        );

        if (admin) {
          setLastEdit(
            recordEdit(
              id,
              admin.id,
              force
                ? "re-created Steadfast parcel"
                : "created Steadfast parcel",
            ),
          );
        }

        const settings =
          getLabelSettings();

        if (settings.autoPrint) {
          await runPrintQueue(
            [updated],
            settings,
            {
              markServerStatus: true,
            },
          );
        }

        openAlert({
          title:
            "Parcel তৈরি হয়েছে",
          message:
            "Steadfast parcel সফলভাবে তৈরি হয়েছে।",
          type: "success",
        });
      } catch (error) {
        console.error(
          "Create parcel error:",
          error,
        );

        const message =
          getApiErrorMessage(
            error,
            "Steadfast parcel তৈরি করা যায়নি।",
          );

        setParcelError(message);

        openAlert({
          title:
            "Parcel তৈরি করা যায়নি",
          message,
          type: "error",
        });
      } finally {
        setCreatingParcel(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | PRINT LABEL
  |--------------------------------------------------------------------------
  */

  const handlePrintLabel =
    async () => {
      if (!order) return;

      setPrinting(true);

      try {
        await runPrintQueue(
          [order],
          getLabelSettings(),
          {
            markServerStatus: true,
          },
        );
      } catch (error) {
        console.error(
          "Print label error:",
          error,
        );

        openAlert({
          title:
            "Print করা যায়নি",
          message:
            "শিপিং লেবেল প্রিন্ট করা যায়নি। Printer এবং print settings check করুন।",
          type: "error",
        });
      } finally {
        setPrinting(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | PRINT INVOICE
  |--------------------------------------------------------------------------
  */

  const handlePrintInvoice =
    () => {
      if (!order) return;

      const settings =
        getLabelSettings();

      const tenant =
        order.tenantId
          ? getTenantById(
              order.tenantId,
            )
          : null;

      printInvoice(order, {
        brandName:
          tenant?.name ||
          settings.brandName,

        brandLogoUrl:
          tenant?.logo ||
          settings.brandLogoUrl,

        tenantName:
          tenant?.name || "",
      });

      if (admin) {
        recordEdit(
          id,
          admin.id,
          "printed invoice",
          getInvoiceNumber(
            order,
          ),
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SAVE EDIT
  |--------------------------------------------------------------------------
  */

  const handleSaveEdit =
    async () => {
      if (saving) return;

      setSaving(true);

      try {
        const payload = {
          name: form.name,
          phone: form.phone,
          address: form.address,
          note: form.note,
          deliveryCharge:
            Number(
              form.deliveryCharge,
            ) || 0,
          items: form.items,
          subtotal:
            itemsSubtotal,
          total: formTotal,
        };

        const response =
          await updateOrder(
            id,
            payload,
          );

        const updated =
          normalizeOrder(response);

        if (!updated) {
          throw new Error(
            "Invalid update response",
          );
        }

        setOrder(updated);

        setForm(
          makeFormFromOrder(
            updated,
          ),
        );

        setEditing(false);

        if (admin) {
          setLastEdit(
            recordEdit(
              id,
              admin.id,
              "edited order details",
            ),
          );
        }

        openAlert({
          title:
            "Order updated",
          message:
            "অর্ডারের তথ্য সফলভাবে আপডেট হয়েছে।",
          type: "success",
        });
      } catch (error) {
        console.error(
          "Save edit error:",
          error,
        );

        openAlert({
          title:
            "Order update করা যায়নি",
          message:
            getApiErrorMessage(
              error,
              "অর্ডার আপডেট করা যায়নি।",
            ),
          type: "error",
        });
      } finally {
        setSaving(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CANCEL EDIT
  |--------------------------------------------------------------------------
  */

  const cancelEdit = () => {
    if (!order) return;

    setForm(
      makeFormFromOrder(
        order,
      ),
    );

    setEditing(false);
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <AdminLayout
        title="Order Details"
        subtitle={`Order ID: ${
          id || ""
        }`}
      >
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2
            className="animate-spin"
            size={26}
          />
        </div>
      </AdminLayout>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  if (err || !order) {
    return (
      <AdminLayout
        title="Order Details"
        subtitle={`Order ID: ${
          id || ""
        }`}
      >
        <div className="space-y-4">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink-900"
          >
            <ArrowLeft size={15} />
            সব অর্ডারে ফিরে যান
          </Link>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
            {err ||
              "অর্ডারটি পাওয়া যায়নি।"}
          </div>
        </div>
      </AdminLayout>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SAFE VALUES
  |--------------------------------------------------------------------------
  */

  const displayName =
    getOrderName(order);

  const displayPhone =
    getOrderPhone(order);

  const displayAddress =
    getOrderAddress(order);

  const displayNote =
    getOrderNote(order);

  const displayItems =
    getOrderItems(order);

  const displaySubtotal =
    getOrderSubtotal(order);

  const displayDelivery =
    getOrderDeliveryCharge(
      order,
    );

  const displayTotal =
    getOrderTotal(order);

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <AdminLayout
      title="Order Details"
      subtitle={`Order ID: ${
        order.orderId ||
        order._id ||
        id
      }`}
    >
      {/* HEADER */}

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-ink-900"
        >
          <ArrowLeft size={15} />
          সব অর্ডারে ফিরে যান
        </Link>
      </div>

      <div className="print-area grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* =========================================================
            LEFT SIDE
        ========================================================= */}

        <div className="space-y-5 lg:col-span-2">
          {/* ASSIGNMENT */}

          <div className="no-print animate-in flex flex-col gap-3 rounded-2xl border border-mist-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                এডিট অ্যাক্সেস
              </p>

              <AssignedBadge
                adminId={
                  assignment?.adminId
                }
                size="md"
              />
            </div>

            <div className="flex items-center gap-2">
              {!assignment && (
                <button
                  onClick={
                    handleAssignToMe
                  }
                  className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-brand-700 active:scale-[0.98]"
                >
                  <UserPlus
                    size={14}
                  />
                  নিজেকে অ্যাসাইন করুন
                </button>
              )}

              {isAssignedToMe && (
                <button
                  onClick={
                    handleUnassign
                  }
                  className="flex items-center gap-1.5 rounded-xl border border-mist-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-mist-100 active:scale-[0.98]"
                >
                  <UserMinus
                    size={14}
                  />
                  আনঅ্যাসাইন করুন
                </button>
              )}

              {isAssignedToOther && (
                <span className="flex items-center gap-1.5 rounded-xl bg-mist-100 px-3.5 py-2 text-xs font-medium text-slate-500">
                  <Lock size={13} />
                  এডিট লকড
                </span>
              )}
            </div>
          </div>

          {/* CUSTOMER INFORMATION */}

          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink-900">
                কাস্টমার তথ্য
              </h3>

              <div className="no-print flex items-center gap-2">
                <StatusBadge
                  status={
                    order.status ||
                    "pending"
                  }
                />

                {!editing ? (
                  <button
                    onClick={() =>
                      setEditing(true)
                    }
                    disabled={!canEdit}
                    title={
                      canEdit
                        ? "তথ্য এডিট করুন"
                        : "এডিট করতে হলে প্রথমে নিজেকে অ্যাসাইন করুন"
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-mist-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pencil
                      size={13}
                    />
                    এডিট
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={
                        handleSaveEdit
                      }
                      disabled={saving}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2
                          size={13}
                          className="animate-spin"
                        />
                      ) : (
                        <Save
                          size={13}
                        />
                      )}

                      সেভ
                    </button>

                    <button
                      onClick={
                        cancelEdit
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100"
                    >
                      <X size={13} />
                      বাতিল
                    </button>
                  </div>
                )}
              </div>
            </div>

            {(order.tenantId ||
              order.source) && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {order.tenantId && (
                  <span className="inline-flex items-center rounded-full bg-mist-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    {getTenantById(
                      order.tenantId,
                    )?.name ||
                      order.tenantId}
                  </span>
                )}

                <SourceBadge
                  source={
                    order.source
                  }
                />
              </div>
            )}

            {!editing ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* NAME */}

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    নাম
                  </p>

                  <p className="mt-1 text-sm font-semibold text-ink-900">
                    {displayName ||
                      "নাম পাওয়া যায়নি"}
                  </p>
                </div>

                {/* PHONE */}

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    ফোন
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                    <Phone
                      size={13}
                      className="text-slate-400"
                    />

                    {displayPhone ||
                      "ফোন নম্বর পাওয়া যায়নি"}
                  </p>

                  {displayPhone && (
                    <FraudCheckPanel
                      phone={
                        displayPhone
                      }
                    />
                  )}
                </div>

                {/* ADDRESS */}

                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    সম্পূর্ণ ঠিকানা
                  </p>

                  <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-900">
                    <MapPin
                      size={13}
                      className="mt-0.5 flex-shrink-0 text-slate-400"
                    />

                    <span className="whitespace-pre-wrap">
                      {displayAddress ||
                        "ঠিকানা নেই"}
                    </span>
                  </p>
                </div>

                {/* DELIVERY AREA */}

                {order.deliveryArea && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Delivery Area
                    </p>

                    <p className="mt-1 text-sm font-semibold capitalize text-ink-900">
                      {order.deliveryArea}
                    </p>
                  </div>
                )}

                {/* NOTE */}

                {displayNote && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      অর্ডার নোট (কাস্টমার)
                    </p>

                    <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                      <StickyNote
                        size={13}
                        className="mt-0.5 flex-shrink-0 text-slate-400"
                      />

                      <span className="whitespace-pre-wrap">
                        {displayNote}
                      </span>
                    </p>
                  </div>
                )}

                {/* OFFICE NOTE */}

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

                      <span className="whitespace-pre-wrap">
                        {order.officeOrderNote}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* NAME */}

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    নাম
                  </label>

                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          name: e.target
                            .value,
                        }),
                      )
                    }
                    className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* PHONE */}

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    ফোন
                  </label>

                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          phone: e.target
                            .value,
                        }),
                      )
                    }
                    className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* FULL ADDRESS */}

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    সম্পূর্ণ ঠিকানা
                  </label>

                  <textarea
                    value={
                      form.address
                    }
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          address:
                            e.target
                              .value,
                        }),
                      )
                    }
                    rows={3}
                    placeholder="বাড়ি/ফ্ল্যাট, রোড, এলাকা, থানা/উপজেলা, জেলা সহ সম্পূর্ণ ঠিকানা লিখুন"
                    className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* NOTE */}

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    অর্ডার নোট
                  </label>

                  <textarea
                    value={form.note}
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          note: e.target
                            .value,
                        }),
                      )
                    }
                    rows={2}
                    className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ITEMS */}

          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 font-display text-base font-bold text-ink-900">
              অর্ডার আইটেম (
              {(editing
                ? form.items
                : displayItems
              )?.length || 0}
              )
            </h3>

            {!editing ? (
              <div className="divide-y divide-mist-100">
                {displayItems.length >
                0 ? (
                  displayItems.map(
                    (item, i) => (
                      <div
                        key={
                          item.variantId ||
                          item.productId ||
                          item._id ||
                          i
                        }
                        className="flex items-center gap-4 py-3.5"
                      >
                        {item.productImage ? (
                          <img
                            src={
                              item.productImage
                            }
                            alt={
                              item.productName ||
                              "Product"
                            }
                            className="h-16 w-16 flex-shrink-0 rounded-xl bg-mist-100 object-cover"
                            onError={(
                              e,
                            ) => {
                              e.currentTarget.style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-mist-100 text-[10px] font-medium text-slate-300">
                            No Image
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {item.productName ||
                              item.name ||
                              "Unnamed Product"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Qty:{" "}
                            {Number(
                              item.quantity,
                            ) || 0}
                          </p>

                          {(item.variantId ||
                            item.selectedColor ||
                            item.selectedSize) && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {item.variantId && (
                                <span className="rounded-md bg-mist-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  Variant:{" "}
                                  {
                                    item.variantId
                                  }
                                </span>
                              )}

                              {item.selectedColor && (
                                <span className="rounded-md bg-mist-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  Color:{" "}
                                  {
                                    item.selectedColor
                                  }
                                </span>
                              )}

                              {item.selectedSize && (
                                <span className="rounded-md bg-mist-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  Size:{" "}
                                  {
                                    item.selectedSize
                                  }
                                </span>
                              )}
                            </div>
                          )}

                          {item.productId && (
                            <p className="mt-0.5 text-[11px] text-slate-300">
                              Product ID:{" "}
                              {
                                item.productId
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-semibold text-ink-900">
                            {currency(
                              (Number(
                                item.price,
                              ) || 0) *
                                (Number(
                                  item.quantity,
                                ) || 0),
                            )}
                          </p>

                          <p className="text-[11px] text-slate-400">
                            {currency(
                              item.price,
                            )}{" "}
                            / প্রতিটি
                          </p>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="py-8 text-center text-sm text-slate-400">
                    কোনো প্রোডাক্ট পাওয়া যায়নি
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-mist-100">
                {form.items.map(
                  (item, i) => (
                    <div
                      key={
                        item.variantId ||
                        item.productId ||
                        item._id ||
                        i
                      }
                      className="flex flex-wrap items-center gap-3 py-3.5"
                    >
                      {item.productImage ? (
                        <img
                          src={
                            item.productImage
                          }
                          alt={
                            item.productName ||
                            "Product"
                          }
                          className="h-14 w-14 flex-shrink-0 rounded-xl bg-mist-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-mist-100 text-[10px] font-medium text-slate-300">
                          No Image
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {item.productName ||
                            item.name ||
                            "Unnamed Product"}
                        </p>

                        {item.productId && (
                          <p className="mt-0.5 text-[11px] text-slate-300">
                            Product ID:{" "}
                            {
                              item.productId
                            }
                          </p>
                        )}

                        {(item.variantId ||
                          item.selectedColor ||
                          item.selectedSize) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.variantId && (
                              <span className="rounded-md bg-mist-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                {
                                  item.variantId
                                }
                              </span>
                            )}

                            {item.selectedColor && (
                              <span className="rounded-md bg-mist-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                {
                                  item.selectedColor
                                }
                              </span>
                            )}

                            {item.selectedSize && (
                              <span className="rounded-md bg-mist-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                Size:{" "}
                                {
                                  item.selectedSize
                                }
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-slate-400">
                          Qty:{" "}
                          {Number(
                            item.quantity,
                          ) || 0}
                        </p>
                      </div>

                      {/* QUANTITY */}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemField(
                              i,
                              "quantity",
                              Math.max(
                                1,
                                (Number(
                                  item.quantity,
                                ) || 1) -
                                  1,
                              ),
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist-100 text-slate-500 hover:bg-mist-200"
                        >
                          <Minus
                            size={12}
                          />
                        </button>

                        <input
                          type="number"
                          min={1}
                          value={
                            item.quantity
                          }
                          onChange={(e) =>
                            updateItemField(
                              i,
                              "quantity",
                              Math.max(
                                1,
                                Number(
                                  e.target
                                    .value,
                                ) || 1,
                              ),
                            )
                          }
                          className="w-12 rounded-lg border border-mist-200 px-1.5 py-1 text-center text-sm"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            updateItemField(
                              i,
                              "quantity",
                              (Number(
                                item.quantity,
                              ) || 1) +
                                1,
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist-100 text-slate-500 hover:bg-mist-200"
                        >
                          <Plus
                            size={12}
                          />
                        </button>
                      </div>

                      {/* PRICE */}

                      <input
                        type="number"
                        min={0}
                        value={
                          item.price
                        }
                        onChange={(e) =>
                          updateItemField(
                            i,
                            "price",
                            e.target
                              .value,
                          )
                        }
                        className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                      />

                      {/* DELETE ITEM */}

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(i)
                        }
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2
                          size={14}
                        />
                      </button>
                    </div>
                  ),
                )}

                {form.items.length ===
                  0 && (
                  <p className="py-6 text-center text-sm text-slate-400">
                    কোনো আইটেম নেই
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            RIGHT SIDE
        ========================================================= */}

        <div className="space-y-5">
          {/* ORDER STATUS */}

          <div className="no-print animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-ink-900">
              অর্ডার স্ট্যাটাস

              {order.courierStatus &&
                !admin?.canManageCourier && (
                  <Lock
                    size={13}
                    className="text-slate-400"
                  />
                )}
            </h3>

            {order.courierStatus &&
              !admin?.canManageCourier && (
                <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-mist-50 px-3 py-2 text-xs font-medium text-slate-500">
                  <Lock
                    size={13}
                    className="mt-0.5 flex-shrink-0"
                  />

                  Steadfast থেকে status নির্ধারিত হয়েছে — শুধুমাত্র কুরিয়ার ম্যানেজার এটা পরিবর্তন করতে পারবেন।
                </p>
              )}

            <div className="space-y-1.5">
              {STATUS_OPTIONS.map(
                (status) => {
                  const locked =
                    Boolean(
                      order.courierStatus,
                    ) &&
                    !admin?.canManageCourier;

                  const isCurrent =
                    order.status ===
                    status;

                  const isBusy =
                    saving ||
                    confirming;

                  return (
                    <button
                      type="button"
                      key={status}
                      disabled={
                        isBusy ||
                        locked ||
                        isCurrent
                      }
                      onClick={() =>
                        handleStatusChange(
                          status,
                        )
                      }
                      title={
                        locked
                          ? "শুধুমাত্র কুরিয়ার ম্যানেজার পরিবর্তন করতে পারবেন"
                          : isCurrent
                            ? "এটাই বর্তমান status"
                            : status ===
                                "confirmed"
                              ? "Confirm করার সময় backend stock update করবে"
                              : ""
                      }
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium capitalize transition ${
                        isCurrent
                          ? "bg-ink-900 text-white"
                          : "bg-mist-50 text-slate-600 hover:bg-mist-100"
                      } ${
                        locked ||
                        isBusy ||
                        isCurrent
                          ? "cursor-not-allowed opacity-70"
                          : ""
                      }`}
                    >
                      <span>
                        {status}
                      </span>

                      {isCurrent && (
                        <span className="text-xs">
                          ✓ বর্তমান
                        </span>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* PAYMENT SUMMARY */}

          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 font-display text-base font-bold text-ink-900">
              পেমেন্ট সামারি
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>
                  Subtotal
                </span>

                <span className="font-medium text-ink-900">
                  {currency(
                    editing
                      ? itemsSubtotal
                      : displaySubtotal,
                  )}
                </span>
              </div>

              <div className="flex justify-between text-slate-500">
                <span>
                  Delivery
                </span>

                {editing ? (
                  <input
                    type="number"
                    min={0}
                    value={
                      form.deliveryCharge
                    }
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          deliveryCharge:
                            e.target
                              .value,
                        }),
                      )
                    }
                    className="w-24 rounded-lg border border-mist-200 px-2 py-1 text-right text-sm"
                  />
                ) : (
                  <span className="font-medium text-ink-900">
                    {currency(
                      displayDelivery,
                    )}
                  </span>
                )}
              </div>

              <div className="my-2 h-px bg-mist-200" />

              <div className="flex justify-between text-base font-bold text-ink-900">
                <span>
                  Total
                </span>

                <span className="text-brand-600">
                  {currency(
                    editing
                      ? formTotal
                      : displayTotal,
                  )}
                </span>
              </div>
            </div>

            {order.createdAt && (
              <p className="mt-4 text-xs text-slate-400">
                অর্ডার করা হয়েছে:{" "}
                {new Date(
                  order.createdAt,
                ).toLocaleString(
                  "en-GB",
                )}
              </p>
            )}

            {lastEdit?.at && (
              <p className="mt-1 text-xs text-slate-400">
                সর্বশেষ পরিবর্তন:{" "}
                {new Date(
                  lastEdit.at,
                ).toLocaleString(
                  "en-GB",
                )}
              </p>
            )}
          </div>

          {/* COMMENTS */}

          <div className="no-print animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-ink-900">
              <MessageSquare
                size={17}
                className="text-brand-600"
              />
              অভ্যন্তরীণ কমেন্ট
            </h3>

            <div className="mb-3 max-h-56 space-y-2.5 overflow-y-auto">
              {comments.length ===
                0 && (
                <p className="text-xs text-slate-400">
                  কোনো কমেন্ট নেই
                </p>
              )}

              {comments.map(
                (comment) => {
                  const commentAdmin =
                    getAdminById(
                      comment.adminId,
                    );

                  return (
                    <div
                      key={
                        comment.id
                      }
                      className="flex gap-2"
                    >
                      {commentAdmin?.avatar && (
                        <img
                          src={
                            commentAdmin.avatar
                          }
                          alt={
                            commentAdmin.name
                          }
                          className="h-6 w-6 flex-shrink-0 rounded-full ring-1 ring-mist-200"
                        />
                      )}

                      <div className="min-w-0 flex-1 rounded-xl bg-mist-50 px-3 py-2">
                        <p className="text-xs font-semibold text-ink-900">
                          {commentAdmin?.name ||
                            comment.adminId}
                        </p>

                        <p className="text-sm text-slate-600">
                          {
                            comment.text
                          }
                        </p>

                        {comment.at && (
                          <p className="mt-0.5 text-[10px] text-slate-300">
                            {new Date(
                              comment.at,
                            ).toLocaleString(
                              "en-GB",
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={
                  commentText
                }
                onChange={(e) =>
                  setCommentText(
                    e.target
                      .value,
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    handleAddComment();
                  }
                }}
                placeholder="একটা নোট লিখুন..."
                className="flex-1 rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />

              <button
                type="button"
                onClick={
                  handleAddComment
                }
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
              >
                <Send
                  size={14}
                />
              </button>
            </div>
          </div>

          {/* RETURN / REFUND */}

          {(order.status ===
            "cancelled" ||
            [
              "returned",
              "partial_delivered",
              "hold",
            ].includes(
              order.courierStatus,
            )) && (
            <div className="no-print animate-in rounded-2xl border border-rose-200 bg-rose-50/40 p-6 shadow-card">
              <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-rose-700">
                <RotateCcw
                  size={17}
                />
                রিটার্ন / রিফান্ড
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    রিটার্নের কারণ
                  </label>

                  <textarea
                    value={
                      returnForm.returnReason
                    }
                    onChange={(e) =>
                      setReturnForm(
                        (current) => ({
                          ...current,
                          returnReason:
                            e.target
                              .value,
                        }),
                      )
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
                      min={0}
                      value={
                        returnForm.refundAmount
                      }
                      onChange={(e) =>
                        setReturnForm(
                          (current) => ({
                            ...current,
                            refundAmount:
                              e.target
                                .value,
                          }),
                        )
                      }
                      className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      রিফান্ড স্ট্যাটাস
                    </label>

                    <select
                      value={
                        returnForm.refundStatus
                      }
                      onChange={(e) =>
                        setReturnForm(
                          (current) => ({
                            ...current,
                            refundStatus:
                              e.target
                                .value,
                          }),
                        )
                      }
                      className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
                    >
                      <option value="pending">
                        Pending
                      </option>

                      <option value="processing">
                        Processing
                      </option>

                      <option value="refunded">
                        Refunded
                      </option>
                    </select>
                  </div>
                </div>

                {canApproveReturns ? (
                  <button
                    type="button"
                    onClick={
                      handleSaveReturn
                    }
                    disabled={
                      savingReturn
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {savingReturn ? (
                      <Loader2
                        size={13}
                        className="animate-spin"
                      />
                    ) : (
                      <Save
                        size={13}
                      />
                    )}

                    সেভ করুন
                  </button>
                ) : (
                  <p className="text-xs font-medium text-rose-400">
                    শুধুমাত্র Super Admin বা Order Manager রিটার্ন/রিফান্ড অনুমোদন করতে পারবেন।
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEADFAST */}

          <div className="no-print animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <Truck
                  size={17}
                  className="text-brand-600"
                />
                কুরিয়ার (Steadfast)
              </h3>

              {order.consignmentId && (
                <button
                  type="button"
                  onClick={() =>
                    setLiveTracking(
                      (value) =>
                        !value,
                    )
                  }
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    liveTracking
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-mist-100 text-slate-400"
                  }`}
                  title="লাইভ আপডেট চালু/বন্ধ করুন"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      liveTracking
                        ? "animate-pulse bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  />

                  {liveTracking
                    ? "লাইভ"
                    : "বন্ধ"}
                </button>
              )}
            </div>

            {!order.consignmentId ? (
              <div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {COURIERS.map(
                    (courier) => (
                      <span
                        key={
                          courier.id
                        }
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          courier.id ===
                          DEFAULT_COURIER
                            ? "bg-ink-900 text-white"
                            : "bg-mist-100 text-slate-400"
                        }`}
                        title={
                          courier.active
                            ? ""
                            : "শীঘ্রই আসছে"
                        }
                      >
                        {
                          courier.label
                        }

                        {!courier.active &&
                          " (শীঘ্রই)"}
                      </span>
                    ),
                  )}
                </div>

                <p className="mb-3 text-sm text-slate-500">
                  এখনো কোনো Steadfast parcel তৈরি হয়নি।
                </p>

                {order.status !==
                  "confirmed" && (
                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    Parcel তৈরি করার আগে Order-টি Confirmed করতে হবে।
                  </p>
                )}

                {admin?.canManageCourier ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleCreateParcel(
                        false,
                      )
                    }
                    disabled={
                      creatingParcel ||
                      order.status !==
                        "confirmed"
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-900/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingParcel ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <PackageCheck
                        size={15}
                      />
                    )}

                    Steadfast Parcel তৈরি করুন
                  </button>
                ) : (
                  <p className="rounded-lg bg-mist-50 px-3 py-2 text-xs font-medium text-slate-400">
                    শুধুমাত্র কুরিয়ার ম্যানেজার পারমিশনপ্রাপ্ত admin parcel তৈরি করতে পারবেন।
                  </p>
                )}

                {parcelError && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                    <AlertTriangle
                      size={13}
                      className="mt-0.5 flex-shrink-0"
                    />

                    {parcelError}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  {order.courierStatus ===
                  "delivered" ? (
                    <CheckCircle2
                      size={16}
                      className="text-emerald-600"
                    />
                  ) : order.courierStatus ===
                      "cancelled" ||
                    order.courierStatus ===
                      "failed" ? (
                    <AlertTriangle
                      size={16}
                      className="text-rose-600"
                    />
                  ) : (
                    <Truck
                      size={16}
                      className="text-sky-600"
                    />
                  )}

                  <span className="text-sm font-bold capitalize text-ink-900">
                    {order.courierStatus ||
                      "created"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <p>
                    Consignment ID:{" "}
                    <span className="font-semibold text-ink-900">
                      {
                        order.consignmentId
                      }
                    </span>
                  </p>

                  {order.trackingCode && (
                    <p>
                      Tracking Code:{" "}
                      <span className="font-semibold text-ink-900">
                        {
                          order.trackingCode
                        }
                      </span>
                    </p>
                  )}

                  {order.parcelCreatedAt && (
                    <p>
                      তৈরি হয়েছে:{" "}
                      {new Date(
                        order.parcelCreatedAt,
                      ).toLocaleString(
                        "en-GB",
                      )}
                    </p>
                  )}

                  {lastChecked && (
                    <p className="text-slate-300">
                      সর্বশেষ চেক করা হয়েছে:{" "}
                      {lastChecked.toLocaleTimeString(
                        "en-GB",
                      )}
                    </p>
                  )}
                </div>

                {Array.isArray(
                  order.courierHistory,
                ) &&
                  order
                    .courierHistory
                    .length >
                    0 && (
                    <div className="mt-4 space-y-2.5 border-t border-mist-100 pt-3">
                      {[
                        ...order.courierHistory,
                      ]
                        .reverse()
                        .slice(0, 6)
                        .map(
                          (
                            event,
                            index,
                          ) => (
                            <div
                              key={
                                index
                              }
                              className="flex gap-2 text-xs"
                            >
                              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />

                              <div>
                                <p className="font-semibold capitalize text-ink-900">
                                  {
                                    event.status
                                  }
                                </p>

                                {event.note && (
                                  <p className="text-slate-400">
                                    {
                                      event.note
                                    }
                                  </p>
                                )}

                                {event.at && (
                                  <p className="text-slate-300">
                                    {new Date(
                                      event.at,
                                    ).toLocaleString(
                                      "en-GB",
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                    </div>
                  )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`https://steadfast.com.bd/user/consignment/${encodeURIComponent(
                      order.consignmentId,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100"
                  >
                    <ExternalLink
                      size={12}
                    />
                    ট্র্যাক করুন
                  </a>

                  {admin?.canManageCourier &&
                    (order.courierStatus ===
                    "failed" ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleCreateParcel(
                            false,
                          )
                        }
                        disabled={
                          creatingParcel
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        {creatingParcel ? (
                          <Loader2
                            size={12}
                            className="animate-spin"
                          />
                        ) : (
                          <RefreshCw
                            size={12}
                          />
                        )}

                        আবার চেষ্টা করুন
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          openConfirm({
                            title:
                              "Parcel আবার তৈরি করবেন?",
                            message:
                              "নতুন parcel তৈরি করলে পুরনো consignment-এর পরিবর্তে নতুন consignment তৈরি হবে। আপনি কি চালিয়ে যেতে চান?",
                            confirmText:
                              "রি-ক্রিয়েট করুন",
                            cancelText:
                              "বাতিল",
                            type: "warning",

                            onConfirm:
                              async () => {
                                closeConfirm();

                                await handleCreateParcel(
                                  true,
                                );
                              },
                          })
                        }
                        disabled={
                          creatingParcel
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-mist-100 active:scale-[0.98] disabled:opacity-60"
                      >
                        <RefreshCw
                          size={12}
                        />
                        রি-ক্রিয়েট
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* PRINT LABEL */}

          <button
            type="button"
            onClick={
              handlePrintLabel
            }
            disabled={printing}
            className="no-print flex w-full items-center justify-center gap-2 rounded-xl border border-mist-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-mist-100 disabled:opacity-60"
          >
            {printing ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <Printer
                size={15}
              />
            )}

            শিপিং লেবেল প্রিন্ট করুন
          </button>

          {/* PRINT INVOICE */}

          <button
            type="button"
            onClick={
              handlePrintInvoice
            }
            className="no-print flex w-full items-center justify-center gap-2 rounded-xl border border-mist-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-mist-100"
          >
            <FileText
              size={15}
            />

            ইনভয়েস প্রিন্ট করুন (
            {getInvoiceNumber(
              order,
            )}
            )
          </button>

          {/* CONFIRM ORDER */}

          {order.status !==
            "confirmed" &&
            order.status !==
              "delivered" &&
            order.status !==
              "cancelled" &&
            order.status !==
              "duplicate" && (
              <button
                type="button"
                onClick={
                  handleConfirmOrder
                }
                disabled={
                  confirming ||
                  saving
                }
                className="no-print flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {confirming ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle2
                    size={16}
                  />
                )}

                Confirm Order — সব সেভ করে কনফার্ম করুন
              </button>
            )}

          {/* DELETE BUTTON */}

          {canDelete && (
            <button
              type="button"
              onClick={() =>
                setShowDeleteModal(
                  true,
                )
              }
              disabled={deleting}
              className="no-print flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white py-2.5 text-sm font-semibold text-rose-600 transition-all duration-200 hover:border-rose-300 hover:bg-rose-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={15} />
              অর্ডার ডিলিট করুন
            </button>
          )}
        </div>
      </div>

      {/* =========================================================
          DELETE MODAL
      ========================================================= */}

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[4px] animate-in fade-in duration-200"
          onClick={() => {
            if (!deleting) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) =>
              e.stopPropagation()
            }
            className="w-full max-w-[390px] overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.22)] animate-in zoom-in-95 slide-in-from-bottom-3 duration-200"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                  <Trash2
                    size={21}
                    strokeWidth={2}
                  />
                </div>

                <div className="min-w-0">
                  <h3 className="text-[17px] font-bold tracking-tight text-slate-900">
                    অর্ডারটি ডিলিট করবেন?
                  </h3>

                  <p className="mt-1.5 text-[13px] leading-5 text-slate-500">
                    এই অর্ডারটি স্থায়ীভাবে মুছে যাবে। এই কাজটি পরে আর ফিরিয়ে আনা যাবে না।
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 border-t border-slate-100 bg-slate-50/70 p-4">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(
                    false,
                  )
                }
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                বাতিল
              </button>

              <button
                type="button"
                onClick={
                  handleDelete
                }
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/20 transition-all duration-200 hover:bg-rose-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                    ডিলিট হচ্ছে...
                  </>
                ) : (
                  <>
                    <Trash2
                      size={15}
                    />
                    ডিলিট করুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          UNIVERSAL CONFIRM MODAL
      ========================================================= */}

      <PremiumConfirmModal
        open={
          showConfirmModal
        }
        title={
          confirmModal.title
        }
        message={
          confirmModal.message
        }
        confirmText={
          confirmModal.confirmText
        }
        cancelText={
          confirmModal.cancelText
        }
        type={
          confirmModal.type
        }
        busy={confirming}
        onConfirm={() => {
          if (
            typeof confirmModal.onConfirm ===
            "function"
          ) {
            confirmModal.onConfirm();
          }
        }}
        onClose={
          closeConfirm
        }
      />

      {/* =========================================================
          UNIVERSAL ALERT MODAL
      ========================================================= */}

      <PremiumAlertModal
        open={
          showAlertModal
        }
        title={
          alertModal.title
        }
        message={
          alertModal.message
        }
        type={
          alertModal.type
        }
        onClose={
          closeAlert
        }
      />
    </AdminLayout>
  );
};

export default OrderDetails;