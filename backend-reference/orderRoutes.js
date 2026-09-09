const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/Product");

const steadfast = require("../services/steadfastService");

/*
==================================================
HELPERS
==================================================
*/

const cleanString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const toPositiveInteger = (value, fallback = 1) => {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    return fallback;
  }

  return number;
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
==================================================
FIND PRODUCT
==================================================
*/

const findProduct = async (productId) => {
  const numericProductId = Number(productId);

  if (!Number.isFinite(numericProductId)) {
    return null;
  }

  return Product.findOne({
    productId: numericProductId,
  });
};

/*
==================================================
FIND VARIANT
==================================================
*/

const findVariant = (product, item) => {
  if (!product || !Array.isArray(product.variants)) {
    return null;
  }

  const variantId = cleanString(item.variantId);

  if (variantId) {
    const variant = product.variants.find(
      (v) => String(v.variantId) === variantId
    );

    if (variant) {
      return variant;
    }
  }

  const color = cleanString(item.selectedColor);

  if (color) {
    return product.variants.find(
      (v) =>
        cleanString(v.color).toLowerCase() ===
        color.toLowerCase()
    );
  }

  return null;
};

/*
==================================================
GET ACTUAL PRODUCT PRICE
==================================================
*/

const getActualPrice = (product, variant) => {
  if (variant && Number(variant.price) >= 0) {
    return Number(variant.price);
  }

  return Number(product.price || 0);
};

/*
==================================================
VALIDATE STOCK
==================================================
*/

const validateStock = (product, variant, selectedSize, quantity) => {
  const size = cleanString(selectedSize);

  /*
  Variant with sizes
  */
  if (
    variant &&
    Array.isArray(variant.sizes) &&
    variant.sizes.length > 0
  ) {
    if (!size) {
      return {
        valid: false,
        message: `Size is required for ${product.name}`,
      };
    }

    const sizeData = variant.sizes.find(
      (item) => cleanString(item.size) === size
    );

    if (!sizeData) {
      return {
        valid: false,
        message: `Size ${size} is not available for ${product.name}`,
      };
    }

    if (Number(sizeData.stock) < quantity) {
      return {
        valid: false,
        message: `Insufficient stock for ${product.name} - ${size}`,
      };
    }

    return {
      valid: true,
      type: "size",
      sizeData,
    };
  }

  /*
  Variant without sizes
  */
  if (variant) {
    if (Number(variant.stock) < quantity) {
      return {
        valid: false,
        message: `Insufficient stock for ${product.name}`,
      };
    }

    return {
      valid: true,
      type: "variant",
    };
  }

  /*
  Product stock
  */
  if (Number(product.stock) < quantity) {
    return {
      valid: false,
      message: `Insufficient stock for ${product.name}`,
    };
  }

  return {
    valid: true,
    type: "product",
  };
};

/*
==================================================
DECREASE STOCK
==================================================
*/

const decreaseProductStock = async (
  product,
  variant,
  selectedSize,
  quantity
) => {
  const size = cleanString(selectedSize);

  /*
  Size stock
  */
  if (
    variant &&
    Array.isArray(variant.sizes) &&
    variant.sizes.length > 0
  ) {
    const sizeData = variant.sizes.find(
      (item) => cleanString(item.size) === size
    );

    if (!sizeData) {
      throw new Error(
        `Size ${size} was not found for ${product.name}`
      );
    }

    if (Number(sizeData.stock) < quantity) {
      throw new Error(
        `Insufficient stock for ${product.name} - ${size}`
      );
    }

    sizeData.stock -= quantity;

    await product.save();

    return;
  }

  /*
  Variant stock
  */
  if (variant) {
    if (Number(variant.stock) < quantity) {
      throw new Error(
        `Insufficient stock for ${product.name}`
      );
    }

    variant.stock -= quantity;

    await product.save();

    return;
  }

  /*
  Product stock
  */
  if (Number(product.stock) < quantity) {
    throw new Error(
      `Insufficient stock for ${product.name}`
    );
  }

  product.stock -= quantity;

  await product.save();
};

/*
==================================================
NORMALIZE ORDER ITEMS
==================================================
*/

const buildOrderItems = async (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("At least one order item is required");
  }

  const normalizedItems = [];

  for (const item of rawItems) {
    const productId = Number(item.productId);

    if (!Number.isFinite(productId)) {
      throw new Error("Invalid productId");
    }

    const quantity = toPositiveInteger(item.quantity);

    const product = await findProduct(productId);

    if (!product) {
      throw new Error(
        `Product ${productId} was not found`
      );
    }

    const variant = findVariant(product, item);

    const selectedColor =
      cleanString(item.selectedColor) ||
      cleanString(variant?.color);

    const selectedColorCode =
      cleanString(item.selectedColorCode) ||
      cleanString(variant?.colorCode);

    const selectedSize =
      cleanString(item.selectedSize);

    /*
    Validate variant if frontend selected one
    */
    if (
      cleanString(item.variantId) &&
      !variant
    ) {
      throw new Error(
        `Variant ${item.variantId} was not found for ${product.name}`
      );
    }

    /*
    Validate stock
    */
    const stockCheck = validateStock(
      product,
      variant,
      selectedSize,
      quantity
    );

    if (!stockCheck.valid) {
      throw new Error(stockCheck.message);
    }

    /*
    Actual price from MongoDB
    */
    const price = getActualPrice(
      product,
      variant
    );

    const subtotal = price * quantity;

    normalizedItems.push({
      product: product._id,

      productId: product.productId,

      productName: product.name,

      productImage:
        variant?.images?.[0] ||
        product.image ||
        product.images?.[0] ||
        "",

      variantId:
        cleanString(item.variantId) ||
        cleanString(variant?.variantId),

      selectedColor,

      selectedColorCode,

      selectedSize,

      price,

      quantity,

      subtotal,
    });
  }

  return normalizedItems;
};

/*
==================================================
DELIVERY CHARGE
==================================================
*/

const calculateDeliveryCharge = (
  district,
  frontendDeliveryCharge
) => {
  const normalizedDistrict =
    cleanString(district).toLowerCase();

  /*
  Backend decides delivery charge.
  Dhaka = 60
  Outside Dhaka = 100
  */

  if (normalizedDistrict === "dhaka") {
    return 60;
  }

  /*
  Admin-created order may intentionally provide
  a custom delivery charge.
  */
  if (
    frontendDeliveryCharge !== undefined &&
    frontendDeliveryCharge !== null
  ) {
    const customCharge = Number(
      frontendDeliveryCharge
    );

    if (
      Number.isFinite(customCharge) &&
      customCharge >= 0
    ) {
      return customCharge;
    }
  }

  return 100;
};

/*
==================================================
CREATE ORDER
==================================================
*/

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const name = cleanString(body.name);
    const phone = cleanString(body.phone);
    const district = cleanString(body.district);
    const thana = cleanString(body.thana);
    const address = cleanString(body.address);
    const note = cleanString(body.note);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    /*
    Support both:
    items: []
    and old single-product payload
    */

    let rawItems = Array.isArray(body.items)
      ? body.items
      : [];

    if (rawItems.length === 0 && body.productId) {
      rawItems = [
        {
          productId: body.productId,
          productName: body.productName,
          productImage: body.productImage,
          variantId: body.variantId,
          selectedColor: body.selectedColor,
          selectedColorCode: body.selectedColorCode,
          selectedSize: body.selectedSize,
          quantity: body.quantity || 1,
        },
      ];
    }

    if (rawItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No products found in order",
      });
    }

    /*
    Build items from MongoDB.
    Frontend price is NOT trusted.
    */
    const items = await buildOrderItems(rawItems);

    const subtotal = items.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    const additionalDiscount = Math.max(
      0,
      toNumber(body.additionalDiscount, 0)
    );

    const deliveryCharge =
      calculateDeliveryCharge(
        district,
        body.deliveryCharge
      );

    const advanceAmount = Math.max(
      0,
      toNumber(body.advanceAmount, 0)
    );

    const totalBeforeDiscount =
      subtotal + deliveryCharge;

    const total = Math.max(
      0,
      totalBeforeDiscount - additionalDiscount
    );

    /*
    Backward-compatible single product fields
    */
    const firstItem = items[0];

    const order = new Order({
      name,
      phone,
      district,
      thana,
      address,
      note,

      product: firstItem.product,
      productId: firstItem.productId,
      productName: firstItem.productName,
      productImage: firstItem.productImage,

      variantId: firstItem.variantId,
      selectedColor: firstItem.selectedColor,
      selectedColorCode: firstItem.selectedColorCode,
      selectedSize: firstItem.selectedSize,

      price: firstItem.price,
      quantity: firstItem.quantity,

      items,

      subtotal,
      deliveryCharge,
      additionalDiscount,
      advanceAmount,
      total,

      paymentMethod:
        cleanString(body.paymentMethod) ||
        "cod",

      paymentStatus:
        cleanString(body.paymentStatus) ||
        "pending",

      status: "pending",

      source:
        cleanString(body.source) ||
        "website",

      orderSource:
        cleanString(body.orderSource) ||
        "website",

      landingPageId:
        cleanString(body.landingPageId),

      tenantId:
        cleanString(body.tenantId),

      officeOrderNote:
        cleanString(body.officeOrderNote),

      createdBy:
        body.createdBy || null,
    });

    /*
    Save order first
    */
    await order.save();

    /*
    Decrease stock exactly once.
    */
    try {
      for (const item of items) {
        const product = await findProduct(
          item.productId
        );

        if (!product) {
          throw new Error(
            `Product ${item.productId} disappeared before stock update`
          );
        }

        const variant = findVariant(
          product,
          item
        );

        await decreaseProductStock(
          product,
          variant,
          item.selectedSize,
          item.quantity
        );
      }
    } catch (stockError) {
      /*
      Order already exists but stock update failed.
      Mark order cancelled so it isn't treated as
      a normal active order.
      */

      order.status = "cancelled";
      order.note =
        `${order.note ? `${order.note} | ` : ""}` +
        `Stock update failed: ${stockError.message}`;

      await order.save();

      return res.status(409).json({
        success: false,
        message: stockError.message,
        order,
      });
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (err) {
    console.error(
      "CREATE ORDER ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
==================================================
GET ALL ORDERS
==================================================
*/

router.get("/", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("product")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error(
      "GET ORDERS ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
==================================================
GET SINGLE ORDER
==================================================
*/

router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(
      req.params.id
    ).populate("product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json(order);
  } catch (err) {
    console.error(
      "GET SINGLE ORDER ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
==================================================
UPDATE ORDER
==================================================
*/

router.put("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const allowedFields = [
      "name",
      "phone",
      "district",
      "thana",
      "address",
      "note",
      "deliveryCharge",
      "additionalDiscount",
      "advanceAmount",
      "paymentMethod",
      "paymentStatus",
      "status",
      "source",
      "orderSource",
      "landingPageId",
      "tenantId",
      "officeOrderNote",
      "returnReason",
      "refundAmount",
      "refundStatus",
      "printStatus",
      "printedAt",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        updateData[field] =
          req.body[field];
      }
    }

    /*
    Items update
    */

    if (Array.isArray(req.body.items)) {
      const oldOrder = await Order.findById(
        req.params.id
      );

      if (!oldOrder) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      /*
      We allow customer/item information editing
      from admin, but prices are revalidated from
      Product.
      */

      const normalizedItems =
        await buildOrderItems(
          req.body.items
        );

      updateData.items =
        normalizedItems;

      const subtotal =
        normalizedItems.reduce(
          (sum, item) =>
            sum + item.subtotal,
          0
        );

      updateData.subtotal =
        subtotal;

      const deliveryCharge =
        Number.isFinite(
          Number(req.body.deliveryCharge)
        )
          ? Number(
              req.body.deliveryCharge
            )
          : oldOrder.deliveryCharge;

      const additionalDiscount =
        Math.max(
          0,
          toNumber(
            req.body.additionalDiscount,
            oldOrder.additionalDiscount ||
              0
          )
        );

      updateData.deliveryCharge =
        deliveryCharge;

      updateData.additionalDiscount =
        additionalDiscount;

      updateData.total = Math.max(
        0,
        subtotal +
          deliveryCharge -
          additionalDiscount
      );

      /*
      Backward compatibility
      */
      const firstItem =
        normalizedItems[0];

      if (firstItem) {
        updateData.product =
          firstItem.product;

        updateData.productId =
          firstItem.productId;

        updateData.productName =
          firstItem.productName;

        updateData.productImage =
          firstItem.productImage;

        updateData.variantId =
          firstItem.variantId;

        updateData.selectedColor =
          firstItem.selectedColor;

        updateData.selectedColorCode =
          firstItem.selectedColorCode;

        updateData.selectedSize =
          firstItem.selectedSize;

        updateData.price =
          firstItem.price;

        updateData.quantity =
          firstItem.quantity;
      }
    }

    const updated =
      await Order.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      ).populate("product");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json(updated);
  } catch (err) {
    console.error(
      "UPDATE ORDER ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
==================================================
UPDATE STATUS
==================================================
*/

router.patch("/:id/status", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const allowedStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "returned",
      "cancelled",
      "duplicate",
    ];

    const status =
      cleanString(req.body.status);

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order =
      await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json(order);
  } catch (err) {
    console.error(
      "STATUS UPDATE ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
==================================================
DELETE ORDER
==================================================
*/

router.delete("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const deleted =
      await Order.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err) {
    console.error(
      "DELETE ORDER ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
==================================================
CONFIRM ORDER
==================================================
*/

router.post("/:id/confirm", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order =
      await Order.findById(
        req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = "confirmed";

    await order.save();

    /*
    Optional parcel creation
    */
    if (
      req.body.createParcel &&
      order.courierStatus !== "created"
    ) {
      try {
        const result =
          await steadfast.createParcel(
            order
          );

        const consignment =
          result?.consignment || {};

        order.courier =
          "steadfast";

        order.courierStatus =
          "created";

        order.consignmentId =
          consignment.consignment_id ||
          null;

        order.trackingCode =
          consignment.tracking_code ||
          null;

        order.parcelCreatedAt =
          new Date();

        order.parcelError = null;

        order.courierHistory.push({
          status: "created",
          note: "Parcel created",
          at: new Date(),
        });

        await order.save();
      } catch (courierErr) {
        order.courierStatus =
          "failed";

        order.parcelError =
          courierErr.message;

        order.courierHistory.push({
          status: "failed",
          note: courierErr.message,
          at: new Date(),
        });

        await order.save();
      }
    }

    res.json({
      success: true,
      message: "Order confirmed",
      order,
    });
  } catch (err) {
    console.error(
      "CONFIRM ORDER ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/*
==================================================
CREATE / RETRY STEADFAST PARCEL
==================================================
*/

router.post(
  "/:id/create-parcel",
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      /*
      Already created
      */
      if (
        order.courierStatus ===
          "created" &&
        !req.body.force
      ) {
        return res.json({
          success: true,
          message:
            "Parcel already created",
          order,
        });
      }

      try {
        const result =
          await steadfast.createParcel(
            order
          );

        const consignment =
          result?.consignment || {};

        order.courier =
          "steadfast";

        order.courierStatus =
          "created";

        order.consignmentId =
          consignment.consignment_id ||
          null;

        order.trackingCode =
          consignment.tracking_code ||
          null;

        order.parcelCreatedAt =
          new Date();

        order.parcelError = null;

        order.courierHistory.push({
          status: req.body.force
            ? "recreated"
            : "created",
          note: req.body.force
            ? "Parcel recreated"
            : "Parcel created",
          at: new Date(),
        });

        await order.save();

        return res.json({
          success: true,
          message:
            "Steadfast parcel created successfully",
          order,
        });
      } catch (courierErr) {
        order.courierStatus =
          "failed";

        order.parcelError =
          courierErr.message;

        order.courierHistory.push({
          status: "failed",
          note: courierErr.message,
          at: new Date(),
        });

        await order.save();

        return res.status(502).json({
          success: false,
          message:
            courierErr.message,
          order,
        });
      }
    } catch (err) {
      console.error(
        "CREATE PARCEL ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/*
==================================================
STEADFAST WEBHOOK
==================================================
IMPORTANT:
This route must come BEFORE
/:id/fraud-check type routes if necessary.
==================================================
*/

router.post(
  "/steadfast/webhook",
  async (req, res) => {
    try {
      const {
        consignment_id,
        status,
        tracking_code,
        note,
      } = req.body;

      if (!consignment_id) {
        return res.status(400).json({
          success: false,
          message:
            "Missing consignment_id",
        });
      }

      const order =
        await Order.findOne({
          consignmentId:
            String(consignment_id),
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found for consignment",
        });
      }

      order.courierStatus =
        cleanString(status);

      if (tracking_code) {
        order.trackingCode =
          String(tracking_code);
      }

      order.courierHistory.push({
        status:
          cleanString(status),
        note:
          cleanString(note),
        at: new Date(),
      });

      /*
      Sync some courier statuses
      with internal order status.
      */
      const courierStatus =
        cleanString(status).toLowerCase();

      if (
        courierStatus ===
        "delivered"
      ) {
        order.status =
          "delivered";
      }

      if (
        courierStatus ===
        "cancelled"
      ) {
        order.status =
          "cancelled";
      }

      if (
        courierStatus ===
        "returned"
      ) {
        order.status =
          "returned";
      }

      await order.save();

      res.json({
        success: true,
        message:
          "Webhook processed",
      });
    } catch (err) {
      console.error(
        "STEADFAST WEBHOOK ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

/*
==================================================
FRAUD CHECK
==================================================
GET
/api/orders/fraud-check/01712345678
==================================================
*/

router.get(
  "/fraud-check/:phone",
  async (req, res) => {
    try {
      const phone =
        cleanString(
          req.params.phone
        );

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number is required",
        });
      }

      const data =
        await steadfast.getFraudCheck(
          phone
        );

      res.json(data);
    } catch (err) {
      console.error(
        "FRAUD CHECK ERROR:",
        err
      );

      res.status(502).json({
        success: false,
        message: err.message,
      });
    }
  }
);

module.exports = router;