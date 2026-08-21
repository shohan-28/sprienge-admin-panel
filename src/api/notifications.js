// In-app notification center. Since there's no WebSocket/push channel from
// the backend, this works by periodic polling (called from Topbar every
// 30s): it diffs the current order list against what was last seen and
// turns the differences into notifications — new orders, and status
// changes that need attention (cancelled, courier failed/hold).
//
// Notifications themselves are stored in localStorage so the bell badge
// and dropdown persist across page navigation and reloads.

const NOTIF_KEY = "bdmart_notifications";
const SEEN_KEY = "bdmart_notif_seen_state";
const MAX_NOTIFS = 200;

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
    return JSON.parse(localStorage.getItem(SEEN_KEY)) || { orderIds: [], statuses: {} };
  } catch {
    return { orderIds: [], statuses: {} };
  }
};

const writeSeenState = (state) => localStorage.setItem(SEEN_KEY, JSON.stringify(state));

const push = (type, message, orderId) => {
  const list = readNotifs();
  list.push({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type, // "new_order" | "cancelled" | "courier_issue"
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

  orders.forEach((o) => {
    if (!seenIds.has(o._id)) {
      // Skip the very first scan (empty seen state) so login doesn't dump
      // your entire order history as "new" notifications.
      if (seen.orderIds.length > 0) {
        push("new_order", `নতুন অর্ডার: ${o.name} (${o._id.slice(-6)})`, o._id);
      }
      seenIds.add(o._id);
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
    knownStatuses[o._id] = o.status;
    knownStatuses[`${o._id}_courier`] = o.courierStatus;
  });

  writeSeenState({ orderIds: [...seenIds], statuses: knownStatuses });
};

export const getNotifications = () => [...readNotifs()].reverse();

export const getUnreadCount = () => readNotifs().filter((n) => !n.read).length;

export const markAllRead = () => {
  writeNotifs(readNotifs().map((n) => ({ ...n, read: true })));
};
