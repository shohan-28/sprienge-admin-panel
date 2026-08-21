// Central list of admin accounts.
// To add a new admin later: add a VITE_ADMIN4_* set of env vars (or hardcode)
// and push one more object below — everything else (assignment, avatars,
// "who edited this order" labels) picks it up automatically.
//
// `canManageCourier` is the permission gate for Steadfast actions (Create
// Parcel / Retry / Re-create). Only admins with this set to true can trigger
// them — see OrderDetails.jsx and Orders.jsx, which check `admin.canManageCourier`
// before showing/enabling those buttons. Everyone else sees the courier
// status read-only.

const avatarFor = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=EA580C,0F172A&fontFamily=Inter`;

export const ADMINS = [
  {
    id: "admin-1",
    username: import.meta.env.VITE_ADMIN1_USER || "admin",
    password: import.meta.env.VITE_ADMIN1_PASS || "admin123",
    name: import.meta.env.VITE_ADMIN1_NAME || "Rahim Uddin",
    role: "Super Admin",
    canManageCourier: false,
    avatar: avatarFor(import.meta.env.VITE_ADMIN1_NAME || "Rahim Uddin"),
  },
  {
    id: "admin-2",
    username: import.meta.env.VITE_ADMIN2_USER || "karim",
    password: import.meta.env.VITE_ADMIN2_PASS || "karim123",
    name: import.meta.env.VITE_ADMIN2_NAME || "Karim Hossain",
    role: "Admin",
    canManageCourier: false,
    avatar: avatarFor(import.meta.env.VITE_ADMIN2_NAME || "Karim Hossain"),
  },
  {
    id: "admin-3",
    username: import.meta.env.VITE_ADMIN3_USER || "courier",
    password: import.meta.env.VITE_ADMIN3_PASS || "courier123",
    name: import.meta.env.VITE_ADMIN3_NAME || "Sabbir Ahmed",
    role: "Courier Manager",
    canManageCourier: true,
    avatar: avatarFor(import.meta.env.VITE_ADMIN3_NAME || "Sabbir Ahmed"),
  },
];

export const findAdminByCredentials = (username, password) =>
  ADMINS.find((a) => a.username === username && a.password === password) ||
  null;

export const getAdminById = (id) => ADMINS.find((a) => a.id === id) || null;
