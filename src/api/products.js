const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  "https://sprienge-backend.onrender.com/api";

/*
==================================================
API URL
==================================================
*/

const API_URL = RAW_API_URL
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/products$/, "")
  .replace(/\/orders$/, "");

/*
==================================================
REQUEST HELPER
==================================================
*/

const request = async (
  endpoint,
  options = {}
) => {
  const cleanEndpoint =
    endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;

  const url =
    `${API_URL}${cleanEndpoint}`;

  const response = await fetch(url, {
    ...options,

    headers: {
      "Content-Type":
        "application/json",

      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `API request failed with status ${response.status}`
    );
  }

  return data;
};

/*
==================================================
NORMALIZE PRODUCT
==================================================

Old frontend code may use:

product.id

Our backend uses:

product._id
product.productId

For compatibility:

id = productId

So Order creation can continue using
numeric product.id.
==================================================
*/

const normalizeProduct = (
  product
) => {
  if (!product) {
    return null;
  }

  return {
    ...product,

    /*
    ----------------------------------------------
    COMPATIBILITY ID
    ----------------------------------------------
    */

    id:
      product.productId ??
      product.id ??
      product._id,

    /*
    ----------------------------------------------
    MONGO ID
    ----------------------------------------------
    */

    _id:
      product._id ||
      product.id ||
      null,
  };
};

/*
==================================================
GET ALL PRODUCTS
==================================================
*/

export const getProducts =
  async () => {
    const data =
      await request(
        "/products"
      );

    const products =
      Array.isArray(data)
        ? data
        : Array.isArray(
            data?.products
          )
        ? data.products
        : Array.isArray(
            data?.data
          )
        ? data.data
        : [];

    return products.map(
      normalizeProduct
    );
  };

/*
==================================================
GET SINGLE PRODUCT
==================================================
*/

export const getProductById =
  async (id) => {
    if (
      id === undefined ||
      id === null ||
      id === ""
    ) {
      return null;
    }

    const data =
      await request(
        `/products/${encodeURIComponent(
          id
        )}`
      );

    return normalizeProduct(
      data?.product ||
        data?.data ||
        data
    );
  };

/*
==================================================
GENERATE BARCODE
==================================================

Backend barcode generator
==================================================
*/

export const generateBarcode =
  async () => {
    const data =
      await request(
        "/products/barcode/generate"
      );

    return (
      data?.barcode ||
      ""
    );
  };

/*
==================================================
LOCAL FALLBACK BARCODE
==================================================

Useful if backend is temporarily
unavailable while opening form.
==================================================
*/

export const generateLocalBarcode =
  () => {
    const timestamp =
      Date.now()
        .toString()
        .slice(-9);

    const random =
      Math.floor(
        100 +
          Math.random() *
            900
      );

    return `BD${timestamp}${random}`;
  };

/*
==================================================
SAVE PRODUCT
==================================================

CREATE:
POST /api/products

UPDATE:
PUT /api/products/:id
==================================================
*/

export const saveProduct =
  async (product) => {
    if (!product) {
      throw new Error(
        "Product data is required"
      );
    }

    const payload = {
      name:
        product.name || "",

      brand:
        product.brand || "",

      category:
        product.category || "",

      price:
        Number(product.price || 0),

      oldPrice:
        Number(
          product.oldPrice || 0
        ),

      discount:
        Number(
          product.discount || 0
        ),

      stock:
        Number(
          product.stock || 0
        ),

      rating:
        Number(
          product.rating || 0
        ),

      reviews:
        Number(
          product.reviews || 0
        ),

      isNew:
        Boolean(product.isNew),

      isFeatured:
        Boolean(
          product.isFeatured
        ),

      image:
        product.image || "",

      images:
        Array.isArray(
          product.images
        )
          ? product.images
          : [],

      description:
        product.description ||
        "",

      tags:
        Array.isArray(
          product.tags
        )
          ? product.tags
          : [],

      variants:
        Array.isArray(
          product.variants
        )
          ? product.variants
          : [],

      details:
        product.details &&
        typeof product.details ===
          "object"
          ? product.details
          : {},

      sku:
        product.sku || "",

      barcode:
        product.barcode || "",

      costPrice:
        Number(
          product.costPrice || 0
        ),

      supplier:
        product.supplier || "",

      tenantId:
        product.tenantId || "",
    };

    /*
    ----------------------------------------------
    CREATE
    ----------------------------------------------
    */

    if (!product._id) {
      const data =
        await request(
          "/products",
          {
            method: "POST",

            body: JSON.stringify(
              payload
            ),
          }
        );

      return normalizeProduct(
        data?.product ||
          data?.data ||
          data
      );
    }

    /*
    ----------------------------------------------
    UPDATE
    ----------------------------------------------
    */

    const data =
      await request(
        `/products/${encodeURIComponent(
          product._id
        )}`,
        {
          method: "PUT",

          body: JSON.stringify(
            payload
          ),
        }
      );

    return normalizeProduct(
      data?.product ||
        data?.data ||
        data
    );
  };

/*
==================================================
DELETE PRODUCT
==================================================
*/

export const deleteProduct =
  async (id) => {
    if (
      id === undefined ||
      id === null ||
      id === ""
    ) {
      throw new Error(
        "Product ID is required"
      );
    }

    /*
    Prefer Mongo _id.
    Numeric productId also works
    with backend.
    */

    const data =
      await request(
        `/products/${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE",
        }
      );

    return data;
  };

/*
==================================================
ADJUST STOCK
==================================================

delta positive:
+10

delta negative:
-5

Example:

adjustStock(
  productId,
  10,
  "New stock",
  "admin"
)
==================================================
*/

export const adjustStock =
  async (
    productId,
    delta,
    reason = "",
    adminId = ""
  ) => {
    if (
      productId ===
        undefined ||
      productId === null ||
      productId === ""
    ) {
      throw new Error(
        "Product ID is required"
      );
    }

    const quantity =
      Number(delta);

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity === 0
    ) {
      throw new Error(
        "Stock delta must be a non-zero number"
      );
    }

    if (
      !Number.isInteger(
        quantity
      )
    ) {
      throw new Error(
        "Stock delta must be an integer"
      );
    }

    const data =
      await request(
        `/products/${encodeURIComponent(
          productId
        )}/stock`,
        {
          method: "PATCH",

          body: JSON.stringify({
            delta: quantity,

            reason:
              reason || "",

            adminId:
              adminId || "",
          }),
        }
      );

    return {
      ...data,

      product:
        normalizeProduct(
          data?.product
        ),
    };
  };

/*
==================================================
DECREMENT STOCK
==================================================

Compatibility function for old code.

WARNING:
Only call this when stock has NOT already
been deducted by the backend order creation.
==================================================
*/

export const decrementStock =
  async (
    productId,
    qty
  ) => {
    const quantity =
      Number(qty);

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity <= 0
    ) {
      throw new Error(
        "Invalid stock quantity"
      );
    }

    return adjustStock(
      productId,
      -quantity,
      "Order stock deduction",
      "system"
    );
  };

/*
==================================================
GET STOCK ADJUSTMENTS
==================================================
*/

export const getStockAdjustments =
  async (productId) => {
    if (
      productId ===
        undefined ||
      productId === null ||
      productId === ""
    ) {
      return [];
    }

    const data =
      await request(
        `/products/${encodeURIComponent(
          productId
        )}/stock-adjustments`
      );

    if (
      Array.isArray(
        data?.adjustments
      )
    ) {
      return data.adjustments;
    }

    if (
      Array.isArray(data?.data)
    ) {
      return data.data;
    }

    if (Array.isArray(data)) {
      return data;
    }

    return [];
  };

/*
==================================================
GET PRODUCT STOCK
==================================================
*/

export const getProductStock =
  async (productId) => {
    const product =
      await getProductById(
        productId
      );

    return Number(
      product?.stock || 0
    );
  };