// Tenants = the different stores/pages/brands orders can come from (like
// "Ali Shop", "Natural Cure Life", "Landing Page" in a multi-brand setup).
// Every order and every product belongs to a tenant. Managed from the
// Settings page; stored in localStorage so it works without a backend
// change — see backend-reference/ if you want this synced server-side too.

const KEY = "bdmart_tenants";

const DEFAULT_TENANTS = [
  { id: "t-main", name: "BDMart Main Store" },
];

export const getTenants = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(stored) && stored.length ? stored : DEFAULT_TENANTS;
  } catch {
    return DEFAULT_TENANTS;
  }
};

const save = (list) => localStorage.setItem(KEY, JSON.stringify(list));

export const addTenant = (name) => {
  const list = getTenants();
  const tenant = { id: `t-${Date.now()}`, name };
  save([...list, tenant]);
  return tenant;
};

export const removeTenant = (id) => {
  save(getTenants().filter((t) => t.id !== id));
};

export const getTenantById = (id) => getTenants().find((t) => t.id === id) || null;
