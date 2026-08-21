// Chronological, cross-order audit log — separate from assignments.js's
// per-order "last edit" (which only remembers the most recent action).
// This keeps every action, so it can answer "who deleted order X on
// Tuesday" months later, and export to CSV for accountability review —
// important once multiple admins share write access.

const KEY = "bdmart_audit_log";
const MAX_ENTRIES = 2000; // keep the log from growing unbounded in localStorage

const readAll = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const writeAll = (list) => {
  const trimmed = list.slice(-MAX_ENTRIES);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
};

export const logAction = (orderId, adminId, action, details = "") => {
  const list = readAll();
  list.push({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    orderId,
    adminId,
    action,
    details,
    at: new Date().toISOString(),
  });
  writeAll(list);
};

export const getAuditLog = () => [...readAll()].reverse(); // newest first

export const exportAuditLogCsv = (getAdminName) => {
  const log = getAuditLog();
  const header = ["Time", "Admin", "Order ID", "Action", "Details"];
  const rows = log.map((e) => [
    new Date(e.at).toLocaleString("en-GB"),
    getAdminName(e.adminId) || e.adminId || "",
    e.orderId || "",
    e.action,
    e.details,
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bdmart-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
