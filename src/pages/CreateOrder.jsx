import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  AlertTriangle,
  Loader2,
  ShoppingCart,
  X,
  Save,
  Check,
  Palette,
  Ruler,
  AlertCircle,
  CheckCircle2,
  FileText,
  List,
  Settings2,
  Truck,
  RotateCcw,
  ShieldCheck,
  Info,
} from "lucide-react";

import AdminLayout from "../layouts/AdminLayout.jsx";
import { getOrders } from "../api/orders.js";
import { getProducts, saveProduct } from "../api/products.js";
import { getTenants } from "../config/tenants.js";
import { ORDER_SOURCES } from "../config/orderSources.js";
import { useAuth } from "../context/AuthContext.jsx";
import FraudCheckPanel from "../components/FraudCheckPanel.jsx";
import api from "../api/axios.js";

const currency = (n) =>
  `৳${Number(n || 0).toLocaleString("en-BD")}`;

const createEmptyListItem = () => "";

const createEmptySpec = () => ({
  key: "",
  value: "",
});

const emptyVariant = () => ({
  variantId: `variant-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`,
  color: "",
  colorCode: "#000000",
  price: "",
  oldPrice: "",
  image: "",
  sizes: [
    {
      size: "",
      stock: "",
    },
  ],
});

const emptyNewProduct = () => ({
  name: "",
  price: "",
  oldPrice: "",
  brand: "",
  category: "",
  image: "",
  sku: "",
  stock: "",
  description: "",

  details: {
    shortDescription: "",
    overview: "",
    features: [createEmptyListItem()],
    specifications: [createEmptySpec()],
    howToUse: [createEmptyListItem()],
    careInstructions: [createEmptyListItem()],
    whatsIncluded: [createEmptyListItem()],
    deliveryInfo: "",
    returnPolicy: "",
    warranty: "",
  },

  hasVariants: true,
  variants: [emptyVariant()],
});

const CreateOrder = () => {
  // =========================================================
  // BASIC
  // =========================================================

  const { admin } = useAuth();

  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // =========================================================
  // PRODUCTS
  // =========================================================

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // =========================================================
  // CUSTOMER
  // =========================================================

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });

  // =========================================================
  // ORDER SETTINGS
  // =========================================================

  const [tenantId, setTenantId] = useState("");

  const [deliveryArea, setDeliveryArea] =
    useState("inside-dhaka");

  const [source, setSource] = useState("phone");

  const [officeOrderNote, setOfficeOrderNote] =
    useState("");

  const [advanceAmount, setAdvanceAmount] =
    useState(0);

  const [additionalDiscount, setAdditionalDiscount] =
    useState(0);

  const [deliveryCharge, setDeliveryCharge] =
    useState(60);

  const [productQuery, setProductQuery] =
    useState("");

  // =========================================================
  // CART
  // =========================================================

  const [cart, setCart] = useState([]);

  const [submitting, setSubmitting] =
    useState(false);

  // =========================================================
  // CUSTOMER CHECK
  // =========================================================

  const [repeatCount, setRepeatCount] =
    useState(null);

  const [duplicateTodayCount, setDuplicateTodayCount] =
    useState(0);

  // =========================================================
  // NEW PRODUCT
  // =========================================================

  const [showNewProduct, setShowNewProduct] =
    useState(false);

  const [newProduct, setNewProduct] =
    useState(emptyNewProduct());

  const [savingProduct, setSavingProduct] =
    useState(false);

  // =========================================================
  // VARIANT SELECTOR
  // =========================================================

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [selectedVariant, setSelectedVariant] =
    useState(null);

  const [selectedSize, setSelectedSize] =
    useState(null);

  const [showVariantSelector, setShowVariantSelector] =
    useState(false);

  // =========================================================
  // DELETE PRODUCT
  // =========================================================

  const [productToDelete, setProductToDelete] =
    useState(null);

  const [deletingProduct, setDeletingProduct] =
    useState(false);

  // =========================================================
  // STATUS MODAL
  // =========================================================

  const [statusModal, setStatusModal] =
    useState(null);

  // =========================================================
  // LOAD TENANTS
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadTenants = async () => {
      setTenantsLoading(true);

      try {
        const data = await getTenants();
        const tenantList = Array.isArray(data) ? data : [];

        if (!mounted) return;

        setTenants(tenantList);

        setTenantId((currentId) => {
          const currentExists = tenantList.some((tenant) => {
            const id =
              tenant?._id ||
              tenant?.id ||
              tenant?.tenantId;

            return String(id || "") === String(currentId || "");
          });

          if (currentExists) return currentId;

          const firstTenant = tenantList[0];

          return (
            firstTenant?._id ||
            firstTenant?.id ||
            firstTenant?.tenantId ||
            ""
          );
        });
      } catch (error) {
        console.error(
          "CreateOrder - Failed to load tenants:",
          error
        );

        if (mounted) {
          setTenants([]);
          setTenantId("");
        }
      } finally {
        if (mounted) {
          setTenantsLoading(false);
        }
      }
    };

    loadTenants();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      setProductsLoading(true);

      try {
        const data = await getProducts();

        if (!mounted) return;

        setProducts(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        console.error(
          "CreateOrder - Failed to load products:",
          error
        );

        if (mounted) {
          setProducts([]);
        }
      } finally {
        if (mounted) {
          setProductsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // FILTER PRODUCTS
  // =========================================================

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) {
      return [];
    }

    const selectedTenantId = String(tenantId || "").trim();

    if (!selectedTenantId) {
      return [];
    }

    const inTenant = products.filter((p) => {
      const productTenantId = String(
        p?.tenantId || ""
      ).trim();

      return productTenantId === selectedTenantId;
    });

    const query = productQuery
      .trim()
      .toLowerCase();

    if (!query) {
      return inTenant;
    }

    return inTenant.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const brand = String(p.brand || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();

      return (
        name.includes(query) ||
        brand.includes(query) ||
        sku.includes(query)
      );
    });
  }, [products, productQuery, tenantId]);

  // =========================================================
  // PRODUCT ID
  // =========================================================

  const getProductId = (product) => {
    if (!product) return null;

    return (
      product.productId ??
      product.id ??
      product._id ??
      null
    );
  };

  // =========================================================
  // MONGODB ID
  // =========================================================

  const getMongoProductId = (product) => {
    if (!product) return null;

    return product._id || null;
  };

  // =========================================================
  // VARIANT STOCK
  // =========================================================

  const getVariantStock = (variant) => {
    if (!variant) return 0;

    if (
      Array.isArray(variant.sizes) &&
      variant.sizes.length > 0
    ) {
      return variant.sizes.reduce(
        (sum, size) =>
          sum + Number(size.stock || 0),
        0
      );
    }

    return Number(variant.stock || 0);
  };

  // =========================================================
  // SIZE STOCK
  // =========================================================

  const getSizeStock = (size) => {
    if (!size) return 0;

    return Number(size.stock || 0);
  };

  // =========================================================
  // PRODUCT TOTAL STOCK
  // =========================================================

  const getProductAvailableStock = (product) => {
    if (!product) return 0;

    const variants = Array.isArray(
      product.variants
    )
      ? product.variants
      : [];

    if (variants.length > 0) {
      return variants.reduce(
        (sum, variant) =>
          sum + getVariantStock(variant),
        0
      );
    }

    return Number(product.stock || 0);
  };

  // =========================================================
  // PRODUCT CLICK
  // =========================================================

  const handleProductClick = (product) => {
    if (!product) return;

    const productId = getProductId(product);

    if (!productId) {
      setStatusModal({
        type: "error",
        title: "Product ID পাওয়া যায়নি",
        message:
          "এই product-এর valid ID পাওয়া যায়নি।",
      });

      return;
    }

    const variants = Array.isArray(
      product.variants
    )
      ? product.variants
      : [];

    if (variants.length > 0) {
      if (
        getProductAvailableStock(product) <= 0
      ) {
        setStatusModal({
          type: "error",
          title: "Stock নেই",
          message:
            "এই product-এর কোনো available stock নেই।",
        });

        return;
      }

      setSelectedProduct(product);
      setSelectedVariant(null);
      setSelectedSize(null);
      setShowVariantSelector(true);

      return;
    }

    if (Number(product.stock || 0) <= 0) {
      setStatusModal({
        type: "error",
        title: "Stock নেই",
        message:
          "এই product-এর কোনো stock নেই।",
      });

      return;
    }

    addToCart(product);
  };

  // =========================================================
  // SELECT VARIANT
  // =========================================================

  const handleVariantSelect = (variant) => {
    if (!variant) return;

    if (getVariantStock(variant) <= 0) {
      return;
    }

    setSelectedVariant(variant);
    setSelectedSize(null);
  };

  // =========================================================
  // SELECT SIZE
  // =========================================================

  const handleSizeSelect = (size) => {
    if (!size) return;

    if (Number(size.stock || 0) <= 0) {
      return;
    }

    setSelectedSize(size);
  };

  // =========================================================
  // CLOSE VARIANT MODAL
  // =========================================================

  const closeVariantSelector = () => {
    setShowVariantSelector(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setSelectedSize(null);
  };

  // =========================================================
  // ADD NORMAL PRODUCT
  // =========================================================

  const addToCart = (product) => {
    if (!product) return;

    const productId = getProductId(product);

    if (!productId) {
      setStatusModal({
        type: "error",
        title: "Product ID পাওয়া যায়নি",
        message:
          "এই product-এর valid ID পাওয়া যায়নি।",
      });

      return;
    }

    const stock = Number(product.stock || 0);

    if (stock <= 0) {
      setStatusModal({
        type: "error",
        title: "Stock নেই",
        message:
          "এই product-এর stock নেই।",
      });

      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          String(item.productId) ===
            String(productId) &&
          !item.variantId &&
          !item.size
      );

      if (existing) {
        if (existing.quantity >= stock) {
          return prev;
        }

        return prev.map((item) =>
          String(item.productId) ===
              String(productId) &&
            !item.variantId &&
            !item.size
            ? {
                ...item,
                quantity:
                  Number(item.quantity || 0) + 1,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          productId,
          variantId: "",
          color: "",
          colorCode: "",
          size: "",
          name: product.name || "",
          image: product.image || "",
          price: Number(product.price || 0),
          quantity: 1,
        },
      ];
    });
  };

  // =========================================================
  // ADD VARIANT TO CART
  // =========================================================

  const addVariantToCart = (
    product,
    variant,
    size
  ) => {
    if (!product || !variant) return;

    const productId = getProductId(product);

    const variantId =
      variant.variantId ||
      "";

    const color =
      variant.color || "";

    const colorCode =
      variant.colorCode || "";

    const sizeName =
      size?.size || "";

    const price =
      Number(variant.price) > 0
        ? Number(variant.price)
        : Number(product.price || 0);

    const image =
      Array.isArray(variant.images) &&
      variant.images.length > 0
        ? variant.images[0]
        : variant.image ||
          product.image ||
          "";

    const availableStock = size
      ? getSizeStock(size)
      : getVariantStock(variant);

    if (availableStock <= 0) {
      setStatusModal({
        type: "error",
        title: "Stock নেই",
        message:
          "এই variant-এর stock নেই।",
      });

      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          String(item.productId) ===
            String(productId) &&
          String(item.variantId || "") ===
            String(variantId || "") &&
          String(item.size || "") ===
            String(sizeName || "")
      );

      if (existing) {
        if (
          Number(existing.quantity || 0) >=
          availableStock
        ) {
          return prev;
        }

        return prev.map((item) =>
          String(item.productId) ===
              String(productId) &&
            String(item.variantId || "") ===
              String(variantId || "") &&
            String(item.size || "") ===
              String(sizeName || "")
            ? {
                ...item,
                quantity:
                  Number(item.quantity || 0) + 1,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          productId,
          variantId,
          color,
          colorCode,
          size: sizeName,
          name: product.name || "",
          image,
          price,
          quantity: 1,
        },
      ];
    });
  };

  // =========================================================
  // CONFIRM VARIANT
  // =========================================================

  const confirmVariantSelection = () => {
    if (!selectedProduct) return;

    if (!selectedVariant) {
      setStatusModal({
        type: "error",
        title: "Color নির্বাচন করুন",
        message:
          "Cart-এ যোগ করার আগে একটি Color নির্বাচন করুন।",
      });

      return;
    }

    const hasSizes =
      Array.isArray(selectedVariant.sizes) &&
      selectedVariant.sizes.length > 0;

    if (hasSizes && !selectedSize) {
      setStatusModal({
        type: "error",
        title: "Size নির্বাচন করুন",
        message:
          "এই variant-এর জন্য একটি Size নির্বাচন করুন।",
      });

      return;
    }

    if (
      hasSizes &&
      selectedSize &&
      getSizeStock(selectedSize) <= 0
    ) {
      setStatusModal({
        type: "error",
        title: "Stock নেই",
        message:
          "নির্বাচিত Size-এর stock নেই।",
      });

      return;
    }

    if (
      !hasSizes &&
      getVariantStock(selectedVariant) <= 0
    ) {
      setStatusModal({
        type: "error",
        title: "Stock নেই",
        message:
          "নির্বাচিত Color-এর stock নেই।",
      });

      return;
    }

    addVariantToCart(
      selectedProduct,
      selectedVariant,
      selectedSize
    );

    closeVariantSelector();
  };

  // =========================================================
  // NEW PRODUCT - BASIC UPDATE
  // =========================================================

  const updateNewProduct = (field, value) => {
    setNewProduct((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // =========================================================
  // UPDATE PRODUCT DETAILS FIELD
  // =========================================================

  const updateProductDetail = (
    field,
    value
  ) => {
    setNewProduct((prev) => ({
      ...prev,
      details: {
        ...(prev.details || {}),
        [field]: value,
      },
    }));
  };

  // =========================================================
  // LIST FIELD UPDATE
  // features / howToUse / careInstructions /
  // whatsIncluded
  // =========================================================

  const updateDetailListItem = (
    field,
    index,
    value
  ) => {
    setNewProduct((prev) => {
      const current =
        Array.isArray(prev.details?.[field])
          ? [...prev.details[field]]
          : [""];

      current[index] = value;

      return {
        ...prev,
        details: {
          ...(prev.details || {}),
          [field]: current,
        },
      };
    });
  };

  // =========================================================
  // ADD DETAIL LIST ITEM
  // =========================================================

  const addDetailListItem = (field) => {
    setNewProduct((prev) => {
      const current =
        Array.isArray(prev.details?.[field])
          ? [...prev.details[field]]
          : [];

      current.push("");

      return {
        ...prev,
        details: {
          ...(prev.details || {}),
          [field]: current,
        },
      };
    });
  };

  // =========================================================
  // REMOVE DETAIL LIST ITEM
  // =========================================================

  const removeDetailListItem = (
    field,
    index
  ) => {
    setNewProduct((prev) => {
      const current =
        Array.isArray(prev.details?.[field])
          ? [...prev.details[field]]
          : [];

      current.splice(index, 1);

      if (current.length === 0) {
        current.push("");
      }

      return {
        ...prev,
        details: {
          ...(prev.details || {}),
          [field]: current,
        },
      };
    });
  };

  // =========================================================
  // SPECIFICATION UPDATE
  // =========================================================

  const updateSpecification = (
    index,
    field,
    value
  ) => {
    setNewProduct((prev) => {
      const specifications = Array.isArray(
        prev.details?.specifications
      )
        ? [...prev.details.specifications]
        : [createEmptySpec()];

      specifications[index] = {
        ...(specifications[index] || {}),
        [field]: value,
      };

      return {
        ...prev,
        details: {
          ...(prev.details || {}),
          specifications,
        },
      };
    });
  };

  // =========================================================
  // ADD SPECIFICATION
  // =========================================================

  const addSpecification = () => {
    setNewProduct((prev) => {
      const specifications = Array.isArray(
        prev.details?.specifications
      )
        ? [...prev.details.specifications]
        : [];

      specifications.push(createEmptySpec());

      return {
        ...prev,
        details: {
          ...(prev.details || {}),
          specifications,
        },
      };
    });
  };

  // =========================================================
  // REMOVE SPECIFICATION
  // =========================================================

  const removeSpecification = (index) => {
    setNewProduct((prev) => {
      const specifications = Array.isArray(
        prev.details?.specifications
      )
        ? [...prev.details.specifications]
        : [];

      specifications.splice(index, 1);

      if (specifications.length === 0) {
        specifications.push(createEmptySpec());
      }

      return {
        ...prev,
        details: {
          ...(prev.details || {}),
          specifications,
        },
      };
    });
  };

  // =========================================================
  // ADD NEW VARIANT
  // =========================================================

  const addNewVariant = () => {
    setNewProduct((prev) => ({
      ...prev,
      variants: [
        ...(Array.isArray(prev.variants)
          ? prev.variants
          : []),
        emptyVariant(),
      ],
    }));
  };

  // =========================================================
  // REMOVE NEW VARIANT
  // =========================================================

  const removeNewVariant = (variantIndex) => {
    setNewProduct((prev) => {
      const variants = Array.isArray(
        prev.variants
      )
        ? [...prev.variants]
        : [];

      variants.splice(variantIndex, 1);

      return {
        ...prev,
        variants,
      };
    });
  };

  // =========================================================
  // UPDATE NEW VARIANT
  // =========================================================

  const updateNewVariant = (
    variantIndex,
    field,
    value
  ) => {
    setNewProduct((prev) => {
      const variants = Array.isArray(
        prev.variants
      )
        ? [...prev.variants]
        : [];

      variants[variantIndex] = {
        ...variants[variantIndex],
        [field]: value,
      };

      return {
        ...prev,
        variants,
      };
    });
  };

  // =========================================================
  // ADD SIZE
  // =========================================================

  const addSizeToVariant = (variantIndex) => {
    setNewProduct((prev) => {
      const variants = Array.isArray(
        prev.variants
      )
        ? [...prev.variants]
        : [];

      variants[variantIndex] = {
        ...variants[variantIndex],
        sizes: [
          ...(Array.isArray(
            variants[variantIndex]?.sizes
          )
            ? variants[variantIndex].sizes
            : []),
          {
            size: "",
            stock: "",
          },
        ],
      };

      return {
        ...prev,
        variants,
      };
    });
  };

  // =========================================================
  // REMOVE SIZE
  // =========================================================

  const removeSizeFromVariant = (
    variantIndex,
    sizeIndex
  ) => {
    setNewProduct((prev) => {
      const variants = Array.isArray(
        prev.variants
      )
        ? [...prev.variants]
        : [];

      const sizes = Array.isArray(
        variants[variantIndex]?.sizes
      )
        ? [...variants[variantIndex].sizes]
        : [];

      sizes.splice(sizeIndex, 1);

      variants[variantIndex] = {
        ...variants[variantIndex],
        sizes,
      };

      return {
        ...prev,
        variants,
      };
    });
  };

  // =========================================================
  // UPDATE SIZE
  // =========================================================

  const updateVariantSize = (
    variantIndex,
    sizeIndex,
    field,
    value
  ) => {
    setNewProduct((prev) => {
      const variants = Array.isArray(
        prev.variants
      )
        ? [...prev.variants]
        : [];

      const sizes = Array.isArray(
        variants[variantIndex]?.sizes
      )
        ? [...variants[variantIndex].sizes]
        : [];

      sizes[sizeIndex] = {
        ...sizes[sizeIndex],
        [field]: value,
      };

      variants[variantIndex] = {
        ...variants[variantIndex],
        sizes,
      };

      return {
        ...prev,
        variants,
      };
    });
  };

  // =========================================================
  // RESET NEW PRODUCT
  // =========================================================

  const resetNewProduct = () => {
    setNewProduct(emptyNewProduct());
  };

  // =========================================================
  // CLEAN LIST
  // =========================================================

  const cleanList = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) =>
        String(item ?? "").trim()
      )
      .filter(Boolean);
  };

  // =========================================================
  // BUILD SPECIFICATIONS OBJECT
  // =========================================================

  const buildSpecifications = () => {
    const rows = Array.isArray(
      newProduct.details?.specifications
    )
      ? newProduct.details.specifications
      : [];

    return Object.fromEntries(
      rows
        .map((row) => ({
          key: String(
            row?.key ?? ""
          ).trim(),
          value: String(
            row?.value ?? ""
          ).trim(),
        }))
        .filter(
          (row) =>
            row.key &&
            row.value
        )
        .map((row) => [
          row.key,
          row.value,
        ])
    );
  };

  // =========================================================
  // CREATE NEW PRODUCT
  // =========================================================

  const handleCreateProduct = async () => {
    const selectedTenantId = String(tenantId || "").trim();

    if (!selectedTenantId) {
      setStatusModal({
        type: "error",
        title: "Tenant Required",
        message:
          "নতুন Product তৈরি করার আগে একটি Tenant / Store নির্বাচন করুন।",
      });

      return;
    }

    if (
      !String(newProduct.name || "").trim()
    ) {
      setStatusModal({
        type: "error",
        title: "Product name required",
        message:
          "প্রোডাক্টের নাম আবশ্যক।",
      });

      return;
    }

    if (
      Number(newProduct.price || 0) <= 0
    ) {
      setStatusModal({
        type: "error",
        title: "Invalid price",
        message:
          "প্রোডাক্টের Base Price সঠিকভাবে দিন।",
      });

      return;
    }

    const hasVariants =
      Boolean(newProduct.hasVariants);

    let variants = [];

    if (hasVariants) {
      if (
        !Array.isArray(newProduct.variants) ||
        newProduct.variants.length === 0
      ) {
        setStatusModal({
          type: "error",
          title: "Variant required",
          message:
            "কমপক্ষে একটি Color/Variant যোগ করুন।",
        });

        return;
      }

      variants = newProduct.variants.map(
        (variant, index) => {
          const sizes = Array.isArray(
            variant.sizes
          )
            ? variant.sizes
                .filter(
                  (size) =>
                    String(
                      size?.size || ""
                    ).trim()
                )
                .map((size) => ({
                  size: String(
                    size.size || ""
                  ).trim(),

                  stock: Math.max(
                    0,
                    Number(
                      size.stock || 0
                    )
                  ),
                }))
            : [];

          const sizeStock = sizes.reduce(
            (sum, size) =>
              sum +
              Number(
                size.stock || 0
              ),
            0
          );

          const directStock =
            Number(
              variant.stock || 0
            );

          const stock =
            sizes.length > 0
              ? sizeStock
              : directStock;

          const variantPrice =
            Number(
              variant.price || 0
            ) > 0
              ? Number(
                  variant.price
                )
              : Number(
                  newProduct.price
                );

          const variantOldPrice =
            Number(
              variant.oldPrice || 0
            ) > 0
              ? Number(
                  variant.oldPrice
                )
              : Number(
                  newProduct.oldPrice || 0
                );

          return {
            variantId:
              String(
                variant.variantId ||
                  ""
              ).trim() ||
              `variant-${Date.now()}-${index}`,

            color: String(
              variant.color || ""
            ).trim(),

            colorCode:
              String(
                variant.colorCode ||
                  "#000000"
              ).trim(),

            price: variantPrice,

            oldPrice:
              variantOldPrice,

            stock,

            images: variant.image
              ? [
                  String(
                    variant.image
                  ).trim(),
                ]
              : [],

            sizes,
          };
        }
      );

      const invalidVariant =
        variants.find(
          (variant) =>
            !variant.color
        );

      if (invalidVariant) {
        setStatusModal({
          type: "error",
          title: "Color required",
          message:
            "প্রতিটি Variant-এর Color দিতে হবে।",
        });

        return;
      }

      const duplicateVariantIds =
        variants.filter(
          (variant, index, array) =>
            array.findIndex(
              (item) =>
                item.variantId ===
                variant.variantId
            ) !== index
        );

      if (
        duplicateVariantIds.length > 0
      ) {
        setStatusModal({
          type: "error",
          title: "Duplicate Variant ID",
          message:
            "প্রতিটি Variant-এর unique Variant ID থাকতে হবে।",
        });

        return;
      }

      for (
        let i = 0;
        i < variants.length;
        i++
      ) {
        const variant = variants[i];

        if (
          Array.isArray(
            variant.sizes
          ) &&
          variant.sizes.length > 0
        ) {
          const sizeNames =
            variant.sizes.map(
              (size) =>
                size.size.toLowerCase()
            );

          const duplicateSizes =
            sizeNames.some(
              (size, index) =>
                sizeNames.indexOf(
                  size
                ) !== index
            );

          if (duplicateSizes) {
            setStatusModal({
              type: "error",
              title: "Duplicate Size",
              message:
                `Color "${variant.color}"-এ একই Size একাধিকবার দেওয়া হয়েছে।`,
            });

            return;
          }
        }
      }
    }

    const specifications =
      buildSpecifications();

    const details = {
      shortDescription:
        String(
          newProduct.details
            ?.shortDescription ||
            ""
        ).trim(),

      overview:
        String(
          newProduct.details
            ?.overview || ""
        ).trim(),

      features: cleanList(
        newProduct.details
          ?.features
      ),

      specifications,

      howToUse: cleanList(
        newProduct.details
          ?.howToUse
      ),

      careInstructions:
        cleanList(
          newProduct.details
            ?.careInstructions
        ),

      whatsIncluded:
        cleanList(
          newProduct.details
            ?.whatsIncluded
        ),

      deliveryInfo:
        String(
          newProduct.details
            ?.deliveryInfo ||
            ""
        ).trim(),

      returnPolicy:
        String(
          newProduct.details
            ?.returnPolicy ||
            ""
        ).trim(),

      warranty:
        String(
          newProduct.details
            ?.warranty || ""
        ).trim(),
    };

    setSavingProduct(true);

    try {
      const variantTotalStock =
        variants.reduce(
          (sum, variant) =>
            sum +
            Number(
              variant.stock || 0
            ),
          0
        );

      const oldPrice =
        Number(
          newProduct.oldPrice || 0
        );

      const basePrice =
        Number(
          newProduct.price || 0
        );

      const discount =
        oldPrice > basePrice &&
        oldPrice > 0
          ? Math.round(
              ((oldPrice -
                basePrice) /
                oldPrice) *
                100
            )
          : 0;

      const productPayload = {
        name: String(
          newProduct.name
        ).trim(),

        brand: String(
          newProduct.brand || ""
        ).trim(),

        category: String(
          newProduct.category || ""
        ).trim(),

        price: basePrice,

        oldPrice,

        discount,

        image: String(
          newProduct.image || ""
        ).trim(),

        images: newProduct.image
          ? [
              String(
                newProduct.image
              ).trim(),
            ]
          : [],

        description:
          String(
            newProduct.description ||
              ""
          ).trim(),

        sku: String(
          newProduct.sku || ""
        ).trim(),

        tenantId: selectedTenantId,

        stock: hasVariants
          ? variantTotalStock
          : Math.max(
              0,
              Number(
                newProduct.stock || 0
              )
            ),

        variants: hasVariants
          ? variants
          : [],

        details,
      };

      const created =
        await saveProduct(
          productPayload
        );

      const updatedProducts =
        await getProducts();

      const normalizedProducts =
        Array.isArray(
          updatedProducts
        )
          ? updatedProducts
          : [];

      setProducts(
        normalizedProducts
      );

      if (created) {
        const createdProduct =
          created?.product ||
          created;

        if (
          createdProduct &&
          getProductId(
            createdProduct
          )
        ) {
          if (
            Array.isArray(
              createdProduct.variants
            ) &&
            createdProduct.variants
              .length > 0
          ) {
            const firstVariant =
              createdProduct.variants.find(
                (v) =>
                  getVariantStock(v) >
                  0
              );

            if (firstVariant) {
              const firstSize =
                Array.isArray(
                  firstVariant.sizes
                )
                  ? firstVariant.sizes.find(
                      (s) =>
                        Number(
                          s.stock ||
                            0
                        ) > 0
                    )
                  : null;

              addVariantToCart(
                createdProduct,
                firstVariant,
                firstSize
              );
            }
          } else {
            addToCart(
              createdProduct
            );
          }
        }
      }

      resetNewProduct();
      setShowNewProduct(false);

      setStatusModal({
        type: "success",
        title: "Product created",
        message:
          "প্রোডাক্ট সফলভাবে তৈরি হয়েছে এবং product list-এ যোগ হয়েছে।",
      });
    } catch (error) {
      console.error(
        "Create product error:",
        error
      );

      setStatusModal({
        type: "error",
        title: "Product create failed",
        message:
          error?.response?.data
            ?.message ||
          error?.response?.data
            ?.error ||
          error?.message ||
          "নতুন প্রোডাক্ট তৈরি করা যায়নি।",
      });
    } finally {
      setSavingProduct(false);
    }
  };

  // =========================================================
  // DELETE PRODUCT - OPEN
  // =========================================================

  const handleDeleteProductClick = (
    product,
    event
  ) => {
    event?.stopPropagation();

    if (!product) return;

    const mongoId =
      getMongoProductId(product);

    if (!mongoId) {
      setStatusModal({
        type: "error",
        title: "Delete করা যাচ্ছে না",
        message:
          "এই product-এর MongoDB _id পাওয়া যায়নি।",
      });

      return;
    }

    setProductToDelete(product);
  };

  // =========================================================
  // CLOSE DELETE
  // =========================================================

  const closeDeleteModal = () => {
    if (deletingProduct) return;

    setProductToDelete(null);
  };

  // =========================================================
  // CONFIRM DELETE
  // =========================================================

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    const mongoId =
      getMongoProductId(
        productToDelete
      );

    if (!mongoId) {
      setProductToDelete(null);

      setStatusModal({
        type: "error",
        title: "Delete failed",
        message:
          "MongoDB product ID পাওয়া যায়নি।",
      });

      return;
    }

    setDeletingProduct(true);

    try {
      const response =
        await api.delete(
          `/products/${encodeURIComponent(
            mongoId
          )}`
        );

      const data =
        response?.data;

      const deletedProductId =
        getProductId(
          productToDelete
        );

      setProducts((prev) =>
        prev.filter(
          (product) =>
            String(
              product._id || ""
            ) !==
            String(mongoId)
        )
      );

      setCart((prev) =>
        prev.filter(
          (item) =>
            String(
              item.productId
            ) !==
            String(
              deletedProductId
            )
        )
      );

      if (
        selectedProduct &&
        String(
          getProductId(
            selectedProduct
          )
        ) ===
          String(
            deletedProductId
          )
      ) {
        closeVariantSelector();
      }

      const deletedName =
        productToDelete.name ||
        "Product";

      setProductToDelete(null);

      setStatusModal({
        type: "success",
        title: "Product deleted",
        message:
          data?.message ||
          `"${deletedName}" সফলভাবে delete করা হয়েছে।`,
      });
    } catch (error) {
      console.error(
        "Delete product error:",
        error
      );

      const message =
        error?.response?.data
          ?.message ||
        error?.response?.data
          ?.error ||
        error?.message ||
        "Product delete করা যায়নি।";

      setStatusModal({
        type: "error",
        title: "Delete failed",
        message,
      });
    } finally {
      setDeletingProduct(false);
    }
  };

  // =========================================================
  // CART UPDATE
  // =========================================================

  const updateCartLine = (
    productId,
    variantId,
    size,
    field,
    value
  ) => {
    setCart((prev) =>
      prev.map((item) => {
        const sameItem =
          String(
            item.productId
          ) ===
            String(
              productId
            ) &&
          String(
            item.variantId || ""
          ) ===
            String(
              variantId || ""
            ) &&
          String(
            item.size || ""
          ) ===
            String(
              size || ""
            );

        return sameItem
          ? {
              ...item,
              [field]: value,
            }
          : item;
      })
    );
  };

  // =========================================================
  // GET CART STOCK
  // =========================================================

  const getCartItemStock = (item) => {
    if (!item) return null;

    const product =
      products.find(
        (p) =>
          String(
            getProductId(p)
          ) ===
          String(
            item.productId
          )
      );

    if (!product) return null;

    if (!item.variantId) {
      return Number(
        product.stock || 0
      );
    }

    const variants =
      Array.isArray(
        product.variants
      )
        ? product.variants
        : [];

    const variant =
      variants.find(
        (v) =>
          String(
            v.variantId || ""
          ) ===
          String(
            item.variantId || ""
          )
      );

    if (!variant) return null;

    if (item.size) {
      const sizes =
        Array.isArray(
          variant.sizes
        )
          ? variant.sizes
          : [];

      const size =
        sizes.find(
          (s) =>
            String(
              s.size || ""
            ) ===
            String(
              item.size || ""
            )
        );

      return size
        ? Number(
            size.stock || 0
          )
        : null;
    }

    return getVariantStock(
      variant
    );
  };

  // =========================================================
  // INCREASE
  // =========================================================

  const increaseCartQuantity = (
    item
  ) => {
    if (!item) return;

    const maxStock =
      getCartItemStock(item);

    if (
      maxStock !== null &&
      Number(
        item.quantity || 0
      ) >= maxStock
    ) {
      return;
    }

    updateCartLine(
      item.productId,
      item.variantId,
      item.size,
      "quantity",
      Number(
        item.quantity || 0
      ) + 1
    );
  };

  // =========================================================
  // DECREASE
  // =========================================================

  const decreaseCartQuantity = (
    item
  ) => {
    if (!item) return;

    updateCartLine(
      item.productId,
      item.variantId,
      item.size,
      "quantity",
      Math.max(
        1,
        Number(
          item.quantity || 1
        ) - 1
      )
    );
  };

  // =========================================================
  // REMOVE CART
  // =========================================================

  const removeCartLine = (
    item
  ) => {
    setCart((prev) =>
      prev.filter(
        (cartItem) =>
          !(
            String(
              cartItem.productId
            ) ===
              String(
                item.productId
              ) &&
            String(
              cartItem.variantId ||
                ""
            ) ===
              String(
                item.variantId ||
                  ""
              ) &&
            String(
              cartItem.size ||
                ""
            ) ===
              String(
                item.size ||
                  ""
              )
          )
      )
    );
  };

  // =========================================================
  // PRICING
  // =========================================================

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(
        item.price || 0
      ) *
        Number(
          item.quantity || 0
        ),
    0
  );

  const total =
    subtotal +
    Number(
      deliveryCharge || 0
    ) -
    Number(
      additionalDiscount || 0
    );

  const due =
    total -
    Number(
      advanceAmount || 0
    );

  // =========================================================
  // PHONE CHECK
  // =========================================================

  const handlePhoneChange = async (
    value
  ) => {
    const digits = String(
      value || ""
    ).replace(/\D/g, "");

    setCustomer((prev) => ({
      ...prev,
      phone: digits,
    }));

    if (digits.length !== 11) {
      setRepeatCount(null);
      setDuplicateTodayCount(0);
      return;
    }

    try {
      const response =
        await getOrders();

      const allOrders =
        Array.isArray(response)
          ? response
          : [];

      const matches =
        allOrders.filter(
          (order) =>
            String(
              order.phone || ""
            ) === digits
        );

      setRepeatCount(
        matches.length
      );

      const today =
        new Date().toDateString();

      const todayMatches =
        matches.filter(
          (order) =>
            new Date(
              order.createdAt
            ).toDateString() ===
            today
        );

      setDuplicateTodayCount(
        todayMatches.length
      );
    } catch (error) {
      console.error(
        "Repeat customer check error:",
        error
      );

      setRepeatCount(null);
      setDuplicateTodayCount(0);
    }
  };

  // =========================================================
  // SUBMIT ORDER
  // =========================================================

  const handleSubmit = async () => {
    const customerName = String(customer.name || "").trim();
    const customerPhone = String(customer.phone || "").trim();
    const customerAddress = String(customer.address || "").trim();
    const selectedTenantId = String(tenantId || "").trim();
    const safeDeliveryArea =
      deliveryArea === "outside-dhaka"
        ? "outside-dhaka"
        : "inside-dhaka";

    if (!customerName) {
      setStatusModal({
        type: "error",
        title: "Customer Name Required",
        message: "কাস্টমারের নাম দিন।",
      });
      return;
    }

    if (!/^01\d{9}$/.test(customerPhone)) {
      setStatusModal({
        type: "error",
        title: "Invalid Phone",
        message: "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নাম্বার দিন।",
      });
      return;
    }

    if (!customerAddress) {
      setStatusModal({
        type: "error",
        title: "Address Required",
        message: "কাস্টমারের সম্পূর্ণ ঠিকানা লিখুন।",
      });
      return;
    }

    if (!selectedTenantId) {
      setStatusModal({
        type: "error",
        title: "Tenant Required",
        message:
          "অর্ডার তৈরি করার আগে একটি Tenant / Store নির্বাচন করুন।",
      });
      return;
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      setStatusModal({
        type: "error",
        title: "Product Required",
        message: "কমপক্ষে একটি Product Cart-এ যোগ করুন।",
      });
      return;
    }

    for (const item of cart) {
      const maxStock = getCartItemStock(item);

      if (
        maxStock !== null &&
        Number(item.quantity || 0) > maxStock
      ) {
        const variantText = item.color
          ? ` (${item.color}${item.size ? ` / ${item.size}` : ""})`
          : "";

        setStatusModal({
          type: "error",
          title: "Insufficient Stock",
          message: `${item.name}${variantText} এর পর্যাপ্ত stock নেই। বর্তমানে ${maxStock} টি আছে।`,
        });
        return;
      }
    }

    const safeDeliveryCharge = Math.max(
      0,
      Number(deliveryCharge || 0)
    );

    const safeDiscount = Math.max(
      0,
      Number(additionalDiscount || 0)
    );

    const safeAdvance = Math.max(
      0,
      Number(advanceAmount || 0)
    );

    const calculatedTotal =
      Number(subtotal || 0) +
      safeDeliveryCharge -
      safeDiscount;

    const calculatedDue =
      calculatedTotal - safeAdvance;

    if (calculatedTotal < 0) {
      setStatusModal({
        type: "error",
        title: "Invalid Discount",
        message: "Discount-এর কারণে Order total negative হতে পারবে না।",
      });
      return;
    }

    if (calculatedDue < 0) {
      setStatusModal({
        type: "error",
        title: "Invalid Advance Amount",
        message: "Advance Amount মোট Due-এর চেয়ে বেশি হতে পারবে না।",
      });
      return;
    }

    setSubmitting(true);

    try {
      const orderItems = cart.map((item) => {
        const itemPrice = Number(item.price || 0);
        const itemQuantity = Math.max(
          1,
          Number(item.quantity || 1)
        );

        return {
          productId: Number(item.productId),
          variantId: item.variantId || "",
          selectedColor: item.color || "",
          selectedColorCode: item.colorCode || "",
          selectedSize: item.size || "",
          productName: item.name || "",
          productImage: item.image || "",
          price: itemPrice,
          quantity: itemQuantity,
          subtotal: itemPrice * itemQuantity,
        };
      });

      const payload = {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        note: String(customer.note || "").trim(),

        deliveryArea: safeDeliveryArea,

        items: orderItems,

        subtotal: Number(subtotal || 0),
        deliveryCharge: safeDeliveryCharge,
        additionalDiscount: safeDiscount,
        advanceAmount: safeAdvance,
        total: Number(calculatedDue || 0),

        status: "pending",
        source: source || "phone",
        orderSource: source || "phone",
        tenantId: selectedTenantId,
        officeOrderNote: String(officeOrderNote || "").trim(),
        createdBy: admin?.id || admin?._id || "",
      };

      console.log("CREATE ORDER PAYLOAD:", payload);

      const response = await api.post("/orders", payload);
      const data = response?.data;

      const newId =
        data?.order?._id ||
        data?.order?.id ||
        data?._id ||
        data?.id;

      if (newId) {
        window.location.href = `/orders/${newId}`;
      } else {
        window.location.href = "/orders";
      }
    } catch (error) {
      console.error("Create order error:", error);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "অর্ডার তৈরি করা যায়নি।";

      setStatusModal({
        type: "error",
        title: "Order Failed",
        message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // LIST FIELD COMPONENT
  // =========================================================

  const renderDetailList = (
    title,
    field,
    placeholder,
    icon
  ) => {
    const values =
      Array.isArray(
        newProduct.details?.[
          field
        ]
      )
        ? newProduct.details[field]
        : [""];

    return (
      <div className="rounded-xl border border-mist-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}

            <div>
              <p className="text-xs font-bold text-ink-900">
                {title}
              </p>

              <p className="text-[10px] text-slate-400">
                একাধিক item যোগ করতে পারবেন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              addDetailListItem(
                field
              )
            }
            className="flex items-center gap-1 rounded-lg border border-mist-200 bg-mist-50 px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-mist-100"
          >
            <Plus size={10} />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {values.map(
            (
              value,
              index
            ) => (
              <div
                key={`${field}-${index}`}
                className="flex items-center gap-2"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-mist-100 text-[10px] font-bold text-slate-400">
                  {index + 1}
                </span>

                <input
                  value={value}
                  onChange={(e) =>
                    updateDetailListItem(
                      field,
                      index,
                      e.target.value
                    )
                  }
                  placeholder={
                    placeholder
                  }
                  className="flex-1 rounded-lg border border-mist-200 px-2.5 py-2 text-xs outline-none focus:border-brand-500"
                />

                {values.length >
                  1 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeDetailListItem(
                        field,
                        index
                      )
                    }
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2
                      size={12}
                    />
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <AdminLayout
      title="Create Order"
      subtitle="অ্যাডমিন প্যানেল থেকে সরাসরি নতুন অর্ডার তৈরি করুন"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* ================================================= */}
        {/* LEFT */}
        {/* ================================================= */}

        <div className="space-y-5 lg:col-span-2">

          {/* ================================================= */}
          {/* CUSTOMER */}
          {/* ================================================= */}

          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 font-display text-base font-bold text-ink-900">
              কাস্টমার তথ্য
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <input
                placeholder="কাস্টমার নাম *"
                value={
                  customer.name
                }
                onChange={(e) =>
                  setCustomer(
                    (prev) => ({
                      ...prev,
                      name: e.target.value,
                    })
                  )
                }
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />

              <div>
                <input
                  placeholder="মোবাইল নাম্বার *"
                  value={
                    customer.phone
                  }
                  onChange={(e) =>
                    handlePhoneChange(
                      e.target.value
                    )
                  }
                  maxLength={11}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />

                {repeatCount !==
                  null && (
                  <p
                    className={`mt-1 text-xs ${
                      repeatCount > 0
                        ? "font-semibold text-brand-600"
                        : "text-slate-400"
                    }`}
                  >
                    {repeatCount >
                    0
                      ? `এই নাম্বারে আগে ${repeatCount} টি অর্ডার আছে — রিপিট কাস্টমার`
                      : "নতুন কাস্টমার"}
                  </p>
                )}

                {duplicateTodayCount >
                  0 && (
                  <p className="mt-1 flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-600">
                    <AlertTriangle
                      size={12}
                    />

                    আজকে এই নাম্বার থেকে
                    ইতিমধ্যে{" "}
                    {
                      duplicateTodayCount
                    }{" "}
                    টি অর্ডার এসেছে
                  </p>
                )}

                <FraudCheckPanel
                  phone={
                    customer.phone
                  }
                />
              </div>

              <textarea
                placeholder="সম্পূর্ণ ঠিকানা *"
                value={
                  customer.address
                }
                onChange={(e) =>
                  setCustomer(
                    (prev) => ({
                      ...prev,
                      address:
                        e.target.value,
                    })
                  )
                }
                rows={3}
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:col-span-2"
              />

              <textarea
                placeholder="কাস্টমার নোট (ঐচ্ছিক)"
                value={
                  customer.note
                }
                onChange={(e) =>
                  setCustomer(
                    (prev) => ({
                      ...prev,
                      note:
                        e.target.value,
                    })
                  )
                }
                rows={2}
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:col-span-2"
              />
            </div>
          </div>

          {/* ================================================= */}
          {/* PRODUCTS */}
          {/* ================================================= */}

          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">

            <div className="mb-4 flex items-center justify-between">

              <div>
                <h3 className="font-display text-base font-bold text-ink-900">
                  প্রোডাক্ট সিলেক্ট করুন
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Variant থাকা product-এ
                  click করলে Color ও Size
                  নির্বাচন করতে পারবেন
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowNewProduct(
                    (value) => !value
                  )
                }
                className="flex items-center gap-1 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100"
              >
                {showNewProduct ? (
                  <X size={13} />
                ) : (
                  <Plus size={13} />
                )}

                নতুন প্রোডাক্ট
              </button>
            </div>

            {/* ================================================= */}
            {/* NEW PRODUCT */}
            {/* ================================================= */}

            {showNewProduct && (
              <div className="mb-5 rounded-2xl border border-brand-200 bg-brand-50 p-4">

                <div className="mb-4">
                  <h4 className="text-sm font-bold text-ink-900">
                    নতুন প্রোডাক্ট তৈরি করুন
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    Product-এর basic information,
                    details, Color, Size এবং Stock
                    একসাথে সেট করতে পারবেন।
                  </p>
                </div>

                {/* ================================================= */}
                {/* BASIC PRODUCT INFO */}
                {/* ================================================= */}

                <div className="rounded-xl border border-mist-200 bg-white p-4">

                  <div className="mb-3 flex items-center gap-2">
                    <FileText
                      size={15}
                      className="text-brand-600"
                    />

                    <h4 className="text-xs font-bold text-ink-900">
                      Basic Information
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">

                    <input
                      placeholder="প্রোডাক্ট নাম *"
                      value={
                        newProduct.name
                      }
                      onChange={(e) =>
                        updateNewProduct(
                          "name",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    />

                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Base Price *"
                      value={
                        newProduct.price
                      }
                      onChange={(e) =>
                        updateNewProduct(
                          "price",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    />

                    <input
                      placeholder="Brand"
                      value={
                        newProduct.brand
                      }
                      onChange={(e) =>
                        updateNewProduct(
                          "brand",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    />

                    <input
                      placeholder="Category"
                      value={
                        newProduct.category
                      }
                      onChange={(e) =>
                        updateNewProduct(
                          "category",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    />

                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Old Price"
                      value={
                        newProduct.oldPrice
                      }
                      onChange={(e) =>
                        updateNewProduct(
                          "oldPrice",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    />

                    <input
                      placeholder="SKU (Optional)"
                      value={
                        newProduct.sku
                      }
                      onChange={(e) =>
                        updateNewProduct(
                          "sku",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    />

                    <input
                      placeholder="Product Image URL"
                      value={
                        newProduct.image
                      }
                      onChange={(e) =>
                        updateNewProduct(
                          "image",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 sm:col-span-2"
                    />

                    <textarea
                      placeholder="Product Description"
                      value={
                        newProduct.description
                      }
                      onChange={(e) =>
                        updateNewProduct(
                          "description",
                          e.target.value
                        )
                      }
                      rows={4}
                      className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 sm:col-span-2"
                    />

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-mist-200 bg-white px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={
                          newProduct.hasVariants
                        }
                        onChange={(e) =>
                          updateNewProduct(
                            "hasVariants",
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />

                      <span className="text-xs font-semibold text-slate-700">
                        এই Product-এ Variant আছে
                      </span>
                    </label>

                    {!newProduct.hasVariants && (
                      <input
                        type="number"
                        min="0"
                        placeholder="Stock"
                        value={
                          newProduct.stock
                        }
                        onChange={(e) =>
                          updateNewProduct(
                            "stock",
                            e.target.value
                          )
                        }
                        className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                      />
                    )}
                  </div>
                </div>

                {/* ================================================= */}
                {/* PRODUCT DETAILS */}
                {/* ================================================= */}

                <div className="mt-4 rounded-xl border border-mist-200 bg-white p-4">

                  <div className="mb-4 flex items-center gap-2">
                    <Info
                      size={15}
                      className="text-brand-600"
                    />

                    <div>
                      <h4 className="text-xs font-bold text-ink-900">
                        Product Details
                      </h4>

                      <p className="text-[10px] text-slate-400">
                        Product Details page-এ এগুলো দেখানো হবে
                      </p>
                    </div>
                  </div>

                  {/* SHORT DESCRIPTION */}

                  <div className="mb-3">
                    <label className="mb-1.5 block text-[11px] font-bold text-slate-600">
                      Short Description
                    </label>

                    <textarea
                      value={
                        newProduct.details
                          ?.shortDescription ||
                        ""
                      }
                      onChange={(e) =>
                        updateProductDetail(
                          "shortDescription",
                          e.target.value
                        )
                      }
                      placeholder="এক লাইনে product সম্পর্কে সংক্ষিপ্ত description..."
                      rows={2}
                      className="w-full rounded-lg border border-mist-200 px-3 py-2.5 text-xs outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* OVERVIEW */}

                  <div className="mb-3">
                    <label className="mb-1.5 block text-[11px] font-bold text-slate-600">
                      Overview
                    </label>

                    <textarea
                      value={
                        newProduct.details
                          ?.overview ||
                        ""
                      }
                      onChange={(e) =>
                        updateProductDetail(
                          "overview",
                          e.target.value
                        )
                      }
                      placeholder="Product-এর বিস্তারিত overview..."
                      rows={4}
                      className="w-full rounded-lg border border-mist-200 px-3 py-2.5 text-xs outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* FEATURES */}

                  {renderDetailList(
                    "Features",
                    "features",
                    "যেমন: Premium quality material",
                    <List
                      size={14}
                      className="text-brand-600"
                    />
                  )}

                  {/* SPECIFICATIONS */}

                  <div className="mt-3 rounded-xl border border-mist-200 bg-mist-50 p-4">

                    <div className="mb-3 flex items-center justify-between">

                      <div className="flex items-center gap-2">
                        <Settings2
                          size={14}
                          className="text-brand-600"
                        />

                        <div>
                          <p className="text-xs font-bold text-ink-900">
                            Specifications
                          </p>

                          <p className="text-[10px] text-slate-400">
                            Key এবং Value দিন
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          addSpecification
                        }
                        className="flex items-center gap-1 rounded-lg border border-mist-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-mist-100"
                      >
                        <Plus size={10} />
                        Add Spec
                      </button>
                    </div>

                    <div className="space-y-2">

                      {(Array.isArray(
                        newProduct.details
                          ?.specifications
                      )
                        ? newProduct
                            .details
                            .specifications
                        : [
                            createEmptySpec(),
                          ]
                      ).map(
                        (
                          spec,
                          index
                        ) => (
                          <div
                            key={`spec-${index}`}
                            className="grid grid-cols-[1fr_1fr_auto] gap-2"
                          >
                            <input
                              placeholder="Key (Brand)"
                              value={
                                spec?.key ||
                                ""
                              }
                              onChange={(e) =>
                                updateSpecification(
                                  index,
                                  "key",
                                  e.target
                                    .value
                                )
                              }
                              className="rounded-lg border border-mist-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-brand-500"
                            />

                            <input
                              placeholder="Value (Sony)"
                              value={
                                spec?.value ||
                                ""
                              }
                              onChange={(e) =>
                                updateSpecification(
                                  index,
                                  "value",
                                  e.target
                                    .value
                                )
                              }
                              className="rounded-lg border border-mist-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-brand-500"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeSpecification(
                                  index
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2
                                size={12}
                              />
                            </button>
                          </div>
                        )
                      )}

                    </div>

                    <p className="mt-2 text-[10px] text-slate-400">
                      Example: Brand → Sony, Model → WH-1000XM5,
                      Battery → 40 Hours
                    </p>
                  </div>

                  {/* HOW TO USE */}

                  <div className="mt-3">
                    {renderDetailList(
                      "How To Use",
                      "howToUse",
                      "ব্যবহারের ধাপ লিখুন...",
                      <Info
                        size={14}
                        className="text-brand-600"
                      />
                    )}
                  </div>

                  {/* CARE */}

                  <div className="mt-3">
                    {renderDetailList(
                      "Care Instructions",
                      "careInstructions",
                      "যেমন: Keep away from water",
                      <ShieldCheck
                        size={14}
                        className="text-brand-600"
                      />
                    )}
                  </div>

                  {/* INCLUDED */}

                  <div className="mt-3">
                    {renderDetailList(
                      "What's Included",
                      "whatsIncluded",
                      "যেমন: 1x Main Product",
                      <Package
                        size={14}
                        className="text-brand-600"
                      />
                    )}
                  </div>

                  {/* DELIVERY */}

                  <div className="mt-3 rounded-xl border border-mist-200 bg-white p-4">

                    <div className="mb-2 flex items-center gap-2">
                      <Truck
                        size={14}
                        className="text-brand-600"
                      />

                      <p className="text-xs font-bold text-ink-900">
                        Delivery Information
                      </p>
                    </div>

                    <textarea
                      value={
                        newProduct.details
                          ?.deliveryInfo ||
                        ""
                      }
                      onChange={(e) =>
                        updateProductDetail(
                          "deliveryInfo",
                          e.target.value
                        )
                      }
                      placeholder="Delivery time, charge বা অন্যান্য delivery information..."
                      rows={3}
                      className="w-full rounded-lg border border-mist-200 px-3 py-2.5 text-xs outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* RETURN */}

                  <div className="mt-3 rounded-xl border border-mist-200 bg-white p-4">

                    <div className="mb-2 flex items-center gap-2">
                      <RotateCcw
                        size={14}
                        className="text-brand-600"
                      />

                      <p className="text-xs font-bold text-ink-900">
                        Return Policy
                      </p>
                    </div>

                    <textarea
                      value={
                        newProduct.details
                          ?.returnPolicy ||
                        ""
                      }
                      onChange={(e) =>
                        updateProductDetail(
                          "returnPolicy",
                          e.target.value
                        )
                      }
                      placeholder="Product return / replacement policy..."
                      rows={3}
                      className="w-full rounded-lg border border-mist-200 px-3 py-2.5 text-xs outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* WARRANTY */}

                  <div className="mt-3 rounded-xl border border-mist-200 bg-white p-4">

                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck
                        size={14}
                        className="text-brand-600"
                      />

                      <p className="text-xs font-bold text-ink-900">
                        Warranty
                      </p>
                    </div>

                    <textarea
                      value={
                        newProduct.details
                          ?.warranty ||
                        ""
                      }
                      onChange={(e) =>
                        updateProductDetail(
                          "warranty",
                          e.target.value
                        )
                      }
                      placeholder="Warranty information..."
                      rows={3}
                      className="w-full rounded-lg border border-mist-200 px-3 py-2.5 text-xs outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* ================================================= */}
                {/* VARIANTS */}
                {/* ================================================= */}

                {newProduct.hasVariants && (
                  <div className="mt-5 space-y-4">

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-ink-900">
                          Colors / Variants
                        </h4>

                        <p className="text-[11px] text-slate-400">
                          প্রতিটি Color-এর Size ও
                          Stock আলাদাভাবে দিন
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          addNewVariant
                        }
                        className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        <Plus size={12} />
                        Add Color
                      </button>
                    </div>

                    {newProduct.variants.map(
                      (
                        variant,
                        variantIndex
                      ) => {
                        const sizeTotal =
                          Array.isArray(
                            variant.sizes
                          )
                            ? variant.sizes.reduce(
                                (
                                  sum,
                                  size
                                ) =>
                                  sum +
                                  Number(
                                    size.stock ||
                                      0
                                  ),
                                0
                              )
                            : 0;

                        return (
                          <div
                            key={
                              variant.variantId
                            }
                            className="rounded-xl border border-mist-200 bg-white p-4"
                          >
                            <div className="mb-3 flex items-center justify-between">

                              <div className="flex items-center gap-2">

                                <div
                                  className="h-8 w-8 rounded-full border border-black/10"
                                  style={{
                                    backgroundColor:
                                      variant.colorCode ||
                                      "#000000",
                                  }}
                                />

                                <div>
                                  <p className="text-xs font-bold text-ink-900">
                                    Color #
                                    {variantIndex +
                                      1}
                                  </p>

                                  <p className="text-[10px] text-slate-400">
                                    Stock:{" "}
                                    {
                                      sizeTotal
                                    }
                                  </p>
                                </div>
                              </div>

                              {newProduct
                                .variants
                                .length >
                                1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeNewVariant(
                                      variantIndex
                                    )
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <Trash2
                                    size={13}
                                  />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">

                              <input
                                placeholder="Color Name *"
                                value={
                                  variant.color
                                }
                                onChange={(e) =>
                                  updateNewVariant(
                                    variantIndex,
                                    "color",
                                    e.target.value
                                  )
                                }
                                className="rounded-lg border border-mist-200 px-2.5 py-2 text-xs outline-none focus:border-brand-500"
                              />

                              <div className="flex items-center gap-2 rounded-lg border border-mist-200 bg-white px-2.5">

                                <input
                                  type="color"
                                  value={
                                    variant.colorCode ||
                                    "#000000"
                                  }
                                  onChange={(e) =>
                                    updateNewVariant(
                                      variantIndex,
                                      "colorCode",
                                      e.target.value
                                    )
                                  }
                                  className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"
                                />

                                <input
                                  value={
                                    variant.colorCode ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    updateNewVariant(
                                      variantIndex,
                                      "colorCode",
                                      e.target.value
                                    )
                                  }
                                  className="w-full border-0 bg-transparent text-xs outline-none"
                                />
                              </div>

                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Variant Price"
                                value={
                                  variant.price
                                }
                                onChange={(e) =>
                                  updateNewVariant(
                                    variantIndex,
                                    "price",
                                    e.target.value
                                  )
                                }
                                className="rounded-lg border border-mist-200 px-2.5 py-2 text-xs outline-none focus:border-brand-500"
                              />

                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Variant Old Price"
                                value={
                                  variant.oldPrice
                                }
                                onChange={(e) =>
                                  updateNewVariant(
                                    variantIndex,
                                    "oldPrice",
                                    e.target.value
                                  )
                                }
                                className="rounded-lg border border-mist-200 px-2.5 py-2 text-xs outline-none focus:border-brand-500"
                              />

                              <input
                                placeholder="Variant Image URL"
                                value={
                                  variant.image ||
                                  ""
                                }
                                onChange={(e) =>
                                  updateNewVariant(
                                    variantIndex,
                                    "image",
                                    e.target.value
                                  )
                                }
                                className="rounded-lg border border-mist-200 px-2.5 py-2 text-xs outline-none focus:border-brand-500 sm:col-span-2"
                              />
                            </div>

                            <div className="mt-4 rounded-xl bg-mist-50 p-3">

                              <div className="mb-2 flex items-center justify-between">

                                <div className="flex items-center gap-1.5">
                                  <Ruler
                                    size={14}
                                    className="text-brand-600"
                                  />

                                  <span className="text-xs font-bold text-ink-900">
                                    Sizes
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    addSizeToVariant(
                                      variantIndex
                                    )
                                  }
                                  className="flex items-center gap-1 rounded-lg border border-mist-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-mist-100"
                                >
                                  <Plus size={10} />
                                  Add Size
                                </button>
                              </div>

                              <div className="space-y-2">
                                {Array.isArray(
                                  variant.sizes
                                ) &&
                                  variant.sizes.map(
                                    (
                                      size,
                                      sizeIndex
                                    ) => (
                                      <div
                                        key={`${variant.variantId}-${sizeIndex}`}
                                        className="flex items-center gap-2"
                                      >
                                        <input
                                          placeholder="Size (M/L/XL)"
                                          value={
                                            size.size
                                          }
                                          onChange={(e) =>
                                            updateVariantSize(
                                              variantIndex,
                                              sizeIndex,
                                              "size",
                                              e.target.value
                                            )
                                          }
                                          className="flex-1 rounded-lg border border-mist-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-brand-500"
                                        />

                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="Stock"
                                          value={
                                            size.stock
                                          }
                                          onChange={(e) =>
                                            updateVariantSize(
                                              variantIndex,
                                              sizeIndex,
                                              "stock",
                                              e.target.value
                                            )
                                          }
                                          className="w-24 rounded-lg border border-mist-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-brand-500"
                                        />

                                        {variant
                                          .sizes
                                          .length >
                                          1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeSizeFromVariant(
                                                variantIndex,
                                                sizeIndex
                                              )
                                            }
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                          >
                                            <Trash2
                                              size={12}
                                            />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  )}
                              </div>

                              <p className="mt-2 text-[10px] text-slate-400">
                                Total stock:{" "}
                                <strong>
                                  {
                                    sizeTotal
                                  }
                                </strong>
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {/* ================================================= */}
                {/* SAVE */}
                {/* ================================================= */}

                <button
                  type="button"
                  onClick={
                    handleCreateProduct
                  }
                  disabled={
                    savingProduct
                  }
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProduct ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={14} />
                  )}

                  {savingProduct
                    ? "Product তৈরি হচ্ছে..."
                    : "Save Product"}
                </button>
              </div>
            )}

            {/* ================================================= */}
            {/* SEARCH */}
            {/* ================================================= */}

            <div className="relative mb-4">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={
                  productQuery
                }
                onChange={(e) =>
                  setProductQuery(
                    e.target.value
                  )
                }
                placeholder="প্রোডাক্ট খুঁজুন..."
                className="w-full rounded-xl border border-mist-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* ================================================= */}
            {/* PRODUCTS */}
            {/* ================================================= */}

            {productsLoading ? (
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2
                  size={20}
                  className="animate-spin"
                />

                প্রোডাক্ট লোড হচ্ছে...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">

                {filteredProducts.map(
                  (product) => {
                    const productId =
                      getProductId(
                        product
                      );

                    const variants =
                      Array.isArray(
                        product.variants
                      )
                        ? product.variants
                        : [];

                    const hasVariants =
                      variants.length >
                      0;

                    const availableStock =
                      getProductAvailableStock(
                        product
                      );

                    const outOfStock =
                      availableStock <=
                      0;

                    return (
                      <div
                        key={
                          product._id ||
                          productId
                        }
                        className={`relative rounded-xl border p-3 transition ${
                          outOfStock
                            ? "border-mist-200 opacity-50"
                            : "border-mist-200 hover:border-brand-300 hover:bg-brand-50"
                        }`}
                      >

                        {/* DELETE */}

                        <button
                          type="button"
                          onClick={(
                            event
                          ) =>
                            handleDeleteProductClick(
                              product,
                              event
                            )
                          }
                          disabled={
                            deletingProduct
                          }
                          title="Delete product"
                          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-slate-400 shadow-sm ring-1 ring-mist-200 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2
                            size={13}
                          />
                        </button>

                        {/* SELECT */}

                        <button
                          type="button"
                          onClick={() =>
                            handleProductClick(
                              product
                            )
                          }
                          disabled={
                            outOfStock
                          }
                          className="flex w-full flex-col items-center gap-1.5 text-center"
                        >

                          {hasVariants && (
                            <span className="absolute left-2 top-2 rounded-full bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold text-brand-600">
                              {
                                variants.length
                              }{" "}
                              Color
                            </span>
                          )}

                          {product.image ? (
                            <img
                              src={
                                product.image
                              }
                              alt={
                                product.name
                              }
                              className="mt-4 h-14 w-14 rounded-lg bg-mist-100 object-cover"
                            />
                          ) : (
                            <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-lg bg-mist-100">
                              <Package
                                size={18}
                                className="text-slate-300"
                              />
                            </div>
                          )}

                          <p className="line-clamp-2 text-xs font-semibold text-ink-900">
                            {
                              product.name
                            }
                          </p>

                          <p className="text-xs font-bold text-brand-600">
                            {currency(
                              product.price
                            )}
                          </p>

                          {hasVariants &&
                            !outOfStock && (
                              <p className="text-[10px] text-slate-400">
                                Color / Size
                              </p>
                            )}

                          {outOfStock ? (
                            <p className="text-[10px] font-semibold text-rose-500">
                              স্টক নেই
                            </p>
                          ) : (
                            <p
                              className={`flex items-center gap-1 text-[10px] ${
                                availableStock <=
                                5
                                  ? "text-rose-500"
                                  : "text-slate-400"
                              }`}
                            >
                              {availableStock <=
                                5 && (
                                <AlertTriangle
                                  size={9}
                                />
                              )}

                              Stock{" "}
                              {
                                availableStock
                              }
                            </p>
                          )}
                        </button>
                      </div>
                    );
                  }
                )}

                {filteredProducts.length ===
                  0 && (
                  <p className="col-span-full py-6 text-center text-sm text-slate-400">
                    কোনো প্রোডাক্ট পাওয়া
                    যায়নি
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ================================================= */}
          {/* CART */}
          {/* ================================================= */}

          {cart.length > 0 && (
            <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">

              <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <ShoppingCart
                  size={17}
                  className="text-brand-600"
                />

                Selected Product (
                {cart.length})
              </h3>

              <div className="divide-y divide-mist-100">

                {cart.map((item) => {
                  const maxStock =
                    getCartItemStock(
                      item
                    );

                  return (
                    <div
                      key={`${item.productId}-${item.variantId || "default"}-${item.size || "nosize"}`}
                      className="flex flex-wrap items-center gap-3 py-3"
                    >

                      {item.image ? (
                        <img
                          src={
                            item.image
                          }
                          alt={
                            item.name
                          }
                          className="h-12 w-12 flex-shrink-0 rounded-lg bg-mist-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-mist-100">
                          <Package
                            size={16}
                            className="text-slate-300"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {item.name}
                        </p>

                        {item.variantId && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">

                            {item.color && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
                                <Palette
                                  size={9}
                                />

                                {
                                  item.color
                                }
                              </span>
                            )}

                            {item.size && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                <Ruler
                                  size={9}
                                />

                                {
                                  item.size
                                }
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">

                        <button
                          type="button"
                          onClick={() =>
                            decreaseCartQuantity(
                              item
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist-100 text-slate-500 hover:bg-mist-200"
                        >
                          <Minus size={12} />
                        </button>

                        <input
                          type="number"
                          min={1}
                          max={
                            maxStock ??
                            undefined
                          }
                          value={
                            item.quantity
                          }
                          onChange={(e) => {
                            let value =
                              Number(
                                e.target
                                  .value
                              ) || 1;

                            if (
                              maxStock !==
                                null &&
                              value >
                                maxStock
                            ) {
                              value =
                                maxStock;
                            }

                            updateCartLine(
                              item.productId,
                              item.variantId,
                              item.size,
                              "quantity",
                              Math.max(
                                1,
                                value
                              )
                            );
                          }}
                          className="w-12 rounded-lg border border-mist-200 px-1.5 py-1 text-center text-sm"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            increaseCartQuantity(
                              item
                            )
                          }
                          disabled={
                            maxStock !==
                              null &&
                            item.quantity >=
                              maxStock
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-mist-100 text-slate-500 hover:bg-mist-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <input
                        type="number"
                        min={0}
                        value={
                          item.price
                        }
                        onChange={(e) =>
                          updateCartLine(
                            item.productId,
                            item.variantId,
                            item.size,
                            "price",
                            e.target.value
                          )
                        }
                        className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeCartLine(
                            item
                          )
                        }
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* RIGHT */}
        {/* ================================================= */}

        <div className="space-y-5">

          {/* ORDER INFO */}

          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">

            <h3 className="mb-4 font-display text-base font-bold text-ink-900">
              অর্ডার তথ্য
            </h3>

            <div className="space-y-3">

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tenant / Store
                </label>

                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  disabled={tenantsLoading || !tenants.length}
                  className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:bg-mist-50 disabled:text-slate-400"
                >
                  {tenants.length > 0 ? (
                    tenants.map((tenant) => {
                      const id =
                        tenant?._id ||
                        tenant?.id ||
                        tenant?.tenantId ||
                        "";

                      return (
                        <option key={id} value={id}>
                          {tenant?.name || "Unnamed Store"}
                        </option>
                      );
                    })
                  ) : (
                    <option value="">
                      {tenantsLoading
                        ? "Tenant লোড হচ্ছে..."
                        : "কোনো Tenant পাওয়া যায়নি"}
                    </option>
                  )}
                </select>

                {!tenantsLoading && !tenants.length && (
                  <p className="mt-1.5 text-[10px] text-rose-500">
                    আগে Settings থেকে একটি Tenant / Store তৈরি করুন।
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  ডেলিভারি এরিয়া
                </label>

                <select
                  value={deliveryArea}
                  onChange={(e) =>
                    setDeliveryArea(e.target.value)
                  }
                  className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="inside-dhaka">ঢাকার ভিতরে</option>
                  <option value="outside-dhaka">ঢাকার বাইরে</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  অর্ডার সোর্স
                </label>

                <select
                  value={
                    source
                  }
                  onChange={(e) =>
                    setSource(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {ORDER_SOURCES.map(
                    (
                      sourceItem
                    ) => (
                      <option
                        key={
                          sourceItem.id
                        }
                        value={
                          sourceItem.id
                        }
                      >
                        {
                          sourceItem.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  অফিস নোট
                </label>

                <textarea
                  value={
                    officeOrderNote
                  }
                  onChange={(e) =>
                    setOfficeOrderNote(
                      e.target.value
                    )
                  }
                  rows={2}
                  className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* PRICING */}

          <div className="animate-in rounded-2xl border border-mist-200 bg-white p-6 shadow-card">

            <h3 className="mb-4 font-display text-base font-bold text-ink-900">
              মূল্য হিসাব
            </h3>

            <div className="space-y-3 text-sm">

              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  Subtotal
                </span>

                <span className="font-semibold text-ink-900">
                  {currency(
                    subtotal
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">
                  Delivery Charge
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    deliveryCharge
                  }
                  onChange={(e) =>
                    setDeliveryCharge(
                      e.target.value
                    )
                  }
                  className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">
                  Additional Discount
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    additionalDiscount
                  }
                  onChange={(e) =>
                    setAdditionalDiscount(
                      e.target.value
                    )
                  }
                  className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">
                  Advance Amount
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    advanceAmount
                  }
                  onChange={(e) =>
                    setAdvanceAmount(
                      e.target.value
                    )
                  }
                  className="w-24 rounded-lg border border-mist-200 px-2 py-1.5 text-right text-sm"
                />
              </div>

              <div className="h-px bg-mist-200" />

              <div className="flex items-center justify-between text-base font-bold text-ink-900">
                <span>
                  Due (COD)
                </span>

                <span className="text-brand-600">
                  {currency(due)}
                </span>
              </div>
            </div>
          </div>

          {/* SUBMIT */}

          <button
            type="button"
            onClick={
              handleSubmit
            }
            disabled={
              submitting ||
              productsLoading
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Plus size={16} />
            )}

            {submitting
              ? "অর্ডার তৈরি হচ্ছে..."
              : "Submit Order"}
          </button>
        </div>
      </div>

      {/* ===================================================== */}
      {/* VARIANT SELECTOR MODAL */}
      {/* ===================================================== */}

      {showVariantSelector &&
        selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-mist-200 px-5 py-4">

                <div>
                  <h3 className="font-display text-base font-bold text-ink-900">
                    {
                      selectedProduct.name
                    }
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Color এবং Size নির্বাচন
                    করুন
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeVariantSelector
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-mist-100 hover:text-slate-700"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5">

                {/* COLOR */}

                <div>

                  <div className="mb-2 flex items-center gap-2">
                    <Palette
                      size={15}
                      className="text-brand-600"
                    />

                    <p className="text-sm font-bold text-ink-900">
                      Color
                    </p>

                    {selectedVariant && (
                      <span className="text-xs text-slate-400">
                        —
                        {selectedVariant.color ||
                          "Default"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

                    {selectedProduct.variants.map(
                      (
                        variant,
                        index
                      ) => {
                        const stock =
                          getVariantStock(
                            variant
                          );

                        const selected =
                          selectedVariant ===
                          variant;

                        return (
                          <button
                            type="button"
                            key={
                              variant.variantId ||
                              index
                            }
                            disabled={
                              stock <= 0
                            }
                            onClick={() =>
                              handleVariantSelect(
                                variant
                              )
                            }
                            className={`relative flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${
                              selected
                                ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
                                : "border-mist-200 hover:border-brand-300"
                            } ${
                              stock <=
                              0
                                ? "cursor-not-allowed opacity-40"
                                : ""
                            }`}
                          >

                            <span
                              className="h-7 w-7 flex-shrink-0 rounded-full border border-black/10 shadow-sm"
                              style={{
                                backgroundColor:
                                  variant.colorCode ||
                                  "#e5e7eb",
                              }}
                            />

                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-ink-900">
                                {variant.color ||
                                  `Color ${
                                    index +
                                    1
                                  }`}
                              </span>

                              <span className="block text-[10px] text-slate-400">
                                Stock:{" "}
                                {
                                  stock
                                }
                              </span>
                            </span>

                            {selected && (
                              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                                <Check
                                  size={11}
                                />
                              </span>
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* SIZE */}

                {selectedVariant && (
                  <div className="mt-6">

                    <div className="mb-2 flex items-center gap-2">
                      <Ruler
                        size={15}
                        className="text-brand-600"
                      />

                      <p className="text-sm font-bold text-ink-900">
                        Size
                      </p>

                      {selectedSize && (
                        <span className="text-xs text-slate-400">
                          —
                          {
                            selectedSize.size
                          }
                        </span>
                      )}
                    </div>

                    {Array.isArray(
                      selectedVariant.sizes
                    ) &&
                    selectedVariant.sizes
                      .length > 0 ? (
                      <div className="flex flex-wrap gap-2">

                        {selectedVariant.sizes.map(
                          (
                            size,
                            index
                          ) => {
                            const stock =
                              getSizeStock(
                                size
                              );

                            const selected =
                              selectedSize ===
                              size;

                            return (
                              <button
                                type="button"
                                key={`${size.size}-${index}`}
                                disabled={
                                  stock <=
                                  0
                                }
                                onClick={() =>
                                  handleSizeSelect(
                                    size
                                  )
                                }
                                className={`relative min-w-[70px] rounded-xl border px-3 py-2 transition ${
                                  selected
                                    ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                                    : "border-mist-200 text-slate-700 hover:border-brand-300"
                                } ${
                                  stock <=
                                  0
                                    ? "cursor-not-allowed opacity-40 line-through"
                                    : ""
                                }`}
                              >
                                <span className="block text-xs font-bold">
                                  {size.size ||
                                    "N/A"}
                                </span>

                                <span className="mt-0.5 block text-[9px] text-slate-400">
                                  Stock{" "}
                                  {
                                    stock
                                  }
                                </span>

                                {selected && (
                                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                                    <Check
                                      size={
                                        11
                                      }
                                    />
                                  </span>
                                )}
                              </button>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-mist-300 bg-mist-50 px-4 py-3">
                        <p className="text-xs text-slate-500">
                          এই Color-এর জন্য
                          Size নেই। সরাসরি
                          Cart-এ যোগ করতে
                          পারবেন।
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* PRICE */}

                {selectedVariant && (
                  <div className="mt-5 rounded-xl bg-mist-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Price
                      </span>

                      <span className="text-base font-bold text-brand-600">
                        {currency(
                          Number(
                            selectedVariant.price
                          ) > 0
                            ? selectedVariant.price
                            : selectedProduct.price
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-mist-200 bg-mist-50 px-5 py-4">

                <button
                  type="button"
                  onClick={
                    closeVariantSelector
                  }
                  className="rounded-lg border border-mist-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-mist-100"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    confirmVariantSelection
                  }
                  disabled={
                    !selectedVariant ||
                    (Array.isArray(
                      selectedVariant?.sizes
                    ) &&
                      selectedVariant
                        .sizes
                        .length >
                        0 &&
                      !selectedSize)
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ShoppingCart
                    size={13}
                  />

                  Cart-এ যোগ করুন
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ===================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ===================================================== */}

      {productToDelete && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={
            closeDeleteModal
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="px-5 pt-5">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={19} />
              </div>

              <h3
                id="delete-product-title"
                className="mt-4 text-base font-bold text-ink-900"
              >
                Delete Product?
              </h3>

              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                আপনি কি{" "}
                <span className="font-semibold text-slate-800">
                  {productToDelete.name ||
                    "এই product"}
                </span>{" "}
                permanently delete করতে চান?
              </p>

              <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5">
                <p className="flex items-start gap-2 text-xs leading-5 text-rose-600">
                  <AlertCircle
                    size={14}
                    className="mt-0.5 flex-shrink-0"
                  />

                  এই action-এর পরে product এবং
                  তার stock adjustment history
                  delete হয়ে যাবে।
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-mist-200 bg-mist-50 px-5 py-4">

              <button
                type="button"
                onClick={
                  closeDeleteModal
                }
                disabled={
                  deletingProduct
                }
                className="rounded-lg border border-mist-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-mist-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmDeleteProduct
                }
                disabled={
                  deletingProduct
                }
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingProduct ? (
                  <>
                    <Loader2
                      size={13}
                      className="animate-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2
                      size={13}
                    />
                    Delete Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* SUCCESS / ERROR MODAL */}
      {/* ===================================================== */}

      {statusModal && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
          onClick={() =>
            setStatusModal(null)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start gap-3">

              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                  statusModal.type ===
                  "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {statusModal.type ===
                "success" ? (
                  <CheckCircle2
                    size={19}
                  />
                ) : (
                  <AlertCircle
                    size={19}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-ink-900">
                  {
                    statusModal.title
                  }
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {
                    statusModal.message
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setStatusModal(
                    null
                  )
                }
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-mist-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setStatusModal(
                  null
                )
              }
              className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-bold text-white ${
                statusModal.type ===
                "success"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-800 hover:bg-slate-900"
              }`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CreateOrder;