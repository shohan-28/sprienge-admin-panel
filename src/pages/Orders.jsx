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
  confirmOrder,
  createSteadfastParcel,
} from "../api/orders.js";

import {
  getAllAssignments,
  recordEdit,
} from "../api/assignments.js";

import { useAuth } from "../context/AuthContext.jsx";
import { hasPermission } from "../config/admins.js";
import { runPrintQueue } from "../utils/printQueue.js";
import { getLabelSettings } from "../config/settings.js";
import { getTenantById } from "../config/tenants.js";

/*
=========================================================
HELPERS
=========================================================
*/

const currency = (n) =>
  `৳${Number(n || 0).toLocaleString("en-BD")}`;

/*
=========================================================
STATUS OPTIONS
=========================================================
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
=========================================================
SORT OPTIONS
=========================================================
*/

const SORT_OPTIONS = [
  {
    value: "date_desc",
    label: "তারিখ: নতুন আগে",
  },
  {
    value: "date_asc",
    label: "তারিখ: পুরাতন আগে",
  },
  {
    value: "total_desc",
    label: "মোট: বেশি আগে",
  },
  {
    value: "total_asc",
    label: "মোট: কম আগে",
  },
];

const PAGE_SIZE = 10;

/*
=========================================================
NORMALIZE ORDER RESPONSE
=========================================================
*/

const extractOrder = (response) => {
  if (!response) {
    return null;
  }

  /*
  Backend may return:

  {
    success: true,
    order: {...}
  }

  OR directly:

  {...}
  */

  if (response?.order) {
    return response.order;
  }

  if (response?.data?.order) {
    return response.data.order;
  }

  if (response?._id) {
    return response;
  }

  if (response?.data?._id) {
    return response.data;
  }

  return null;
};

/*
=========================================================
COURIER BADGE
=========================================================
*/

const CourierBadge = ({ order }) => {
  if (!order?.consignmentId) {
    return (
      <span className="text-xs text-slate-300">
        —
      </span>
    );
  }

  const status =
    order.courierStatus || "created";

  const tone =
    status === "delivered"
      ? "bg-emerald-50 text-emerald-600"
      : status === "cancelled" ||
        status === "failed"
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

/*
=========================================================
ORDERS
=========================================================
*/

const Orders = () => {
  const { admin } = useAuth();

  /*
  =======================================================
  PERMISSIONS
  =======================================================
  */

  const canDelete = hasPermission(
    admin,
    "deleteOrders"
  );

  const canExport = hasPermission(
    admin,
    "exportData"
  );

  /*
  =======================================================
  STATE
  =======================================================
  */

  const [orders, setOrders] = useState([]);

  const [assignments, setAssignments] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [err, setErr] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [sortBy, setSortBy] =
    useState("date_desc");

  const [page, setPage] =
    useState(1);

  const [busyId, setBusyId] =
    useState(null);

  const [selected, setSelected] =
    useState(() => new Set());

  const [bulkRunning, setBulkRunning] =
    useState(false);

  const [rowProgress, setRowProgress] =
    useState({});

  /*
  =======================================================
  DELETE MODAL
  =======================================================
  */

  const [deleteModal, setDeleteModal] =
    useState({
      open: false,
      order: null,
    });

  /*
  =======================================================
  LOAD ORDERS
  =======================================================
  */

  const load = () => {
    setLoading(true);
    setErr("");

    getOrders()
      .then((data) => {
        setOrders(
          Array.isArray(data)
            ? data
            : []
        );
      })
      .catch((error) => {
        console.error(
          "Failed to load orders:",
          error
        );

        setOrders([]);

        setErr(
          error?.message ||
            "অর্ডার লোড করা যায়নি। Backend চলছে কিনা চেক করুন।"
        );
      })
      .finally(() => {
        setLoading(false);
      });

    try {
      setAssignments(
        getAllAssignments() || {}
      );
    } catch (error) {
      console.error(
        "Failed to load assignments:",
        error
      );

      setAssignments({});
    }
  };

  useEffect(() => {
    load();
  }, []);

  /*
  =======================================================
  FILTER + SEARCH + SORT
  =======================================================
  */

  const filtered = useMemo(() => {
    if (!Array.isArray(orders)) {
      return [];
    }

    let list = orders.filter((o) => {
      const searchText =
        query?.toLowerCase() || "";

      const name =
        String(o?.name || "")
          .toLowerCase();

      const phone =
        String(o?.phone || "");

      const orderId =
        String(o?._id || "");

      const address =
        String(o?.address || "")
          .toLowerCase();

      const matchesQuery =
        !query ||
        name.includes(searchText) ||
        phone.includes(query) ||
        orderId.includes(query) ||
        address.includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        o?.status === statusFilter;

      return (
        matchesQuery &&
        matchesStatus
      );
    });

    list = [...list].sort(
      (a, b) => {
        switch (sortBy) {
          case "date_asc":
            return (
              new Date(
                a?.createdAt || 0
              ) -
              new Date(
                b?.createdAt || 0
              )
            );

          case "total_desc":
            return (
              Number(b?.total || 0) -
              Number(a?.total || 0)
            );

          case "total_asc":
            return (
              Number(a?.total || 0) -
              Number(b?.total || 0)
            );

          case "date_desc":
          default:
            return (
              new Date(
                b?.createdAt || 0
              ) -
              new Date(
                a?.createdAt || 0
              )
            );
        }
      }
    );

    return list;
  }, [
    orders,
    query,
    statusFilter,
    sortBy,
  ]);

  /*
  =======================================================
  RESET PAGE
  =======================================================
  */

  useEffect(() => {
    setPage(1);
  }, [
    query,
    statusFilter,
    sortBy,
  ]);

  /*
  =======================================================
  PAGINATION
  =======================================================
  */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filtered.length / PAGE_SIZE
    )
  );

  const paged = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /*
  =======================================================
  STATUS CHANGE
  =======================================================
  */

  const handleStatusChange = async (
    id,
    status,
    order
  ) => {
    if (!id || !status || !order) {
      return;
    }

    /*
    -----------------------------------------------
    COURIER LOCK
    -----------------------------------------------
    */

    if (
      order?.courierStatus &&
      !admin?.canManageCourier
    ) {
      alert(
        "Steadfast থেকে status নির্ধারিত হয়ে গেছে — শুধুমাত্র কুরিয়ার ম্যানেজার এটা পরিবর্তন করতে পারবেন।"
      );

      return;
    }

    /*
    -----------------------------------------------
    NO CHANGE
    -----------------------------------------------
    */

    if (status === order.status) {
      return;
    }

    setBusyId(id);

    try {
      let response;

      /*
      =================================================
      CONFIRMED STATUS
      =================================================

      IMPORTANT:

      Confirming an order is NOT a normal status update.

      Backend /:id/confirm endpoint handles:
      - product validation
      - variant validation
      - stock deduction
      - status = confirmed

      Therefore we MUST use confirmOrder().
      */

      if (status === "confirmed") {
        response =
          await confirmOrder(id);

        const confirmedOrder =
          extractOrder(response);

        if (confirmedOrder) {
          setOrders((prev) =>
            prev.map((o) =>
              o._id === id
                ? confirmedOrder
                : o
            )
          );
        } else {
          /*
          If backend doesn't return
          complete order, reload.
          */

          await load();
        }

        if (admin) {
          recordEdit(
            id,
            admin.id,
            "status → confirmed"
          );
        }

        return;
      }

      /*
      =================================================
      OTHER STATUS
      =================================================
      */

      response =
        await updateOrderStatus(
          id,
          status
        );

      const updatedOrder =
        extractOrder(response);

      if (updatedOrder) {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === id
              ? updatedOrder
              : o
          )
        );
      } else {
        /*
        Backend response doesn't contain
        order object → reload list.
        */

        await load();
      }

      if (admin) {
        recordEdit(
          id,
          admin.id,
          `status → ${status}`
        );
      }
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      alert(
        error?.message ||
          "স্ট্যাটাস আপডেট করা যায়নি।"
      );
    } finally {
      setBusyId(null);
    }
  };

  /*
  =======================================================
  OPEN DELETE MODAL
  =======================================================
  */

  const handleDelete = (order) => {
    if (!order?._id) {
      return;
    }

    setDeleteModal({
      open: true,
      order,
    });
  };

  /*
  =======================================================
  CLOSE DELETE MODAL
  =======================================================
  */

  const closeDeleteModal = () => {
    if (busyId !== null) {
      return;
    }

    setDeleteModal({
      open: false,
      order: null,
    });
  };

  /*
  =======================================================
  CONFIRM DELETE
  =======================================================
  */

  const confirmDelete = async () => {
    const order =
      deleteModal.order;

    if (!order?._id) {
      return;
    }

    setBusyId(order._id);

    try {
      await deleteOrder(order._id);

      if (admin) {
        recordEdit(
          order._id,
          admin.id,
          "deleted order"
        );
      }

      setOrders((prev) =>
        prev.filter(
          (o) =>
            o._id !== order._id
        )
      );

      setSelected((prev) => {
        const next =
          new Set(prev);

        next.delete(order._id);

        return next;
      });

      setDeleteModal({
        open: false,
        order: null,
      });
    } catch (error) {
      console.error(
        "Delete order error:",
        error
      );

      alert(
        error?.message ||
          "অর্ডার মুছে ফেলা যায়নি।"
      );
    } finally {
      setBusyId(null);
    }
  };

  /*
  =======================================================
  EXPORT CSV
  =======================================================
  */

  const exportCsv = () => {
    const header = [
      "Order ID",
      "Name",
      "Phone",
      "Address",
      "Delivery Area",
      "Items",
      "Total",
      "Status",
      "Courier Status",
      "Consignment ID",
      "Date",
    ];

    const rows = filtered.map(
      (o) => [
        o?._id || "",
        o?.name || "",
        o?.phone || "",
        o?.address || "",
        o?.deliveryArea || "",
        o?.items?.length || 0,
        o?.total || 0,
        o?.status || "",
        o?.courierStatus || "",
        o?.consignmentId || "",
        o?.createdAt
          ? new Date(
              o.createdAt
            ).toISOString()
          : "",
      ]
    );

    const csv = [
      header,
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(
                cell ?? ""
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    /*
    BOM helps Excel correctly
    recognize UTF-8/Bangla text.
    */

    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download = `spriengge-orders-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);
  };

  /*
  =======================================================
  SELECTION
  =======================================================
  */

  const toggleSelect = (id) => {
    if (!id) {
      return;
    }

    setSelected((prev) => {
      const next =
        new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const pageIdsSelected =
    paged.length > 0 &&
    paged.every((o) =>
      selected.has(o._id)
    );

  const toggleSelectPage = () => {
    setSelected((prev) => {
      const next =
        new Set(prev);

      if (pageIdsSelected) {
        paged.forEach((o) =>
          next.delete(o._id)
        );
      } else {
        paged.forEach((o) =>
          next.add(o._id)
        );
      }

      return next;
    });
  };

  const selectedOrders =
    orders.filter((o) =>
      selected.has(o._id)
    );

  /*
  =======================================================
  BULK CREATE + PRINT
  =======================================================
  */

  const handleBulkCreateAndPrint =
    async () => {
      if (
        selectedOrders.length === 0 ||
        bulkRunning
      ) {
        return;
      }

      setBulkRunning(true);

      try {
        const readyToPrint = [];

        for (const order of selectedOrders) {
          if (!order?._id) {
            continue;
          }

          setRowProgress((prev) => ({
            ...prev,
            [order._id]: "creating",
          }));

          /*
          ---------------------------------------------
          ALREADY CREATED
          ---------------------------------------------
          */

          if (order.consignmentId) {
            readyToPrint.push(order);

            setRowProgress((prev) => ({
              ...prev,
              [order._id]:
                "already-created",
            }));

            continue;
          }

          /*
          ---------------------------------------------
          CREATE PARCEL
          ---------------------------------------------
          */

          try {
            const response =
              await createSteadfastParcel(
                order._id
              );

            const updatedOrder =
              extractOrder(response);

            if (updatedOrder) {
              setOrders((prev) =>
                prev.map((o) =>
                  o._id === order._id
                    ? updatedOrder
                    : o
                )
              );

              readyToPrint.push(
                updatedOrder
              );
            } else {
              /*
              If API doesn't return
              order, use original order
              for printing.
              */

              readyToPrint.push(
                order
              );
            }

            setRowProgress((prev) => ({
              ...prev,
              [order._id]: "created",
            }));
          } catch (error) {
            console.error(
              "Parcel creation error:",
              error
            );

            setRowProgress((prev) => ({
              ...prev,
              [order._id]:
                "parcel-failed",
            }));
          }
        }

        /*
        ---------------------------------------------
        PRINT QUEUE
        ---------------------------------------------
        */

        if (
          readyToPrint.length > 0
        ) {
          await runPrintQueue(
            readyToPrint,
            getLabelSettings(),
            {
              onProgress: (
                id,
                status
              ) =>
                setRowProgress(
                  (prev) => ({
                    ...prev,
                    [id]: status,
                  })
                ),
            }
          );
        }
      } catch (error) {
        console.error(
          "Bulk create/print error:",
          error
        );
      } finally {
        setBulkRunning(false);
      }
    };

  /*
  =======================================================
  PRINT SELECTED
  =======================================================
  */

  const handlePrintSelected =
    async () => {
      if (
        selectedOrders.length === 0 ||
        bulkRunning
      ) {
        return;
      }

      setBulkRunning(true);

      try {
        await runPrintQueue(
          selectedOrders,
          getLabelSettings(),
          {
            onProgress: (
              id,
              status
            ) =>
              setRowProgress(
                (prev) => ({
                  ...prev,
                  [id]: status,
                })
              ),
          }
        );
      } catch (error) {
        console.error(
          "Print selected error:",
          error
        );
      } finally {
        setBulkRunning(false);
      }
    };

  /*
  =======================================================
  UI
  =======================================================
  */

  return (
    <AdminLayout
      title="Orders"
      subtitle={`মোট ${orders.length} টি অর্ডার`}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              placeholder="নাম, ফোন, ঠিকানা বা অর্ডার আইডি খুঁজুন..."
              className="w-full rounded-xl border border-mist-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Header Actions */}

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort */}

            <div className="relative">
              <ArrowUpDown
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value
                  )
                }
                className="appearance-none rounded-xl border border-mist-200 bg-white py-2.5 pl-8 pr-8 text-xs font-semibold text-slate-600 outline-none focus:border-brand-500"
              >
                {SORT_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* CSV */}

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

            {/* Create Order */}

            <Link
              to="/orders/new"
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={14} />
              Create Order
            </Link>
          </div>
        </div>

        {/* =================================================
            STATUS FILTERS
        ================================================= */}

        <div className="flex flex-wrap gap-2">
          {[
            "all",
            ...STATUS_OPTIONS,
          ].map((status) => (
            <button
              key={status}
              onClick={() =>
                setStatusFilter(
                  status
                )
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                statusFilter ===
                status
                  ? "bg-ink-900 text-white"
                  : "bg-white text-slate-500 ring-1 ring-mist-200 hover:bg-mist-100"
              }`}
            >
              {status === "all"
                ? "সব"
                : status}
            </button>
          ))}
        </div>
      </div>

      {/* =================================================
          SELECTED TOOLBAR
      ================================================= */}

      {selected.size > 0 && (
        <div className="no-print animate-in mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
          <span className="text-sm font-semibold text-brand-700">
            {selected.size} টি
            অর্ডার সিলেক্টেড
          </span>

          <div className="flex flex-wrap gap-2">
            {admin?.canManageCourier && (
              <button
                onClick={
                  handleBulkCreateAndPrint
                }
                disabled={
                  bulkRunning
                }
                className="flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-900/90 disabled:opacity-60"
              >
                {bulkRunning ? (
                  <Loader2
                    size={13}
                    className="animate-spin"
                  />
                ) : (
                  <PackageCheck
                    size={13}
                  />
                )}

                Steadfast Parcel তৈরি
                করে প্রিন্ট করুন
              </button>
            )}

            <button
              onClick={
                handlePrintSelected
              }
              disabled={
                bulkRunning
              }
              className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100 disabled:opacity-60"
            >
              <Printer size={13} />
              শুধু লেবেল প্রিন্ট করুন
            </button>

            <button
              onClick={() =>
                setSelected(
                  new Set()
                )
              }
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              সিলেকশন বাতিল
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          LOADING / ERROR / EMPTY
      ================================================= */}

      {loading ? (
        <div className="flex h-56 items-center justify-center text-slate-400">
          <Loader2
            className="animate-spin"
            size={26}
          />
        </div>
      ) : err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-600">
          {err}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-mist-200 bg-white py-16 text-slate-400 shadow-card">
          <PackageX
            size={32}
            className="mb-3"
          />

          <p className="text-sm font-medium">
            কোনো অর্ডার পাওয়া যায়নি
          </p>
        </div>
      ) : (
        <>
          {/* =================================================
              DESKTOP TABLE
          ================================================= */}

          <div className="animate-in hidden overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-card lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mist-200 bg-mist-50/60 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3.5">
                      <button
                        onClick={
                          toggleSelectPage
                        }
                        className="flex items-center"
                      >
                        {pageIdsSelected ? (
                          <CheckSquare
                            size={16}
                            className="text-brand-600"
                          />
                        ) : (
                          <Square
                            size={16}
                          />
                        )}
                      </button>
                    </th>

                    <th className="px-5 py-3.5">
                      কাস্টমার
                    </th>

                    <th className="px-5 py-3.5">
                      ঠিকানা
                    </th>

                    <th className="px-5 py-3.5">
                      সোর্স
                    </th>

                    <th className="px-5 py-3.5">
                      আইটেম
                    </th>

                    <th className="px-5 py-3.5">
                      মোট
                    </th>

                    <th className="px-5 py-3.5">
                      স্ট্যাটাস
                    </th>

                    <th className="px-5 py-3.5">
                      কুরিয়ার
                    </th>

                    <th className="px-5 py-3.5">
                      অ্যাসাইনড
                    </th>

                    <th className="px-5 py-3.5">
                      তারিখ
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-mist-100">
                  {paged.map(
                    (order) => (
                      <tr
                        key={
                          order._id
                        }
                        className={`transition hover:bg-mist-50/70 ${
                          busyId ===
                          order._id
                            ? "opacity-50"
                            : ""
                        }`}
                      >
                        {/* Selection */}

                        <td className="px-4 py-3.5">
                          <button
                            onClick={() =>
                              toggleSelect(
                                order._id
                              )
                            }
                            className="flex items-center"
                          >
                            {selected.has(
                              order._id
                            ) ? (
                              <CheckSquare
                                size={16}
                                className="text-brand-600"
                              />
                            ) : (
                              <Square
                                size={16}
                                className="text-slate-300"
                              />
                            )}
                          </button>
                        </td>

                        {/* Customer */}

                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-ink-900">
                            {order.name ||
                              "Unknown"}
                          </p>

                          <p className="text-xs text-slate-400">
                            {order.phone ||
                              "—"}
                          </p>
                        </td>

                        {/* Address */}

                        <td className="max-w-xs px-5 py-3.5">
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <MapPin
                              size={13}
                              className="mt-0.5 flex-shrink-0 text-slate-400"
                            />

                            <span
                              className="line-clamp-2 text-xs leading-5"
                              title={
                                order.address ||
                                ""
                              }
                            >
                              {order.address ||
                                "ঠিকানা নেই"}
                            </span>
                          </div>

                          {order.tenantId && (
                            <p className="mt-1 text-[10px] font-medium text-slate-400">
                              {getTenantById(
                                order.tenantId
                              )?.name ||
                                order.tenantId}
                            </p>
                          )}
                        </td>

                        {/* Source */}

                        <td className="px-5 py-3.5">
                          <SourceBadge
                            source={
                              order.source
                            }
                          />
                        </td>

                        {/* Items */}

                        <td className="px-5 py-3.5 text-slate-600">
                          {order.items
                            ?.length ||
                            0}{" "}
                          টি
                        </td>

                        {/* Total */}

                        <td className="px-5 py-3.5 font-semibold text-ink-900">
                          {currency(
                            order.total
                          )}
                        </td>

                        {/* Status */}

                        <td className="px-5 py-3.5">
                          <div className="relative inline-flex items-center gap-1">
                            <StatusBadge
                              status={
                                order.status
                              }
                            />

                            {order.courierStatus &&
                              !admin?.canManageCourier && (
                                <Lock
                                  size={11}
                                  className="text-slate-400"
                                />
                              )}

                            <select
                              value={
                                order.status ||
                                "pending"
                              }
                              disabled={
                                busyId ===
                                  order._id ||
                                (order.courierStatus &&
                                  !admin?.canManageCourier)
                              }
                              onChange={(
                                event
                              ) =>
                                handleStatusChange(
                                  order._id,
                                  event
                                    .target
                                    .value,
                                  order
                                )
                              }
                              className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
                              aria-label="Order status"
                            >
                              {STATUS_OPTIONS.map(
                                (
                                  status
                                ) => (
                                  <option
                                    key={
                                      status
                                    }
                                    value={
                                      status
                                    }
                                  >
                                    {
                                      status
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </td>

                        {/* Courier */}

                        <td className="px-5 py-3.5">
                          <CourierBadge
                            order={
                              order
                            }
                          />

                          {rowProgress[
                            order._id
                          ] && (
                            <p className="mt-1 text-[10px] capitalize text-slate-400">
                              {
                                rowProgress[
                                  order
                                    ._id
                                ]
                              }
                            </p>
                          )}
                        </td>

                        {/* Assigned */}

                        <td className="px-5 py-3.5">
                          <AssignedBadge
                            adminId={
                              assignments[
                                order._id
                              ]?.adminId
                            }
                          />
                        </td>

                        {/* Date */}

                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {order.createdAt
                            ? new Date(
                                order.createdAt
                              ).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </td>

                        {/* Actions */}

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/orders/${order._id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                              title="বিস্তারিত দেখুন"
                            >
                              <Eye
                                size={16}
                              />
                            </Link>

                            {canDelete && (
                              <button
                                onClick={() =>
                                  handleDelete(
                                    order
                                  )
                                }
                                disabled={
                                  busyId ===
                                  order._id
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                title="মুছে ফেলুন"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* =================================================
              MOBILE CARDS
          ================================================= */}

          <div className="animate-in grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {paged.map(
              (order) => (
                <div
                  key={order._id}
                  className={`rounded-2xl border border-mist-200 bg-white p-4 shadow-card ${
                    busyId ===
                    order._id
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  {/* Customer */}

                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <button
                        onClick={() =>
                          toggleSelect(
                            order._id
                          )
                        }
                        className="mt-0.5 flex-shrink-0"
                      >
                        {selected.has(
                          order._id
                        ) ? (
                          <CheckSquare
                            size={16}
                            className="text-brand-600"
                          />
                        ) : (
                          <Square
                            size={16}
                            className="text-slate-300"
                          />
                        )}
                      </button>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">
                          {order.name ||
                            "Unknown"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {order.phone ||
                            "—"}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      status={
                        order.status
                      }
                    />
                  </div>

                  {/* Address */}

                  <div className="mb-3 flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin
                      size={12}
                      className="mt-0.5 flex-shrink-0"
                    />

                    <span
                      className="line-clamp-2 leading-5"
                      title={
                        order.address ||
                        ""
                      }
                    >
                      {order.address ||
                        "ঠিকানা নেই"}
                    </span>
                  </div>

                  {/* Source */}

                  <div className="mb-3">
                    <SourceBadge
                      source={
                        order.source
                      }
                    />
                  </div>

                  {/* Items + Total */}

                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      {order.items
                        ?.length ||
                        0}{" "}
                      টি আইটেম
                    </span>

                    <span className="font-bold text-ink-900">
                      {currency(
                        order.total
                      )}
                    </span>
                  </div>

                  {/* Assignment + Courier */}

                  <div className="mb-3 flex items-center justify-between gap-2">
                    <AssignedBadge
                      adminId={
                        assignments[
                          order._id
                        ]?.adminId
                      }
                    />

                    <CourierBadge
                      order={
                        order
                      }
                    />
                  </div>

                  {/* Bottom */}

                  <div className="flex items-center justify-between border-t border-mist-100 pt-3">
                    <span className="text-xs text-slate-400">
                      {order.createdAt
                        ? new Date(
                            order.createdAt
                          ).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month:
                                "short",
                            }
                          )
                        : "—"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/orders/${order._id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                        title="বিস্তারিত দেখুন"
                      >
                        <Eye
                          size={16}
                        />
                      </Link>

                      {canDelete && (
                        <button
                          onClick={() =>
                            handleDelete(
                              order
                            )
                          }
                          disabled={
                            busyId ===
                            order._id
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          title="মুছে ফেলুন"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between text-sm">
              <p className="text-slate-500">
                পাতা {page} /{" "}
                {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                    )
                  }
                  className="rounded-lg border border-mist-200 bg-white px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
                >
                  আগে
                </button>

                <button
                  disabled={
                    page ===
                    totalPages
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        totalPages,
                        current + 1
                      )
                    )
                  }
                  className="rounded-lg border border-mist-200 bg-white px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
                >
                  পরে
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* =====================================================
          PREMIUM DELETE CONFIRMATION MODAL
      ===================================================== */}

      {deleteModal.open &&
        deleteModal.order && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target ===
                  event.currentTarget &&
                busyId === null
              ) {
                closeDeleteModal();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-order-title"
              className="w-full max-w-md animate-in rounded-3xl border border-white/60 bg-white p-6 shadow-2xl duration-200"
            >
              {/* Icon */}

              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 ring-8 ring-rose-50/50">
                  <Trash2
                    size={28}
                    className="text-rose-500"
                  />
                </div>
              </div>

              {/* Heading */}

              <div className="mt-5 text-center">
                <h2
                  id="delete-order-title"
                  className="text-xl font-bold tracking-tight text-slate-900"
                >
                  Delete Order?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  আপনি কি নিশ্চিতভাবে
                  এই অর্ডারটি মুছে
                  ফেলতে চান? এই কাজটি
                  আর ফিরিয়ে আনা যাবে
                  না।
                </p>
              </div>

              {/* Order Preview */}

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-400">
                      Customer
                    </p>

                    <p className="mt-1 truncate font-semibold text-slate-900">
                      {deleteModal
                        .order
                        .name ||
                        "Unknown Customer"}
                    </p>

                    {deleteModal
                      .order
                      .phone && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {
                          deleteModal
                            .order
                            .phone
                        }
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-medium text-slate-400">
                      Total
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {currency(
                        deleteModal
                          .order
                          .total
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="text-xs font-medium text-slate-400">
                    Order ID
                  </p>

                  <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-600">
                    #
                    {
                      deleteModal
                        .order
                        ._id
                    }
                  </p>
                </div>
              </div>

              {/* Warning */}

              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <span className="text-xs font-bold text-amber-600">
                    !
                  </span>
                </div>

                <p className="text-xs leading-5 text-amber-700">
                  অর্ডারটি permanently
                  delete হয়ে যাবে। পরে
                  এই অর্ডারটি recover করা
                  যাবে না।
                </p>
              </div>

              {/* Buttons */}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={
                    busyId !== null
                  }
                  onClick={
                    closeDeleteModal
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    busyId ===
                    deleteModal
                      .order
                      ._id
                  }
                  onClick={
                    confirmDelete
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyId ===
                  deleteModal
                    .order
                    ._id ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2
                        size={16}
                      />
                      Delete Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </AdminLayout>
  );
};

export default Orders;