import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Image as ImageIcon,
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

const emptyVariant = () => ({
  variantId: `variant-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`,
  color: "",
  colorCode: "#000000",
  price: "",
  image: "",
  sizes: [
    {
      size: "",
      stock: "",
    },
  ],
});

const emptyNewProduct = {
  name: "",
  price: "",
  image: "",
  sku: "",
  stock: "",
  hasVariants: true,
  variants: [emptyVariant()],
};

const CreateOrder = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();

  const tenants = getTenants();

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
    district: "",
    thana: "",
    address: "",
    note: "",
  });

  // =========================================================
  // ORDER SETTINGS
  // =========================================================

  const [tenantId, setTenantId] = useState(
    tenants[0]?.id || ""
  );

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
    useState(emptyNewProduct);

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

    const inTenant = products.filter(
      (p) =>
        !tenantId ||
        !p.tenantId ||
        p.tenantId === tenantId
    );

    const query = productQuery
      .trim()
      .toLowerCase();

    if (!query) {
      return inTenant;
    }

    return inTenant.filter((p) =>
      String(p.name || "")
        .toLowerCase()
        .includes(query)
    );
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
      alert("Product ID পাওয়া যায়নি।");
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
        alert("এই প্রোডাক্টের স্টক নেই।");
        return;
      }

      setSelectedProduct(product);
      setSelectedVariant(null);
      setSelectedSize(null);
      setShowVariantSelector(true);

      return;
    }

    if (Number(product.stock || 0) <= 0) {
      alert("এই প্রোডাক্টের স্টক নেই।");
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
      alert("Product ID পাওয়া যায়নি।");
      return;
    }

    const stock = Number(product.stock || 0);

    if (stock <= 0) {
      alert("এই প্রোডাক্টের স্টক নেই।");
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
      variant._id ||
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
      alert("এই variant-এর স্টক নেই।");
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
      alert("একটি Color নির্বাচন করুন।");
      return;
    }

    const hasSizes =
      Array.isArray(selectedVariant.sizes) &&
      selectedVariant.sizes.length > 0;

    if (hasSizes && !selectedSize) {
      alert("একটি Size নির্বাচন করুন।");
      return;
    }

    if (
      hasSizes &&
      selectedSize &&
      getSizeStock(selectedSize) <= 0
    ) {
      alert("এই Size-এর স্টক নেই।");
      return;
    }

    if (
      !hasSizes &&
      getVariantStock(selectedVariant) <= 0
    ) {
      alert("এই Color-এর স্টক নেই।");
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
  // NEW PRODUCT - UPDATE
  // =========================================================

  const updateNewProduct = (field, value) => {
    setNewProduct((prev) => ({
      ...prev,
      [field]: value,
    }));
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
            variants[variantIndex].sizes
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
        ? [
            ...variants[variantIndex].sizes,
          ]
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
        ? [
            ...variants[variantIndex].sizes,
          ]
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
    setNewProduct({
      name: "",
      price: "",
      image: "",
      sku: "",
      stock: "",
      hasVariants: true,
      variants: [emptyVariant()],
    });
  };

  // =========================================================
  // CREATE NEW PRODUCT
  // =========================================================

  const handleCreateProduct = async () => {
    if (
      !String(newProduct.name || "").trim()
    ) {
      alert("প্রোডাক্টের নাম আবশ্যক।");
      return;
    }

    if (
      Number(newProduct.price || 0) <= 0
    ) {
      alert("প্রোডাক্টের দাম সঠিকভাবে দিন।");
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
        alert("কমপক্ষে একটি Color/Variant যোগ করুন।");
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
                      size.size || ""
                    ).trim()
                )
                .map((size) => ({
                  size: String(
                    size.size || ""
                  ).trim(),
                  stock: Math.max(
                    0,
                    Number(size.stock || 0)
                  ),
                }))
            : [];

          const sizeStock = sizes.reduce(
            (sum, size) =>
              sum + Number(size.stock || 0),
            0
          );

          const directStock =
            Number(variant.stock || 0);

          const stock =
            sizes.length > 0
              ? sizeStock
              : directStock;

          const variantPrice =
            Number(variant.price || 0) >
            0
              ? Number(variant.price)
              : Number(newProduct.price);

          return {
            variantId:
              String(
                variant.variantId || ""
              ).trim() ||
              `variant-${Date.now()}-${index}`,

            color: String(
              variant.color || ""
            ).trim(),

            colorCode:
              variant.colorCode ||
              "#000000",

            price: variantPrice,

            oldPrice: 0,

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
        alert(
          "প্রতিটি Variant-এর Color দিতে হবে।"
        );
        return;
      }
    }

    setSavingProduct(true);

    try {
      const variantTotalStock =
        variants.reduce(
          (sum, variant) =>
            sum +
            Number(variant.stock || 0),
          0
        );

      const productPayload = {
        name: String(
          newProduct.name
        ).trim(),

        price:
          Number(newProduct.price) || 0,

        image:
          String(
            newProduct.image || ""
          ).trim(),

        images: newProduct.image
          ? [String(newProduct.image).trim()]
          : [],

        sku:
          String(
            newProduct.sku || ""
          ).trim(),

        tenantId,

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

        /*
          If API returns the complete
          created product, add it.
        */

        if (
          createdProduct &&
          getProductId(createdProduct)
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
                  getVariantStock(v) > 0
              );

            if (firstVariant) {
              const firstSize =
                Array.isArray(
                  firstVariant.sizes
                )
                  ? firstVariant.sizes.find(
                      (s) =>
                        Number(
                          s.stock || 0
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

      alert(
        "প্রোডাক্ট সফলভাবে তৈরি হয়েছে।"
      );
    } catch (error) {
      console.error(
        "Create product error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "নতুন প্রোডাক্ট তৈরি করা যায়নি।"
      );
    } finally {
      setSavingProduct(false);
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
          String(item.productId) ===
            String(productId) &&
          String(item.variantId || "") ===
            String(variantId || "") &&
          String(item.size || "") ===
            String(size || "");

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

    const product = products.find(
      (p) =>
        String(getProductId(p)) ===
        String(item.productId)
    );

    if (!product) return null;

    if (!item.variantId) {
      return Number(product.stock || 0);
    }

    const variants = Array.isArray(
      product.variants
    )
      ? product.variants
      : [];

    const variant = variants.find(
      (v) =>
        String(v.variantId || "") ===
        String(item.variantId || "")
    );

    if (!variant) return null;

    if (item.size) {
      const sizes = Array.isArray(
        variant.sizes
      )
        ? variant.sizes
        : [];

      const size = sizes.find(
        (s) =>
          String(s.size || "") ===
          String(item.size || "")
      );

      return size
        ? Number(size.stock || 0)
        : null;
    }

    return getVariantStock(variant);
  };

  // =========================================================
  // INCREASE
  // =========================================================

  const increaseCartQuantity = (item) => {
    if (!item) return;

    const maxStock =
      getCartItemStock(item);

    if (
      maxStock !== null &&
      Number(item.quantity || 0) >=
        maxStock
    ) {
      return;
    }

    updateCartLine(
      item.productId,
      item.variantId,
      item.size,
      "quantity",
      Number(item.quantity || 0) + 1
    );
  };

  // =========================================================
  // DECREASE
  // =========================================================

  const decreaseCartQuantity = (item) => {
    if (!item) return;

    updateCartLine(
      item.productId,
      item.variantId,
      item.size,
      "quantity",
      Math.max(
        1,
        Number(item.quantity || 1) - 1
      )
    );
  };

  // =========================================================
  // REMOVE
  // =========================================================

  const removeCartLine = (item) => {
    setCart((prev) =>
      prev.filter(
        (cartItem) =>
          !(
            String(cartItem.productId) ===
              String(item.productId) &&
            String(
              cartItem.variantId || ""
            ) ===
              String(
                item.variantId || ""
              ) &&
            String(
              cartItem.size || ""
            ) ===
              String(item.size || "")
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
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );

  const total =
    subtotal +
    Number(deliveryCharge || 0) -
    Number(additionalDiscount || 0);

  const due =
    total -
    Number(advanceAmount || 0);

  // =========================================================
  // PHONE CHECK
  // =========================================================

  const handlePhoneChange = async (value) => {
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
    if (
      !String(customer.name || "").trim() ||
      customer.phone.length !== 11 ||
      cart.length === 0
    ) {
      alert(
        "নাম, ১১ ডিজিটের ফোন নাম্বার, এবং অন্তত একটি প্রোডাক্ট আবশ্যক।"
      );
      return;
    }

    for (const item of cart) {
      const maxStock =
        getCartItemStock(item);

      if (
        maxStock !== null &&
        Number(item.quantity || 0) >
          maxStock
      ) {
        const variantText =
          item.color
            ? ` (${item.color}${
                item.size
                  ? ` / ${item.size}`
                  : ""
              })`
            : "";

        alert(
          `${item.name}${variantText} এর পর্যাপ্ত স্টক নেই। বর্তমানে ${maxStock} টি আছে।`
        );

        return;
      }
    }

    if (due < 0) {
      alert(
        "Advance Amount মোট Due-এর চেয়ে বেশি হতে পারবে না।"
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...customer,

        items: cart.map((item) => ({
          productId:
            item.productId,

          variantId:
            item.variantId || "",

          color:
            item.color || "",

          colorCode:
            item.colorCode || "",

          size:
            item.size || "",

          name:
            item.name || "",

          image:
            item.image || "",

          price:
            Number(item.price || 0),

          quantity:
            Number(item.quantity || 1),
        })),

        subtotal:
          Number(subtotal || 0),

        deliveryCharge:
          Number(deliveryCharge || 0),

        additionalDiscount:
          Number(
            additionalDiscount || 0
          ),

        advanceAmount:
          Number(
            advanceAmount || 0
          ),

        total:
          Number(due || 0),

        status: "pending",

        source,

        orderSource: source,

        tenantId,

        officeOrderNote,

        createdBy:
          admin?.id || "",
      };

      /*
        IMPORTANT:

        Order creation DOES NOT
        decrease stock.

        Stock will be decreased
        when admin confirms order.
      */

      const response =
        await api.post(
          "/orders",
          payload
        );

      const data =
        response?.data;

      const newId =
        data?.order?._id ||
        data?.order?.id ||
        data?._id ||
        data?.id;

      navigate(
        newId
          ? `/orders/${newId}`
          : "/orders"
      );
    } catch (error) {
      console.error(
        "Create order error:",
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "অর্ডার তৈরি করা যায়নি।";

      alert(message);
    } finally {
      setSubmitting(false);
    }
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
                value={customer.name}
                onChange={(e) =>
                  setCustomer((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />

              {/* PHONE */}

              <div>
                <input
                  placeholder="মোবাইল নাম্বার *"
                  value={customer.phone}
                  onChange={(e) =>
                    handlePhoneChange(
                      e.target.value
                    )
                  }
                  maxLength={11}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />

                {repeatCount !== null && (
                  <p
                    className={`mt-1 text-xs ${
                      repeatCount > 0
                        ? "font-semibold text-brand-600"
                        : "text-slate-400"
                    }`}
                  >
                    {repeatCount > 0
                      ? `এই নাম্বারে আগে ${repeatCount} টি অর্ডার আছে — রিপিট কাস্টমার`
                      : "নতুন কাস্টমার"}
                  </p>
                )}

                {duplicateTodayCount > 0 && (
                  <p className="mt-1 flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-600">
                    <AlertTriangle size={12} />

                    আজকে এই নাম্বার থেকে
                    ইতিমধ্যে{" "}
                    {duplicateTodayCount} টি
                    অর্ডার এসেছে
                  </p>
                )}

                <FraudCheckPanel
                  phone={customer.phone}
                />
              </div>

              {/* DISTRICT */}

              <input
                placeholder="জেলা"
                value={customer.district}
                onChange={(e) =>
                  setCustomer((prev) => ({
                    ...prev,
                    district:
                      e.target.value,
                  }))
                }
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />

              {/* THANA */}

              <input
                placeholder="থানা"
                value={customer.thana}
                onChange={(e) =>
                  setCustomer((prev) => ({
                    ...prev,
                    thana:
                      e.target.value,
                  }))
                }
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />

              {/* ADDRESS */}

              <textarea
                placeholder="সম্পূর্ণ ঠিকানা"
                value={customer.address}
                onChange={(e) =>
                  setCustomer((prev) => ({
                    ...prev,
                    address:
                      e.target.value,
                  }))
                }
                rows={2}
                className="rounded-lg border border-mist-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:col-span-2"
              />

              {/* NOTE */}

              <textarea
                placeholder="কাস্টমার নোট (ঐচ্ছিক)"
                value={customer.note}
                onChange={(e) =>
                  setCustomer((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
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
                    Color, Size এবং Stock
                    আলাদাভাবে সেট করতে পারবেন।
                  </p>
                </div>

                {/* BASIC */}

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">

                  <input
                    placeholder="প্রোডাক্ট নাম *"
                    value={newProduct.name}
                    onChange={(e) =>
                      updateNewProduct(
                        "name",
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  />

                  <input
                    type="number"
                    min="0"
                    placeholder="Base Price *"
                    value={newProduct.price}
                    onChange={(e) =>
                      updateNewProduct(
                        "price",
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  />

                  <input
                    placeholder="Product Image URL"
                    value={newProduct.image}
                    onChange={(e) =>
                      updateNewProduct(
                        "image",
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 sm:col-span-2"
                  />

                  <input
                    placeholder="SKU (Optional)"
                    value={newProduct.sku}
                    onChange={(e) =>
                      updateNewProduct(
                        "sku",
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  />

                  {/* VARIANT TOGGLE */}

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

                  {/* NORMAL STOCK */}

                  {!newProduct.hasVariants && (
                    <input
                      type="number"
                      min="0"
                      placeholder="Stock"
                      value={newProduct.stock}
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
                        onClick={addNewVariant}
                        className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        <Plus size={12} />
                        Add Color
                      </button>
                    </div>

                    {newProduct.variants.map(
                      (variant, variantIndex) => {

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

                            {/* VARIANT HEADER */}

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
                                    {sizeTotal}
                                  </p>
                                </div>
                              </div>

                              {newProduct.variants
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

                            {/* COLOR */}

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
                                    e.target
                                      .value
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
                                      e.target
                                        .value
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
                                      e.target
                                        .value
                                    )
                                  }
                                  className="w-full border-0 bg-transparent text-xs outline-none"
                                />
                              </div>

                              <input
                                type="number"
                                min="0"
                                placeholder="Variant Price"
                                value={
                                  variant.price
                                }
                                onChange={(e) =>
                                  updateNewVariant(
                                    variantIndex,
                                    "price",
                                    e.target
                                      .value
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
                                    e.target
                                      .value
                                  )
                                }
                                className="rounded-lg border border-mist-200 px-2.5 py-2 text-xs outline-none focus:border-brand-500 sm:col-span-3"
                              />
                            </div>

                            {/* SIZES */}

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
                                              e
                                                .target
                                                .value
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
                                              e
                                                .target
                                                .value
                                            )
                                          }
                                          className="w-24 rounded-lg border border-mist-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-brand-500"
                                        />

                                        {variant.sizes
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
                                  {sizeTotal}
                                </strong>
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {/* SAVE */}

                <button
                  type="button"
                  onClick={
                    handleCreateProduct
                  }
                  disabled={savingProduct}
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
                value={productQuery}
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
                      variants.length > 0;

                    const availableStock =
                      getProductAvailableStock(
                        product
                      );

                    const outOfStock =
                      availableStock <= 0;

                    return (
                      <button
                        type="button"
                        key={productId}
                        onClick={() =>
                          handleProductClick(
                            product
                          )
                        }
                        disabled={
                          outOfStock
                        }
                        className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                          outOfStock
                            ? "cursor-not-allowed border-mist-200 opacity-40"
                            : "border-mist-200 hover:border-brand-300 hover:bg-brand-50"
                        }`}
                      >
                        {/* VARIANT COUNT */}

                        {hasVariants && (
                          <span className="absolute right-2 top-2 rounded-full bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold text-brand-600">
                            {variants.length}{" "}
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
                            className="h-14 w-14 rounded-lg bg-mist-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-mist-100">
                            <Package
                              size={18}
                              className="text-slate-300"
                            />
                          </div>
                        )}

                        <p className="line-clamp-2 text-xs font-semibold text-ink-900">
                          {product.name}
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

                      {/* IMAGE */}

                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
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

                      {/* NAME */}

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

                                {item.color}
                              </span>
                            )}

                            {item.size && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                <Ruler
                                  size={9}
                                />

                                {item.size}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* QUANTITY */}

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
                                e.target.value
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

                      {/* PRICE */}

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

                      {/* REMOVE */}

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

              {/* TENANT */}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tenant / Store
                </label>

                <select
                  value={tenantId}
                  onChange={(e) =>
                    setTenantId(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {tenants.map((tenant) => (
                    <option
                      key={tenant.id}
                      value={tenant.id}
                    >
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SOURCE */}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  অর্ডার সোর্স
                </label>

                <select
                  value={source}
                  onChange={(e) =>
                    setSource(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-mist-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {ORDER_SOURCES.map(
                    (sourceItem) => (
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

              {/* OFFICE NOTE */}

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

          {/* ================================================= */}
          {/* PRICING */}
          {/* ================================================= */}

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

          {/* ================================================= */}
          {/* SUBMIT */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={handleSubmit}
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

              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-mist-200 px-5 py-4">

                <div>
                  <h3 className="font-display text-base font-bold text-ink-900">
                    {selectedProduct.name}
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

              {/* BODY */}

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
                      (variant, index) => {
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
                              stock <= 0
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
                                {stock}
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
                                  stock <= 0
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
                                  {stock}
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

              {/* FOOTER */}

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
                      selectedVariant.sizes
                        .length > 0 &&
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
    </AdminLayout>
  );
};

export default CreateOrder;