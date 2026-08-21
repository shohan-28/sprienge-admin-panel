// Product catalog for the "Create Order" screen's product picker.
//
// The current backend has no Product model — orders just carry a raw
// items array. Rather than block product management on a backend change,
// the catalog lives here in localStorage (same pattern as assignments.js)
// so picking a product with its image/price when creating an order works
// today. See backend-reference/Product.model.js if you'd rather move this
// server-side and share it across devices/browsers.

const KEY = "bdmart_products";

const SEED = [
  {
    id: "p-1",
    name: "Sample Product",
    price: 990,
    image: "",
    sku: "",
    tenantId: "t-main",
    stock: 50,
  },
];

const readAll = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(stored) ? stored : SEED;
  } catch {
    return SEED;
  }
};

const writeAll = (list) => localStorage.setItem(KEY, JSON.stringify(list));

export const getProducts = () => readAll();

export const getProductById = (id) => readAll().find((p) => p.id === id) || null;

export const saveProduct = (product) => {
  const list = readAll();
  if (product.id) {
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...product };
      writeAll(list);
      return list[idx];
    }
  }
  const created = { ...product, id: `p-${Date.now()}` };
  writeAll([created, ...list]);
  return created;
};

export const deleteProduct = (id) => {
  writeAll(readAll().filter((p) => p.id !== id));
};

// Called when an order is placed with this product, to keep an
// approximate stock count. Not authoritative across multiple devices —
// flagged as a soft/local counter, good enough for a single-admin-PC setup.
export const decrementStock = (id, qty) => {
  const list = readAll();
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0 && typeof list[idx].stock === "number") {
    list[idx].stock = Math.max(0, list[idx].stock - qty);
    writeAll(list);
  }
};
