// Central list of admin accounts.
// To add a new admin later: add a VITE_ADMIN4_* set of env vars (or
// hardcode) and push one more object below, assigning it one of the
// ROLES from permissions.js — everything else (assignment, avatars,
// permission checks) picks it up automatically.
//
// `canManageCourier` is kept as a plain boolean alongside the new
// `permissions` object for backward compatibility with earlier code that
// checks it directly — it always mirrors `permissions.manageCourier`.

import { ROLES } from "./permissions.js";

const avatarFor = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=EA580C,0F172A&fontFamily=Inter`;

const buildAdmin = (id, envPrefix, defaults, role) => {
  const name = import.meta.env[`VITE_${envPrefix}_NAME`] || defaults.name;
  return {
    id,
    username: import.meta.env[`VITE_${envPrefix}_USER`] || defaults.username,
    password: import.meta.env[`VITE_${envPrefix}_PASS`] || defaults.password,
    name,
    role: role.label,
    permissions: role.permissions,
    canManageCourier: role.permissions.manageCourier,
    avatar: avatarFor(name),
  };
};

export const ADMINS = [
  buildAdmin(
    "admin-1",
    "ADMIN1",
    { name: "Rahim Uddin", username: "admin", password: "admin123" },
    ROLES.SUPER_ADMIN
  ),
  buildAdmin(
    "admin-2",
    "ADMIN2",
    { name: "Karim Hossain", username: "karim", password: "karim123" },
    ROLES.ORDER_MANAGER
  ),
  buildAdmin(
    "admin-3",
    "ADMIN3",
    { name: "Sabbir Ahmed", username: "courier", password: "courier123" },
    ROLES.COURIER_MANAGER
  ),
];

export const findAdminByCredentials = (username, password) =>
  ADMINS.find((a) => a.username === username && a.password === password) ||
  null;

export const getAdminById = (id) => ADMINS.find((a) => a.id === id) || null;

// Convenience helper for permission checks throughout the app:
// hasPermission(admin, "deleteOrders")
export const hasPermission = (admin, key) => !!admin?.permissions?.[key];
