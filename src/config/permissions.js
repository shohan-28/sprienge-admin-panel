
// Granular permission model. Each role is a named bundle of booleans —
// UI buttons/actions check the specific permission they need
// (`admin.permissions.deleteOrders`) instead of a single hardcoded role
// name, so adding a 4th role later (e.g. "Accountant" with only
// viewFinance + exportData) is just one more entry here.

export const ROLES = {
  SUPER_ADMIN: {
    label: "Super Admin",
    permissions: {
      viewOrders: true,
      createOrders: true,
      editOrders: true,
      deleteOrders: true,
      confirmOrders: true,
      manageCourier: true,
      approveReturns: true,
      exportData: true,
      manageProducts: true,
      manageSettings: true,
      viewFinance: true,
    },
  },

  ORDER_MANAGER: {
    label: "Order Manager",
    permissions: {
      viewOrders: true,
      createOrders: true,
      editOrders: true,
      deleteOrders: false,
      confirmOrders: true,
      manageCourier: false,
      approveReturns: true,
      exportData: true,
      manageProducts: true,
      manageSettings: false,
      viewFinance: true,
    },
  },

  COURIER_MANAGER: {
    label: "Courier Manager",
    permissions: {
      viewOrders: true,
      createOrders: true,
      editOrders: true,

      // Courier Manager can now delete orders
      deleteOrders: true,

      confirmOrders: true,
      manageCourier: true,
      approveReturns: false,
      exportData: true,
      manageProducts: false,
      manageSettings: true,
      viewFinance: false,
    },
  },
};

