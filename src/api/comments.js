// Internal admin-to-admin comments on an order — separate from the
// customer-facing note and the office note. Meant for operational chatter
// ("কাস্টমার কল ধরছে না", "ঠিকানা কনফার্ম করা হয়েছে") that other admins
// should see when they open the order, without it ever reaching the
// customer or a printed label.

import { logAction } from "./auditLog.js";

const KEY = "bdmart_order_comments";

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

const writeAll = (map) => localStorage.setItem(KEY, JSON.stringify(map));

export const getComments = (orderId) => readAll()[orderId] || [];

export const addComment = (orderId, adminId, text) => {
  const all = readAll();
  const list = all[orderId] || [];
  const comment = {
    id: `c-${Date.now()}`,
    adminId,
    text,
    at: new Date().toISOString(),
  };
  all[orderId] = [...list, comment];
  writeAll(all);
  logAction(orderId, adminId, "added comment", text);
  return comment;
};
