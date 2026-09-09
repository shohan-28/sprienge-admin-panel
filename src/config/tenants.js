// Tenants = the different stores/pages/brands orders can come from (like
// "Ali Shop", "Natural Cure Life", "Landing Page" in a multi-brand setup).
// Every order and every product belongs to a tenant. Each tenant can carry
// its own logo, so invoices/labels print with the right branding when a
// tenant is selected — falls back to the global brand in Settings when a
// tenant has no logo of its own.
//
// Managed from the Settings page; stored in localStorage so it works
// without a backend change — see the backend project if you want this
// synced server-side too.

const KEY = "bdmart_tenants";

const DEFAULT_TENANTS = [{ id: "t-main", name: "BDMart Main Store", logo: "" }];

export const getTenants = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(stored) && stored.length ? stored : DEFAULT_TENANTS;
  } catch {
    return DEFAULT_TENANTS;
  }
};

const save = (list) => localStorage.setItem(KEY, JSON.stringify(list));

export const addTenant = (name, logo = "") => {
  const list = getTenants();
  const tenant = { id: `t-${Date.now()}`, name, logo };
  save([...list, tenant]);
  return tenant;
};

export const updateTenant = (id, patch) => {
  const list = getTenants().map((t) => (t.id === id ? { ...t, ...patch } : t));
  save(list);
};

export const removeTenant = (id) => {
  save(getTenants().filter((t) => t.id !== id));
};

export const getTenantById = (id) => getTenants().find((t) => t.id === id) || null;
