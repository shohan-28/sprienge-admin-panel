// Order -> Admin assignment tracking.
//
// The provided backend only exposes GET/PUT/DELETE on /orders, with no
// "assign" field yet. Rather than block the feature on a backend change,
// assignment state lives here as a small localStorage-backed store so the
// whole assign / edit-lock workflow works today. Swap the three functions
// below for real API calls (e.g. PUT /orders/:id/assign) once the backend
// supports it — nothing in the UI needs to change.

import { logAction } from "./auditLog.js";

const KEY = "bdmart_order_assignments";

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

const writeAll = (map) => localStorage.setItem(KEY, JSON.stringify(map));

export const getAssignment = (orderId) => readAll()[orderId] || null;

export const getAllAssignments = () => readAll();

export const assignOrder = (orderId, adminId) => {
  const all = readAll();
  all[orderId] = { adminId, assignedAt: new Date().toISOString() };
  writeAll(all);
  logAction(orderId, adminId, "assigned to self");
  return all[orderId];
};

export const unassignOrder = (orderId, adminId = null) => {
  const all = readAll();
  delete all[orderId];
  writeAll(all);
  if (adminId) logAction(orderId, adminId, "unassigned");
};

// Tracks who last saved edits + status changes on an order, and when.
const HISTORY_KEY = "bdmart_order_history";

const readHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  } catch {
    return {};
  }
};

const writeHistory = (map) => localStorage.setItem(HISTORY_KEY, JSON.stringify(map));

export const getLastEdit = (orderId) => readHistory()[orderId] || null;

// Records the most-recent action for quick display on Order Details, AND
// appends to the permanent, exportable audit log (see api/auditLog.js).
export const recordEdit = (orderId, adminId, action, details = "") => {
  const all = readHistory();
  all[orderId] = { adminId, action, at: new Date().toISOString() };
  writeHistory(all);
  logAction(orderId, adminId, action, details);
  return all[orderId];
};
