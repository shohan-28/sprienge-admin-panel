// Customer "profiles" aren't a separate backend collection — they're
// derived on the fly from the existing orders list, grouped by phone
// number. Blacklist flags and manual tag overrides (VIP override, notes)
// are the only things that need their own storage, so those live in
// localStorage the same way assignments/comments do.

const OVERRIDES_KEY = "bdmart_customer_overrides";

const readOverrides = () => {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY)) || {};
  } catch {
    return {};
  }
};

const writeOverrides = (map) =>
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map));

export const getOverride = (phone) => readOverrides()[phone] || {};

export const setBlacklisted = (phone, blacklisted, reason = "") => {
  const all = readOverrides();
  all[phone] = { ...all[phone], blacklisted, blacklistReason: reason };
  writeOverrides(all);
};

// Builds one customer record per unique phone number from the full order
// list: total orders, total spend, delivery success rate, status
// breakdown, and an auto tag (VIP / Regular / New) based on simple
// thresholds — tunable below.
const VIP_MIN_ORDERS = 5;
const VIP_MIN_SPEND = 15000;

export const buildCustomerDirectory = (orders) => {
  const map = {};

  orders.forEach((o) => {
    if (!o.phone) return;
    if (!map[o.phone]) {
      map[o.phone] = {
        phone: o.phone,
        name: o.name,
        totalOrders: 0,
        totalSpend: 0,
        delivered: 0,
        cancelled: 0,
        pending: 0,
        firstOrderAt: o.createdAt,
        lastOrderAt: o.createdAt,
        orders: [],
      };
    }
    const c = map[o.phone];
    c.totalOrders += 1;
    if (o.status !== "cancelled") c.totalSpend += o.total || 0;
    if (o.status === "delivered") c.delivered += 1;
    if (o.status === "cancelled") c.cancelled += 1;
    if (o.status === "pending") c.pending += 1;
    if (new Date(o.createdAt) < new Date(c.firstOrderAt)) c.firstOrderAt = o.createdAt;
    if (new Date(o.createdAt) > new Date(c.lastOrderAt)) c.lastOrderAt = o.createdAt;
    c.orders.push(o);
    c.name = o.name || c.name; // keep the most recent name on file
  });

  const overrides = readOverrides();

  return Object.values(map)
    .map((c) => {
      const successRate =
        c.totalOrders > 0 ? Math.round((c.delivered / c.totalOrders) * 100) : 0;
      const override = overrides[c.phone] || {};
      let tag = "New";
      if (c.totalOrders >= VIP_MIN_ORDERS || c.totalSpend >= VIP_MIN_SPEND) tag = "VIP";
      else if (c.totalOrders > 1) tag = "Regular";
      return {
        ...c,
        successRate,
        tag,
        blacklisted: !!override.blacklisted,
        blacklistReason: override.blacklistReason || "",
      };
    })
    .sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt));
};
