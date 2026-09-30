/*
==================================================
TENANT CONFIG
==================================================

Tenant এখন আর localStorage-এ save হবে না।

সব Tenant:
Frontend
   ↓
Backend API
   ↓
MongoDB

প্রতিটি Tenant-এর:
- tenantId
- name
- logo
- active

থাকবে।
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://ourbackend.spriengge.shop/api";

const TENANT_API_URL = `${API_BASE_URL}/tenants`;

/*
==================================================
HELPERS
==================================================
*/

const getErrorMessage = (data, fallback) => {
  if (data?.message) {
    return data.message;
  }

  if (data?.error) {
    return data.error;
  }

  return fallback;
};

/*
==================================================
NORMALIZE TENANT
==================================================

Backend:
{
  tenantId: "tenant_xxx",
  name: "Ali Shop",
  logo: "",
  active: true
}

Frontend compatibility:
{
  id: "tenant_xxx",
  tenantId: "tenant_xxx",
  name: "Ali Shop",
  logo: "",
  active: true
}
*/

const normalizeTenant = (tenant) => {
  if (!tenant) {
    return null;
  }

  const tenantId =
    tenant.tenantId ||
    tenant.id ||
    tenant._id ||
    "";

  return {
    ...tenant,

    id: tenantId,

    tenantId,

    name: tenant.name || "",

    logo: tenant.logo || "",

    active:
      tenant.active !== undefined
        ? Boolean(tenant.active)
        : true,
  };
};

/*
==================================================
GET ALL TENANTS
==================================================
*/

export const getTenants = async () => {
  try {
    const response = await fetch(TENANT_API_URL, {
      method: "GET",

      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Tenant list load করতে সমস্যা হয়েছে"
        )
      );
    }

    const tenants = Array.isArray(data?.tenants)
      ? data.tenants
          .map(normalizeTenant)
          .filter(Boolean)
      : [];

    return tenants;
  } catch (error) {
    console.error("getTenants ERROR:", error);

    throw error;
  }
};

/*
==================================================
GET SINGLE TENANT
==================================================
*/

export const getTenant = async (id) => {
  if (!id) {
    throw new Error("Tenant ID is required");
  }

  try {
    const response = await fetch(
      `${TENANT_API_URL}/${encodeURIComponent(id)}`,
      {
        method: "GET",

        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Tenant load করতে সমস্যা হয়েছে"
        )
      );
    }

    return normalizeTenant(data?.tenant);
  } catch (error) {
    console.error("getTenant ERROR:", error);

    throw error;
  }
};

/*
==================================================
ADD TENANT
==================================================
*/

export const addTenant = async (
  name,
  logo = ""
) => {
  const cleanName = String(name || "").trim();
  const cleanLogo = String(logo || "").trim();

  if (!cleanName) {
    throw new Error(
      "Tenant/Store name is required"
    );
  }

  try {
    const response = await fetch(
      TENANT_API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          name: cleanName,
          logo: cleanLogo,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Tenant তৈরি করতে সমস্যা হয়েছে"
        )
      );
    }

    return normalizeTenant(data?.tenant);
  } catch (error) {
    console.error("addTenant ERROR:", error);

    throw error;
  }
};

/*
==================================================
UPDATE TENANT
==================================================
*/

export const updateTenant = async (
  id,
  patch = {}
) => {
  if (!id) {
    throw new Error("Tenant ID is required");
  }

  const payload = {};

  if (patch.name !== undefined) {
    payload.name = String(
      patch.name || ""
    ).trim();
  }

  if (patch.logo !== undefined) {
    payload.logo = String(
      patch.logo || ""
    ).trim();
  }

  if (patch.active !== undefined) {
    payload.active = Boolean(
      patch.active
    );
  }

  if (
    payload.name !== undefined &&
    !payload.name
  ) {
    throw new Error(
      "Tenant name cannot be empty"
    );
  }

  try {
    const response = await fetch(
      `${TENANT_API_URL}/${encodeURIComponent(id)}`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Tenant update করতে সমস্যা হয়েছে"
        )
      );
    }

    return normalizeTenant(data?.tenant);
  } catch (error) {
    console.error(
      "updateTenant ERROR:",
      error
    );

    throw error;
  }
};

/*
==================================================
REMOVE TENANT
==================================================

Backend soft-delete করবে।

অর্থাৎ Tenant database থেকে permanently
delete হবে না।

active = false হবে।

এতে পুরোনো Product/Order-এর tenantId
ভেঙে যাবে না।
*/

export const removeTenant = async (id) => {
  if (!id) {
    throw new Error("Tenant ID is required");
  }

  try {
    const response = await fetch(
      `${TENANT_API_URL}/${encodeURIComponent(id)}`,
      {
        method: "DELETE",

        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Tenant remove করতে সমস্যা হয়েছে"
        )
      );
    }

    return normalizeTenant(data?.tenant);
  } catch (error) {
    console.error(
      "removeTenant ERROR:",
      error
    );

    throw error;
  }
};

/*
==================================================
GET TENANT BY ID
==================================================

পুরোনো code-এ getTenantById()
ব্যবহার করা হয়ে থাকলে compatibility-এর
জন্য রাখা হলো।

IMPORTANT:
এটা এখন async, কারণ data MongoDB থেকে আসছে।
==================================================
*/

export const getTenantById = async (id) => {
  if (!id) {
    return null;
  }

  try {
    return await getTenant(id);
  } catch (error) {
    console.error(
      "getTenantById ERROR:",
      error
    );

    return null;
  }
};