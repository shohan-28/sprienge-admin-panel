// In-app notification center. Since there's no WebSocket/push channel from
// the backend, this works by periodic polling (called from Topbar every
// 30s): it diffs the current order list (and product list) against what
// was last seen and turns the differences into notifications.
//
// Notification types: new_order, cancelled, courier_issue, low_stock,
// new_customer, stale_pending (order sitting in "pending" too long),
// confirmed_no_parcel (confirmed but Steadfast parcel was never created).
//
// Notifications themselves are stored in localStorage so the bell badge
// and dropdown persist across page navigation and reloads.

import { getProducts } from "./products.js";

const NOTIF_KEY = "bdmart_notifications";
const SEEN_KEY = "bdmart_notif_seen_state";
const MAX_NOTIFS = 300;
const STALE_PENDING_HOURS = 12;

const readNotifs = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(NOTIF_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const writeNotifs = (list) =>
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(-MAX_NOTIFS)));

const readSeenState = () => {
  try {
    return (
      JSON.parse(localStorage.getItem(SEEN_KEY)) || {
        orderIds: [],
        statuses: {},
        knownPhones: [],
        lowStockFlags: {},
        staleFlags: {},
        noParcelFlags: {},
      }
    );
  } catch {
    return {
      orderIds: [],
      statuses: {},
      knownPhones: [],
      lowStockFlags: {},
      staleFlags: {},
      noParcelFlags: {},
    };
  }
};

const writeSeenState = (state) => localStorage.setItem(SEEN_KEY, JSON.stringify(state));

const push = (type, message, orderId) => {
  const list = readNotifs();
  list.push({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
    orderId,
    at: new Date().toISOString(),
    read: false,
  });
  writeNotifs(list);
};

// Call with the freshly-fetched order list. Returns nothing — notifications
// land in storage; callers re-read getNotifications() to render.
export const scanForNotifications = (orders) => {
  const seen = readSeenState();
  const seenIds = new Set(seen.orderIds);
  const knownStatuses = seen.statuses || {};
  const knownPhones = new Set(seen.knownPhones || []);
  const lowStockFlags = seen.lowStockFlags || {};
  const staleFlags = seen.staleFlags || {};
  const noParcelFlags = seen.noParcelFlags || {};
  const isFirstScan = seen.orderIds.length === 0;
  const now = Date.now();

  orders.forEach((o) => {
    if (!seenIds.has(o._id)) {
      if (!isFirstScan) {
        push("new_order", `নতুন অর্ডার: ${o.name} (${o._id.slice(-6)})`, o._id);
      }
      seenIds.add(o._id);
    }

    // First-ever order from this phone number → new customer.
    if (o.phone && !knownPhones.has(o.phone)) {
      if (!isFirstScan) {
        push("new_customer", `নতুন কাস্টমার: ${o.name} (${o.phone})`, o._id);
      }
      knownPhones.add(o.phone);
    }

    const prevStatus = knownStatuses[o._id];
    if (prevStatus && prevStatus !== o.status && o.status === "cancelled") {
      push("cancelled", `অর্ডার বাতিল হয়েছে: ${o.name}`, o._id);
    }
    const prevCourier = knownStatuses[`${o._id}_courier`];
    if (
      prevCourier &&
      prevCourier !== o.courierStatus &&
      ["cancelled", "failed", "hold", "returned"].includes(o.courierStatus)
    ) {
      push(
        "courier_issue",
        `কুরিয়ার স্ট্যাটাস "${o.courierStatus}": ${o.name}`,
        o._id
      );
    }

    // Confirmed order that still has no Steadfast parcel after a while —
    // easy to lose track of in a busy order list.
    const hoursSinceConfirm =
      (now - new Date(o.updatedAt || o.createdAt).getTime()) / 3600000;
    if (
      o.status === "confirmed" &&
      !o.consignmentId &&
      hoursSinceConfirm > 3 &&
      !noParcelFlags[o._id]
    ) {
      push(
        "confirmed_no_parcel",
        `কনফার্ম করা হয়েছে কিন্তু parcel তৈরি হয়নি: ${o.name}`,
        o._id
      );
      noParcelFlags[o._id] = true;
    }

    // Order sitting in "pending" for too long — a reminder to follow up.
    const hoursSinceCreated = (now - new Date(o.createdAt).getTime()) / 3600000;
    if (
      o.status === "pending" &&
      hoursSinceCreated > STALE_PENDING_HOURS &&
      !staleFlags[o._id]
    ) {
      push(
        "stale_pending",
        `${STALE_PENDING_HOURS} ঘণ্টার বেশি pending: ${o.name} — ফলোআপ করুন`,
        o._id
      );
      staleFlags[o._id] = true;
    }

    knownStatuses[o._id] = o.status;
    knownStatuses[`${o._id}_courier`] = o.courierStatus;
  });

  // Low-stock scan across the product catalog (localStorage-backed).
  try {
    getProducts().forEach((p) => {
      if (typeof p.stock !== "number") return;
      if (p.stock <= 5 && !lowStockFlags[p.id]) {
        push("low_stock", `স্টক কমে গেছে: ${p.name} (মাত্র ${p.stock} পিস বাকি)`, null);
        lowStockFlags[p.id] = true;
      } else if (p.stock > 5 && lowStockFlags[p.id]) {
        delete lowStockFlags[p.id]; // restocked — allow the alert again if it drops later
      }
    });
  } catch {
    // product catalog read failure shouldn't break order notifications
  }

  writeSeenState({
    orderIds: [...seenIds],
    statuses: knownStatuses,
    knownPhones: [...knownPhones],
    lowStockFlags,
    staleFlags,
    noParcelFlags,
  });
};

export const getNotifications = () => [...readNotifs()].reverse();

export const getUnreadCount = () => readNotifs().filter((n) => !n.read).length;

export const markAllRead = () => {
  writeNotifs(readNotifs().map((n) => ({ ...n, read: true })));
};
