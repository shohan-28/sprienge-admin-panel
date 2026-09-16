import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Package,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  History,
  RefreshCw,
  Loader2,
  Barcode,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Tag,
  Palette,
  Ruler,
  Star,
  Layers3,
  Check,
  Info,
  Truck,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

import AdminLayout from "../layouts/AdminLayout.jsx";
import BarcodeImage from "../components/BarcodeImage.jsx";

import {
  getProducts,
  saveProduct,
  deleteProduct,
  adjustStock,
  getStockAdjustments,
  generateBarcode,
} from "../api/products.js";

import { getTenants } from "../config/tenants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { hasPermission } from "../config/admins.js";

const currency = (n) =>
  `৳${Number(n || 0).toLocaleString("en-BD")}`;

const createVariantId = () => {
  return `VAR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const emptyDetails = {
  shortDescription: "",
  overview: "",
  features: [],
  specifications: [],
  howToUse: [],
  careInstructions: [],
  whatsIncluded: [],
  deliveryInfo: "",
  returnPolicy: "",
  warranty: "",
};

const emptyForm = {
  name: "",
  brand: "",
  category: "",

  price: "",
  oldPrice: "",
  discount: "",

  costPrice: "",

  image: "",
  images: [],

  sku: "",
  barcode: "",

  stock: "",

  description: "",
  tags: [],

  isNew: false,
  isFeatured: false,

  supplier: "",
  tenantId: "",

  rating: 0,
  reviews: 0,

  variants: [],

  details: {
    ...emptyDetails,
  },
};

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeSpecifications = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        name: String(item?.name ?? "").trim(),
        value: String(item?.value ?? "").trim(),
      }))
      .filter((item) => item.name || item.value);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([name, val]) => ({
        name: String(name).trim(),
        value: String(val ?? "").trim(),
      }))
      .filter((item) => item.name || item.value);
  }

  return [];
};

const normalizeVariant = (variant = {}) => ({
  variantId:
    variant.variantId ||
    variant._id ||
    createVariantId(),

  color: variant.color || "",
  colorCode: variant.colorCode || "",

  price:
    variant.price !== undefined &&
    variant.price !== null &&
    variant.price !== ""
      ? variant.price
      : "",

  oldPrice:
    variant.oldPrice !== undefined &&
    variant.oldPrice !== null &&
    variant.oldPrice !== ""
      ? variant.oldPrice
      : "",

  stock:
    variant.stock !== undefined &&
    variant.stock !== null &&
    variant.stock !== ""
      ? variant.stock
      : 0,

  images: Array.isArray(variant.images)
    ? variant.images.filter(Boolean)
    : variant.image
    ? [variant.image]
    : [],

  sizes: Array.isArray(variant.sizes)
    ? variant.sizes.map((size) => ({
        size: size?.size || "",
        stock:
          size?.stock !== undefined &&
          size?.stock !== null &&
          size?.stock !== ""
            ? size.stock
            : 0,
      }))
    : [],
});

export default function Products() {
  const { admin } = useAuth();

  const tenants = getTenants();

  const canManage = hasPermission(
    admin,
    "manageProducts"
  );

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [adjustingId, setAdjustingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    ...emptyForm,
    details: {
      ...emptyDetails,
    },
  });

  const [detailsOpen, setDetailsOpen] = useState(true);

  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [galleryInput, setGalleryInput] = useState("");

  /*
  ==================================================
  LOAD PRODUCTS
  ==================================================
  */

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProducts();

      setProducts(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "LOAD PRODUCTS ERROR:",
        err
      );

      setError(
        err?.message ||
          "Products load করা যায়নি"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  /*
  ==================================================
  SUCCESS MESSAGE
  ==================================================
  */

  const showSuccess = (message) => {
    setSuccess(message);

    setTimeout(() => {
      setSuccess("");
    }, 3000);
  };

  /*
  ==================================================
  PRODUCT STATS
  ==================================================
  */

  const stats = useMemo(() => {
    const totalStock = products.reduce(
      (sum, product) =>
        sum + Number(product?.stock || 0),
      0
    );

    const featured = products.filter(
      (product) => product?.isFeatured
    ).length;

    const newProducts = products.filter(
      (product) => product?.isNew
    ).length;

    return {
      total: products.length,
      totalStock,
      featured,
      newProducts,
    };
  }, [products]);

  /*
  ==================================================
  NEW PRODUCT
  ==================================================
  */

  const startNew = async () => {
    let barcode = "";

    try {
      barcode = await generateBarcode();
    } catch (err) {
      console.warn(
        "Barcode generation failed:",
        err
      );

      barcode = `BD${Date.now()
        .toString()
        .slice(-12)}`;
    }

    setEditing("new");

    setForm({
      ...emptyForm,

      tenantId:
        tenants?.[0]?.id || "",

      barcode,

      details: {
        ...emptyDetails,
        features: [],
        specifications: [],
        howToUse: [],
        careInstructions: [],
        whatsIncluded: [],
      },

      images: [],
      tags: [],
      variants: [],
    });

    setGalleryInput("");
    setDetailsOpen(true);
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
  ==================================================
  EDIT PRODUCT
  ==================================================
  */

  const startEdit = (product) => {
    const details =
      product?.details &&
      typeof product.details === "object"
        ? product.details
        : {};

    const variants = Array.isArray(
      product?.variants
    )
      ? product.variants.map(normalizeVariant)
      : [];

    setEditing(
      product?._id ||
        product?.id ||
        product?.productId
    );

    setForm({
      name: product?.name || "",
      brand: product?.brand || "",
      category: product?.category || "",

      price:
        product?.price !== undefined
          ? product.price
          : "",

      oldPrice:
        product?.oldPrice !== undefined
          ? product.oldPrice
          : "",

      discount:
        product?.discount !== undefined
          ? product.discount
          : "",

      costPrice:
        product?.costPrice !== undefined
          ? product.costPrice
          : "",

      image: product?.image || "",

      images: Array.isArray(
        product?.images
      )
        ? product.images.filter(Boolean)
        : [],

      sku: product?.sku || "",
      barcode: product?.barcode || "",

      stock:
        product?.stock !== undefined
          ? product.stock
          : 0,

      description:
        product?.description || "",

      tags: Array.isArray(product?.tags)
        ? product.tags
        : [],

      isNew: Boolean(product?.isNew),
      isFeatured: Boolean(
        product?.isFeatured
      ),

      supplier:
        product?.supplier || "",

      tenantId:
        product?.tenantId || "",

      rating:
        product?.rating !== undefined
          ? product.rating
          : 0,

      reviews:
        product?.reviews !== undefined
          ? product.reviews
          : 0,

      variants,

      details: {
        shortDescription:
          details.shortDescription || "",

        overview:
          details.overview || "",

        features:
          normalizeStringArray(
            details.features
          ),

        specifications:
          normalizeSpecifications(
            details.specifications
          ),

        howToUse:
          normalizeStringArray(
            details.howToUse
          ),

        careInstructions:
          normalizeStringArray(
            details.careInstructions
          ),

        whatsIncluded:
          normalizeStringArray(
            details.whatsIncluded
          ),

        deliveryInfo:
          details.deliveryInfo || "",

        returnPolicy:
          details.returnPolicy || "",

        warranty:
          details.warranty || "",
      },
    });

    setGalleryInput("");
    setDetailsOpen(true);
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
  ==================================================
  FORM HELPERS
  ==================================================
  */

  const updateForm = (
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateDetails = (
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,

      details: {
        ...prev.details,
        [field]: value,
      },
    }));
  };

  /*
  ==================================================
  PRICE / DISCOUNT
  ==================================================
  */

  const calculatedDiscount = useMemo(() => {
    const price = Number(form.price);
    const oldPrice = Number(form.oldPrice);

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(oldPrice) ||
      oldPrice <= 0 ||
      price >= oldPrice
    ) {
      return 0;
    }

    return Math.round(
      ((oldPrice - price) / oldPrice) *
        100
    );
  }, [form.price, form.oldPrice]);

  /*
  ==================================================
  VARIANT TOTAL STOCK
  ==================================================
  */

  const calculatedVariantStock =
    useMemo(() => {
      if (!form.variants.length) {
        return 0;
      }

      return form.variants.reduce(
        (total, variant) => {
          const variantStock =
            Number(variant.stock || 0);

          const sizeStock =
            Array.isArray(
              variant.sizes
            )
              ? variant.sizes.reduce(
                  (sum, size) =>
                    sum +
                    Number(
                      size?.stock || 0
                    ),
                  0
                )
              : 0;

          /*
          If sizes exist, size stock is the
          actual stock source.

          Otherwise variant stock is used.
          */

          return (
            total +
            (variant.sizes?.length
              ? sizeStock
              : variantStock)
          );
        },
        0
      );
    }, [form.variants]);

  /*
  ==================================================
  FEATURES
  ==================================================
  */

  const addFeature = () => {
    updateDetails(
      "features",
      [
        ...(form.details?.features || []),
        "",
      ]
    );
  };

  const updateFeature = (
    index,
    value
  ) => {
    const next = [
      ...(form.details?.features || []),
    ];

    next[index] = value;

    updateDetails(
      "features",
      next
    );
  };

  const removeFeature = (
    index
  ) => {
    const next = [
      ...(form.details?.features || []),
    ];

    next.splice(index, 1);

    updateDetails(
      "features",
      next
    );
  };

  /*
  ==================================================
  SPECIFICATIONS
  ==================================================
  */

  const addSpecification = () => {
    updateDetails(
      "specifications",
      [
        ...(form.details
          ?.specifications || []),

        {
          name: "",
          value: "",
        },
      ]
    );
  };

  const updateSpecification = (
    index,
    field,
    value
  ) => {
    const next = [
      ...(form.details
        ?.specifications || []),
    ];

    next[index] = {
      ...next[index],
      [field]: value,
    };

    updateDetails(
      "specifications",
      next
    );
  };

  const removeSpecification = (
    index
  ) => {
    const next = [
      ...(form.details
        ?.specifications || []),
    ];

    next.splice(index, 1);

    updateDetails(
      "specifications",
      next
    );
  };

  /*
  ==================================================
  ARRAY DETAIL HELPERS
  ==================================================
  */

  const addDetailItem = (
    field
  ) => {
    updateDetails(field, [
      ...(form.details?.[field] || []),
      "",
    ]);
  };

  const updateDetailItem = (
    field,
    index,
    value
  ) => {
    const next = [
      ...(form.details?.[field] || []),
    ];

    next[index] = value;

    updateDetails(
      field,
      next
    );
  };

  const removeDetailItem = (
    field,
    index
  ) => {
    const next = [
      ...(form.details?.[field] || []),
    ];

    next.splice(index, 1);

    updateDetails(
      field,
      next
    );
  };

  /*
  ==================================================
  TAGS
  ==================================================
  */

  const addTag = () => {
    const value =
      window.prompt(
        "Tag লিখুন:"
      );

    if (!value?.trim()) return;

    const tag = value.trim();

    if (
      form.tags.includes(tag)
    ) {
      return;
    }

    updateForm(
      "tags",
      [...form.tags, tag]
    );
  };

  const removeTag = (
    index
  ) => {
    const next = [
      ...form.tags,
    ];

    next.splice(index, 1);

    updateForm(
      "tags",
      next
    );
  };

  /*
  ==================================================
  GALLERY
  ==================================================
  */

  const addGalleryImage = () => {
    const url =
      galleryInput.trim();

    if (!url) return;

    if (
      form.images.includes(url)
    ) {
      setGalleryInput("");
      return;
    }

    updateForm(
      "images",
      [
        ...form.images,
        url,
      ]
    );

    setGalleryInput("");
  };

  const removeGalleryImage = (
    index
  ) => {
    const next = [
      ...form.images,
    ];

    next.splice(index, 1);

    updateForm(
      "images",
      next
    );
  };

  /*
  ==================================================
  VARIANTS
  ==================================================
  */

  const addVariant = () => {
    const newVariant =
      normalizeVariant({
        variantId:
          createVariantId(),

        price:
          form.price || "",

        oldPrice:
          form.oldPrice || "",

        stock: 0,

        images: [],

        sizes: [],
      });

    updateForm(
      "variants",
      [
        ...form.variants,
        newVariant,
      ]
    );
  };

  const updateVariant = (
    index,
    field,
    value
  ) => {
    const next = [
      ...form.variants,
    ];

    next[index] = {
      ...next[index],
      [field]: value,
    };

    updateForm(
      "variants",
      next
    );
  };

  const removeVariant = (
    index
  ) => {
    const next = [
      ...form.variants,
    ];

    next.splice(index, 1);

    updateForm(
      "variants",
      next
    );
  };

  /*
  ==================================================
  VARIANT IMAGE
  ==================================================
  */

  const addVariantImage = (
    variantIndex
  ) => {
    const url =
      window.prompt(
        "Variant image URL দিন:"
      );

    if (!url?.trim()) return;

    const next = [
      ...form.variants,
    ];

    const currentImages =
      Array.isArray(
        next[variantIndex]
          ?.images
      )
        ? next[variantIndex]
            .images
        : [];

    if (
      !currentImages.includes(
        url.trim()
      )
    ) {
      next[variantIndex] = {
        ...next[variantIndex],

        images: [
          ...currentImages,
          url.trim(),
        ],
      };

      updateForm(
        "variants",
        next
      );
    }
  };

  const removeVariantImage = (
    variantIndex,
    imageIndex
  ) => {
    const next = [
      ...form.variants,
    ];

    const images = [
      ...(next[variantIndex]
        ?.images || []),
    ];

    images.splice(
      imageIndex,
      1
    );

    next[variantIndex] = {
      ...next[variantIndex],
      images,
    };

    updateForm(
      "variants",
      next
    );
  };

  /*
  ==================================================
  VARIANT SIZE
  ==================================================
  */

  const addVariantSize = (
    variantIndex
  ) => {
    const next = [
      ...form.variants,
    ];

    const sizes = [
      ...(next[variantIndex]
        ?.sizes || []),
      {
        size: "",
        stock: 0,
      },
    ];

    next[variantIndex] = {
      ...next[variantIndex],
      sizes,
    };

    updateForm(
      "variants",
      next
    );
  };

  const updateVariantSize = (
    variantIndex,
    sizeIndex,
    field,
    value
  ) => {
    const next = [
      ...form.variants,
    ];

    const sizes = [
      ...(next[variantIndex]
        ?.sizes || []),
    ];

    sizes[sizeIndex] = {
      ...sizes[sizeIndex],
      [field]: value,
    };

    next[variantIndex] = {
      ...next[variantIndex],
      sizes,
    };

    updateForm(
      "variants",
      next
    );
  };

  const removeVariantSize = (
    variantIndex,
    sizeIndex
  ) => {
    const next = [
      ...form.variants,
    ];

    const sizes = [
      ...(next[variantIndex]
        ?.sizes || []),
    ];

    sizes.splice(
      sizeIndex,
      1
    );

    next[variantIndex] = {
      ...next[variantIndex],
      sizes,
    };

    updateForm(
      "variants",
      next
    );
  };

  /*
  ==================================================
  SAVE PRODUCT
  ==================================================
  */

  const handleSave = async (
    event
  ) => {
    event.preventDefault();

    if (!canManage) {
      setError(
        "আপনার product manage করার permission নেই।"
      );
      return;
    }

    setError("");
    setSuccess("");

    const name =
      String(form.name || "").trim();

    const price =
      Number(form.price);

    const oldPrice =
      Number(form.oldPrice || 0);

    if (!name) {
      setError(
        "Product name দিতে হবে।"
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError(
        "Valid product price দিতে হবে।"
      );
      return;
    }

    if (
      !Number.isFinite(oldPrice) ||
      oldPrice < 0
    ) {
      setError(
        "Valid old price দিতে হবে।"
      );
      return;
    }

    /*
    ----------------------------------------------
    TAGS
    ----------------------------------------------
    */

    const cleanTags = [
      ...new Set(
        (form.tags || [])
          .map((tag) =>
            String(tag || "")
              .trim()
          )
          .filter(Boolean)
      ),
    ];

    /*
    ----------------------------------------------
    DETAILS
    ----------------------------------------------
    */

    const cleanFeatures =
      (form.details?.features || [])
        .map((item) =>
          String(item || "")
            .trim()
        )
        .filter(Boolean);

    const cleanSpecifications =
      (
        form.details
          ?.specifications || []
      )
        .map((item) => ({
          name: String(
            item?.name || ""
          ).trim(),

          value: String(
            item?.value || ""
          ).trim(),
        }))
        .filter(
          (item) =>
            item.name ||
            item.value
        );

    const cleanHowToUse =
      normalizeStringArray(
        form.details?.howToUse
      );

    const cleanCareInstructions =
      normalizeStringArray(
        form.details
          ?.careInstructions
      );

    const cleanWhatsIncluded =
      normalizeStringArray(
        form.details
          ?.whatsIncluded
      );

    /*
    ----------------------------------------------
    VARIANTS
    ----------------------------------------------
    */

    const cleanVariants =
      (form.variants || []).map(
        (variant) => {
          const sizes =
            Array.isArray(
              variant.sizes
            )
              ? variant.sizes
                  .map((size) => ({
                    size: String(
                      size?.size ||
                        ""
                    ).trim(),

                    stock: Math.max(
                      0,
                      Number(
                        size?.stock ||
                          0
                      )
                    ),
                  }))
                  .filter(
                    (size) =>
                      size.size
                  )
              : [];

          const variantStock =
            Number(
              variant.stock || 0
            );

          const sizeStock =
            sizes.reduce(
              (sum, size) =>
                sum +
                Number(
                  size.stock || 0
                ),
              0
            );

          return {
            variantId:
              String(
                variant.variantId ||
                  createVariantId()
              ).trim(),

            color: String(
              variant.color ||
                ""
            ).trim(),

            colorCode: String(
              variant.colorCode ||
                ""
            ).trim(),

            price:
              Number(
                variant.price ||
                  price
              ),

            oldPrice:
              Number(
                variant.oldPrice ||
                  oldPrice
              ),

            stock:
              sizes.length
                ? sizeStock
                : Math.max(
                    0,
                    variantStock
                  ),

            images:
              Array.isArray(
                variant.images
              )
                ? [
                    ...new Set(
                      variant.images
                        .map(
                          (img) =>
                            String(
                              img ||
                                ""
                            ).trim()
                        )
                        .filter(
                          Boolean
                        )
                    ),
                  ]
                : [],

            sizes,
          };
        }
      );

    /*
    ----------------------------------------------
    TOP LEVEL STOCK
    ----------------------------------------------
    */

    const hasVariants =
      cleanVariants.length > 0;

    const finalStock =
      hasVariants
        ? cleanVariants.reduce(
            (total, variant) =>
              total +
              Number(
                variant.stock || 0
              ),
            0
          )
        : Math.max(
            0,
            Number(form.stock || 0)
          );

    /*
    ----------------------------------------------
    DISCOUNT
    ----------------------------------------------
    */

    const discount =
      oldPrice > price &&
      oldPrice > 0
        ? Math.round(
            ((oldPrice - price) /
              oldPrice) *
              100
          )
        : 0;

    /*
    ----------------------------------------------
    PAYLOAD
    ----------------------------------------------
    */

    const payload = {
      name,

      brand: String(
        form.brand || ""
      ).trim(),

      category: String(
        form.category || ""
      ).trim(),

      price,

      oldPrice,

      discount,

      stock: finalStock,

      rating: Math.max(
        0,
        Math.min(
          5,
          Number(
            form.rating || 0
          )
        )
      ),

      reviews: Math.max(
        0,
        Number(
          form.reviews || 0
        )
      ),

      isNew: Boolean(
        form.isNew
      ),

      isFeatured: Boolean(
        form.isFeatured
      ),

      image: String(
        form.image || ""
      ).trim(),

      images: [
        ...new Set(
          (form.images || [])
            .map((image) =>
              String(
                image || ""
              ).trim()
            )
            .filter(Boolean)
        ),
      ],

      description: String(
        form.description || ""
      ).trim(),

      tags: cleanTags,

      variants:
        cleanVariants,

      details: {
        shortDescription:
          String(
            form.details
              ?.shortDescription ||
              ""
          ).trim(),

        overview:
          String(
            form.details
              ?.overview || ""
          ).trim(),

        features:
          cleanFeatures,

        specifications:
          cleanSpecifications,

        howToUse:
          cleanHowToUse,

        careInstructions:
          cleanCareInstructions,

        whatsIncluded:
          cleanWhatsIncluded,

        deliveryInfo:
          String(
            form.details
              ?.deliveryInfo ||
              ""
          ).trim(),

        returnPolicy:
          String(
            form.details
              ?.returnPolicy ||
              ""
          ).trim(),

        warranty:
          String(
            form.details
              ?.warranty ||
              ""
          ).trim(),
      },

      sku: String(
        form.sku || ""
      ).trim(),

      barcode: String(
        form.barcode || ""
      ).trim(),

      costPrice: Math.max(
        0,
        Number(
          form.costPrice || 0
        )
      ),

      supplier: String(
        form.supplier || ""
      ).trim(),

      tenantId: String(
        form.tenantId || ""
      ).trim(),
    };

    /*
    IMPORTANT:
    Existing Mongo product update needs _id.
    */

    if (
      editing &&
      editing !== "new"
    ) {
      payload._id = editing;
    }

    try {
      setSaving(true);

      const saved =
        await saveProduct(
          payload
        );

      console.log(
        "PRODUCT SAVED:",
        saved
      );

      setEditing(null);

      setForm({
        ...emptyForm,
        tenantId:
          tenants?.[0]?.id || "",
        details: {
          ...emptyDetails,
          features: [],
          specifications: [],
          howToUse: [],
          careInstructions: [],
          whatsIncluded: [],
        },
      });

      setGalleryInput("");

      await loadProducts();

      showSuccess(
        editing === "new"
          ? "Product successfully created."
          : "Product successfully updated."
      );
    } catch (err) {
      console.error(
        "SAVE PRODUCT ERROR:",
        err
      );

      setError(
        err?.message ||
          "Product save করা যায়নি।"
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  ==================================================
  CANCEL EDIT
  ==================================================
  */

  const cancelEdit = () => {
    setEditing(null);

    setForm({
      ...emptyForm,
      tenantId:
        tenants?.[0]?.id || "",
      details: {
        ...emptyDetails,
        features: [],
        specifications: [],
        howToUse: [],
        careInstructions: [],
        whatsIncluded: [],
      },
    });

    setGalleryInput("");
    setError("");
  };

  /*
  ==================================================
  DELETE
  ==================================================
  */

  const handleDelete = async (
    product
  ) => {
    if (!canManage) {
      setError(
        "আপনার product delete করার permission নেই।"
      );
      return;
    }

    const productId =
      product?._id ||
      product?.id ||
      product?.productId;

    if (!productId) {
      setError(
        "Product ID পাওয়া যায়নি।"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `"${product?.name}" product delete করতে চান?`
      );

    if (!confirmed) return;

    try {
      setDeletingId(
        productId
      );

      setError("");

      await deleteProduct(
        productId
      );

      if (
        historyFor ===
        productId
      ) {
        setHistoryFor(null);
        setHistory([]);
      }

      await loadProducts();

      showSuccess(
        "Product successfully deleted."
      );
    } catch (err) {
      console.error(
        "DELETE PRODUCT ERROR:",
        err
      );

      setError(
        err?.message ||
          "Product delete করা যায়নি।"
      );
    } finally {
      setDeletingId(null);
    }
  };

  /*
  ==================================================
  STOCK ADJUSTMENT
  ==================================================
  */

  const handleStockAdjustment = async (
    product,
    direction
  ) => {
    if (!canManage) {
      setError(
        "আপনার stock manage করার permission নেই।"
      );
      return;
    }

    const productId =
      product?._id ||
      product?.id ||
      product?.productId;

    if (!productId) {
      setError(
        "Product ID পাওয়া যায়নি।"
      );
      return;
    }

    const amountInput =
      window.prompt(
        direction > 0
          ? "কত stock add করবেন?"
          : "কত stock কমাবেন?"
      );

    if (
      amountInput === null
    ) {
      return;
    }

    const amount =
      Number(amountInput);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(amount)
    ) {
      setError(
        "Valid positive integer দিতে হবে।"
      );
      return;
    }

    const currentStock =
      Number(
        product?.stock || 0
      );

    if (
      direction < 0 &&
      amount > currentStock
    ) {
      setError(
        "বর্তমান stock-এর চেয়ে বেশি কমানো যাবে না।"
      );
      return;
    }

    const reason =
      window.prompt(
        "Stock adjustment reason:",
        direction > 0
          ? "Stock added"
          : "Stock removed"
      );

    if (reason === null) {
      return;
    }

    try {
      setAdjustingId(
        productId
      );

      setError("");

      await adjustStock(
        productId,
        direction * amount,
        reason,
        admin?.id || ""
      );

      await loadProducts();

      if (
        historyFor === productId
      ) {
        await loadHistory(
          productId
        );
      }

      showSuccess(
        direction > 0
          ? "Stock successfully added."
          : "Stock successfully reduced."
      );
    } catch (err) {
      console.error(
        "STOCK ADJUSTMENT ERROR:",
        err
      );

      setError(
        err?.message ||
          "Stock update করা যায়নি।"
      );
    } finally {
      setAdjustingId(null);
    }
  };

  /*
  ==================================================
  STOCK HISTORY
  ==================================================
  */

  const loadHistory = async (
    productId
  ) => {
    try {
      setHistoryLoading(true);

      const data =
        await getStockAdjustments(
          productId
        );

      setHistory(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "STOCK HISTORY ERROR:",
        err
      );

      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = async (
    productId
  ) => {
    if (
      historyFor === productId
    ) {
      setHistoryFor(null);
      setHistory([]);
      return;
    }

    setHistoryFor(
      productId
    );

    await loadHistory(
      productId
    );
  };

  /*
  ==================================================
  DETAILS ARRAY EDITOR
  ==================================================
  */

  const ArrayEditor = ({
    title,
    field,
    placeholder,
    icon: Icon,
  }) => {
    const values =
      form.details?.[field] || [];

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <Icon
                size={17}
                className="text-amber-500"
              />
            )}

            <h4 className="font-semibold text-gray-800">
              {title}
            </h4>
          </div>

          <button
            type="button"
            onClick={() =>
              addDetailItem(field)
            }
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            <Plus size={15} />
            Add
          </button>
        </div>

        {values.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
            No items added yet.
          </div>
        ) : (
          values.map(
            (value, index) => (
              <div
                key={index}
                className="flex gap-2"
              >
                <input
                  value={value}
                  onChange={(e) =>
                    updateDetailItem(
                      field,
                      index,
                      e.target.value
                    )
                  }
                  placeholder={
                    placeholder
                  }
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-amber-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    removeDetailItem(
                      field,
                      index
                    )
                  }
                  className="rounded-xl border border-red-200 px-3 text-red-500 hover:bg-red-50"
                >
                  <Trash2
                    size={17}
                  />
                </button>
              </div>
            )
          )
        )}
      </div>
    );
  };

  /*
  ==================================================
  UI
  ==================================================
  */

  return (
    <AdminLayout
      title="Products"
      subtitle="Professional product catalog & inventory management"
    >
      <div className="space-y-6">

        {/* =========================================
            ALERTS
        ========================================= */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
            <Check size={20} />

            <span className="font-medium">
              {success}
            </span>
          </div>
        )}

        {/* =========================================
            HEADER
        ========================================= */}

        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                <Package size={25} />
              </div>

              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Product Catalog
                </h1>

                <p className="text-sm text-gray-500">
                  Manage products, variants,
                  pricing and inventory.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-gray-50 px-4 py-2">
              <p className="text-xs text-gray-500">
                Products
              </p>
              <p className="font-bold">
                {stats.total}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 px-4 py-2">
              <p className="text-xs text-gray-500">
                Stock
              </p>
              <p className="font-bold">
                {stats.totalStock}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 px-4 py-2">
              <p className="text-xs text-gray-500">
                Featured
              </p>
              <p className="font-bold">
                {stats.featured}
              </p>
            </div>

            <button
              type="button"
              onClick={loadProducts}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            {canManage && (
              <button
                type="button"
                onClick={startNew}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 font-semibold text-white hover:bg-gray-800"
              >
                <Plus size={18} />
                New Product
              </button>
            )}
          </div>
        </div>

        {/* =========================================
            PRODUCT FORM
        ========================================= */}

        {editing !== null && (
          <form
            onSubmit={handleSave}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 bg-gray-50/70 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                    {editing === "new"
                      ? "Create"
                      : "Update"}
                  </p>

                  <h2 className="text-xl font-bold text-gray-900">
                    {editing === "new"
                      ? "Create New Product"
                      : "Edit Product"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-gray-200 bg-white p-2 hover:bg-gray-50"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="space-y-8 p-5">

              {/* =====================================
                  BASIC INFORMATION
              ===================================== */}

              <section>
                <SectionTitle
                  icon={Info}
                  title="Basic Information"
                  description="Main product identity and classification"
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                  <Field
                    label="Product Name"
                    required
                  >
                    <input
                      value={form.name}
                      onChange={(e) =>
                        updateForm(
                          "name",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Wireless Bluetooth Headphones"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Brand">
                    <input
                      value={form.brand}
                      onChange={(e) =>
                        updateForm(
                          "brand",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Sony"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Category">
                    <input
                      value={form.category}
                      onChange={(e) =>
                        updateForm(
                          "category",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Electronics"
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="SKU"
                  >
                    <input
                      value={form.sku}
                      onChange={(e) =>
                        updateForm(
                          "sku",
                          e.target.value
                        )
                      }
                      placeholder="Product SKU"
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Supplier"
                  >
                    <input
                      value={form.supplier}
                      onChange={(e) =>
                        updateForm(
                          "supplier",
                          e.target.value
                        )
                      }
                      placeholder="Supplier name"
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Tenant"
                  >
                    <select
                      value={form.tenantId}
                      onChange={(e) =>
                        updateForm(
                          "tenantId",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Select tenant
                      </option>

                      {tenants.map(
                        (tenant) => (
                          <option
                            key={
                              tenant.id
                            }
                            value={
                              tenant.id
                            }
                          >
                            {tenant.name ||
                              tenant.id}
                          </option>
                        )
                      )}
                    </select>
                  </Field>
                </div>
              </section>

              {/* =====================================
                  PRICING
              ===================================== */}

              <section>
                <SectionTitle
                  icon={Tag}
                  title="Pricing"
                  description="Selling price, previous price and cost"
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                  <Field
                    label="Selling Price"
                    required
                  >
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) =>
                        updateForm(
                          "price",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Old Price">
                    <input
                      type="number"
                      min="0"
                      value={
                        form.oldPrice
                      }
                      onChange={(e) =>
                        updateForm(
                          "oldPrice",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Discount">
                    <div className="relative">
                      <input
                        value={
                          calculatedDiscount
                        }
                        readOnly
                        className={`${inputClass} pr-12 bg-gray-50`}
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                        %
                      </span>
                    </div>
                  </Field>

                  <Field label="Cost Price">
                    <input
                      type="number"
                      min="0"
                      value={
                        form.costPrice
                      }
                      onChange={(e) =>
                        updateForm(
                          "costPrice",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                {Number(form.costPrice) >
                  0 &&
                  Number(form.price) >
                    0 && (
                    <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                      Estimated profit per unit:{" "}
                      <strong>
                        {currency(
                          Number(
                            form.price
                          ) -
                            Number(
                              form.costPrice
                            )
                        )}
                      </strong>
                    </div>
                  )}
              </section>

              {/* =====================================
                  STOCK
              ===================================== */}

              <section>
                <SectionTitle
                  icon={Layers3}
                  title="Inventory"
                  description="Stock quantity and inventory control"
                />

                <div className="grid gap-4 md:grid-cols-3">

                  <Field
                    label={
                      form.variants.length
                        ? "Calculated Stock"
                        : "Stock"
                    }
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        form.variants.length
                          ? calculatedVariantStock
                          : form.stock
                      }
                      disabled={
                        form.variants.length >
                        0 ||
                        editing !==
                          "new"
                      }
                      onChange={(e) =>
                        updateForm(
                          "stock",
                          e.target.value
                        )
                      }
                      className={`${inputClass} disabled:bg-gray-50`}
                    />

                    {editing !==
                      "new" && (
                      <p className="mt-1 text-xs text-gray-500">
                        Existing product stock
                        should be managed from
                        stock adjustment controls.
                      </p>
                    )}
                  </Field>

                  <Field
                    label="Rating"
                  >
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={
                        form.rating
                      }
                      onChange={(e) =>
                        updateForm(
                          "rating",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Reviews"
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        form.reviews
                      }
                      onChange={(e) =>
                        updateForm(
                          "reviews",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                {form.variants.length >
                  0 && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                    <strong>
                      Variant stock:
                    </strong>{" "}
                    {calculatedVariantStock} units
                  </div>
                )}
              </section>

              {/* =====================================
                  FLAGS
              ===================================== */}

              <section>
                <SectionTitle
                  icon={Star}
                  title="Product Flags"
                  description="Control how this product is highlighted"
                />

                <div className="flex flex-wrap gap-4">

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={
                        form.isNew
                      }
                      onChange={(e) =>
                        updateForm(
                          "isNew",
                          e.target
                            .checked
                        )
                      }
                      className="h-4 w-4 accent-amber-500"
                    />

                    <span className="font-medium">
                      Mark as New
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={
                        form.isFeatured
                      }
                      onChange={(e) =>
                        updateForm(
                          "isFeatured",
                          e.target
                            .checked
                        )
                      }
                      className="h-4 w-4 accent-amber-500"
                    />

                    <span className="font-medium">
                      Featured Product
                    </span>
                  </label>
                </div>
              </section>

              {/* =====================================
                  IMAGES
              ===================================== */}

              <section>
                <SectionTitle
                  icon={ImagePlus}
                  title="Product Images"
                  description="Main image and product gallery"
                />

                <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">

                  <Field
                    label="Main Image URL"
                  >
                    <input
                      value={
                        form.image
                      }
                      onChange={(e) =>
                        updateForm(
                          "image",
                          e.target.value
                        )
                      }
                      placeholder="https://..."
                      className={inputClass}
                    />

                    {form.image && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                        <img
                          src={
                            form.image
                          }
                          alt={
                            form.name ||
                            "Product"
                          }
                          className="h-48 w-full object-contain"
                          onError={(
                            e
                          ) => {
                            e.currentTarget.style.display =
                              "none";
                          }}
                        />
                      </div>
                    )}
                  </Field>

                  <div>
                    <label className={labelClass}>
                      Gallery Images
                    </label>

                    <div className="flex gap-2">
                      <input
                        value={
                          galleryInput
                        }
                        onChange={(e) =>
                          setGalleryInput(
                            e.target
                              .value
                          )
                        }
                        onKeyDown={(
                          e
                        ) => {
                          if (
                            e.key ===
                            "Enter"
                          ) {
                            e.preventDefault();
                            addGalleryImage();
                          }
                        }}
                        placeholder="Paste image URL"
                        className={inputClass}
                      />

                      <button
                        type="button"
                        onClick={
                          addGalleryImage
                        }
                        className="rounded-xl bg-gray-900 px-4 text-white"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {form.images.map(
                        (
                          image,
                          index
                        ) => (
                          <div
                            key={`${image}-${index}`}
                            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                          >
                            <img
                              src={
                                image
                              }
                              alt=""
                              className="h-28 w-full object-cover"
                              onError={(
                                e
                              ) => {
                                e.currentTarget.style.display =
                                  "none";
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeGalleryImage(
                                  index
                                )
                              }
                              className="absolute right-2 top-2 rounded-lg bg-white p-1.5 text-red-500 shadow"
                            >
                              <X
                                size={14}
                              />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* =====================================
                  DESCRIPTION
              ===================================== */}

              <section>
                <SectionTitle
                  icon={Info}
                  title="Description"
                  description="Customer-facing product information"
                />

                <div className="space-y-4">

                  <Field
                    label="Short Description"
                  >
                    <textarea
                      value={
                        form.details
                          ?.shortDescription ||
                        ""
                      }
                      onChange={(e) =>
                        updateDetails(
                          "shortDescription",
                          e.target
                            .value
                        )
                      }
                      rows={3}
                      placeholder="Short product summary..."
                      className={textareaClass}
                    />
                  </Field>

                  <Field
                    label="Full Description"
                  >
                    <textarea
                      value={
                        form.description
                      }
                      onChange={(e) =>
                        updateForm(
                          "description",
                          e.target
                            .value
                        )
                      }
                      rows={6}
                      placeholder="Write complete product description..."
                      className={textareaClass}
                    />
                  </Field>

                  <Field
                    label="Overview"
                  >
                    <textarea
                      value={
                        form.details
                          ?.overview ||
                        ""
                      }
                      onChange={(e) =>
                        updateDetails(
                          "overview",
                          e.target
                            .value
                        )
                      }
                      rows={5}
                      placeholder="Detailed product overview..."
                      className={textareaClass}
                    />
                  </Field>
                </div>
              </section>

              {/* =====================================
                  TAGS
              ===================================== */}

              <section>
                <SectionTitle
                  icon={Tag}
                  title="Tags"
                  description="Search and product discovery keywords"
                />

                <div className="flex flex-wrap gap-2">
                  {form.tags.map(
                    (
                      tag,
                      index
                    ) => (
                      <span
                        key={`${tag}-${index}`}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium"
                      >
                        #{tag}

                        <button
                          type="button"
                          onClick={() =>
                            removeTag(
                              index
                            )
                          }
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X
                            size={14}
                          />
                        </button>
                      </span>
                    )
                  )}

                  <button
                    type="button"
                    onClick={addTag}
                    className="inline-flex items-center gap-2 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                  >
                    <Plus size={14} />
                    Add Tag
                  </button>
                </div>
              </section>

              {/* =====================================
                  VARIANTS
              ===================================== */}

              <section>
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <SectionTitle
                    icon={Palette}
                    title="Product Variants"
                    description="Colors, variant pricing, images and size stock"
                  />

                  <button
                    type="button"
                    onClick={
                      addVariant
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Plus size={17} />
                    Add Variant
                  </button>
                </div>

                {form.variants.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
                    <Palette
                      size={30}
                      className="mx-auto text-gray-400"
                    />

                    <p className="mt-2 font-semibold text-gray-700">
                      No variants
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Add variants if your product
                      has different colors, prices
                      or sizes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {form.variants.map(
                      (
                        variant,
                        variantIndex
                      ) => (
                        <div
                          key={
                            variant.variantId ||
                            variantIndex
                          }
                          className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5"
                        >
                          <div className="mb-5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                                Variant #
                                {variantIndex +
                                  1}
                              </p>

                              <p className="mt-1 text-sm font-medium text-gray-700">
                                {variant.color ||
                                  "Unnamed variant"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeVariant(
                                  variantIndex
                                )
                              }
                              className="rounded-xl border border-red-200 bg-white p-2 text-red-500 hover:bg-red-50"
                            >
                              <Trash2
                                size={17}
                              />
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                            <Field label="Variant ID">
                              <input
                                value={
                                  variant.variantId
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateVariant(
                                    variantIndex,
                                    "variantId",
                                    e.target
                                      .value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Color">
                              <input
                                value={
                                  variant.color
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateVariant(
                                    variantIndex,
                                    "color",
                                    e.target
                                      .value
                                  )
                                }
                                placeholder="Black"
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Color Code">
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={
                                    /^#[0-9A-Fa-f]{6}$/.test(
                                      variant.colorCode
                                    )
                                      ? variant.colorCode
                                      : "#000000"
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updateVariant(
                                      variantIndex,
                                      "colorCode",
                                      e.target
                                        .value
                                    )
                                  }
                                  className="h-11 w-14 rounded-xl border border-gray-200 bg-white p-1"
                                />

                                <input
                                  value={
                                    variant.colorCode
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updateVariant(
                                      variantIndex,
                                      "colorCode",
                                      e.target
                                        .value
                                    )
                                  }
                                  placeholder="#000000"
                                  className={`${inputClass} flex-1`}
                                />
                              </div>
                            </Field>

                            <Field label="Variant Price">
                              <input
                                type="number"
                                min="0"
                                value={
                                  variant.price
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateVariant(
                                    variantIndex,
                                    "price",
                                    e.target
                                      .value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Variant Old Price">
                              <input
                                type="number"
                                min="0"
                                value={
                                  variant.oldPrice
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateVariant(
                                    variantIndex,
                                    "oldPrice",
                                    e.target
                                      .value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field
                              label={
                                variant.sizes
                                  ?.length
                                  ? "Variant Stock (calculated)"
                                  : "Variant Stock"
                              }
                            >
                              <input
                                type="number"
                                min="0"
                                value={
                                  variant.sizes
                                    ?.length
                                    ? variant.sizes.reduce(
                                        (
                                          sum,
                                          size
                                        ) =>
                                          sum +
                                          Number(
                                            size?.stock ||
                                              0
                                          ),
                                        0
                                      )
                                    : variant.stock
                                }
                                disabled={
                                  variant.sizes
                                    ?.length >
                                  0
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateVariant(
                                    variantIndex,
                                    "stock",
                                    e.target
                                      .value
                                  )
                                }
                                className={`${inputClass} disabled:bg-gray-100`}
                              />
                            </Field>
                          </div>

                          {/* VARIANT IMAGES */}

                          <div className="mt-5">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="font-semibold text-gray-800">
                                Variant Images
                              </h4>

                              <button
                                type="button"
                                onClick={() =>
                                  addVariantImage(
                                    variantIndex
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium"
                              >
                                <Plus size={14} />
                                Add Image
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                              {(
                                variant.images ||
                                []
                              ).map(
                                (
                                  image,
                                  imageIndex
                                ) => (
                                  <div
                                    key={`${image}-${imageIndex}`}
                                    className="relative overflow-hidden rounded-xl border border-gray-200 bg-white"
                                  >
                                    <img
                                      src={
                                        image
                                      }
                                      alt=""
                                      className="h-24 w-full object-cover"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeVariantImage(
                                          variantIndex,
                                          imageIndex
                                        )
                                      }
                                      className="absolute right-1.5 top-1.5 rounded-lg bg-white p-1 text-red-500 shadow"
                                    >
                                      <X
                                        size={13}
                                      />
                                    </button>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {/* SIZES */}

                          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Ruler
                                  size={17}
                                  className="text-amber-500"
                                />

                                <h4 className="font-semibold">
                                  Sizes & Stock
                                </h4>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  addVariantSize(
                                    variantIndex
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                              >
                                <Plus
                                  size={14}
                                />
                                Add Size
                              </button>
                            </div>

                            {variant.sizes
                              ?.length ===
                            0 ? (
                              <p className="text-sm text-gray-500">
                                No sizes. Variant-level
                                stock will be used.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {variant.sizes.map(
                                  (
                                    size,
                                    sizeIndex
                                  ) => (
                                    <div
                                      key={
                                        sizeIndex
                                      }
                                      className="flex gap-2"
                                    >
                                      <input
                                        value={
                                          size.size
                                        }
                                        onChange={(
                                          e
                                        ) =>
                                          updateVariantSize(
                                            variantIndex,
                                            sizeIndex,
                                            "size",
                                            e.target
                                              .value
                                          )
                                        }
                                        placeholder="S / M / L / XL"
                                        className={`${inputClass} flex-1`}
                                      />

                                      <input
                                        type="number"
                                        min="0"
                                        value={
                                          size.stock
                                        }
                                        onChange={(
                                          e
                                        ) =>
                                          updateVariantSize(
                                            variantIndex,
                                            sizeIndex,
                                            "stock",
                                            e.target
                                              .value
                                          )
                                        }
                                        placeholder="Stock"
                                        className={`${inputClass} w-32`}
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeVariantSize(
                                            variantIndex,
                                            sizeIndex
                                          )
                                        }
                                        className="rounded-xl border border-red-200 px-3 text-red-500"
                                      >
                                        <Trash2
                                          size={
                                            16
                                          }
                                        />
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>

              {/* =====================================
                  PRODUCT DETAILS
              ===================================== */}

              <section className="overflow-hidden rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() =>
                    setDetailsOpen(
                      (prev) => !prev
                    )
                  }
                  className="flex w-full items-center justify-between bg-gray-50 p-5 text-left"
                >
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Product Details
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Features, specifications,
                      usage, delivery and policies.
                    </p>
                  </div>

                  {detailsOpen ? (
                    <ChevronUp />
                  ) : (
                    <ChevronDown />
                  )}
                </button>

                {detailsOpen && (
                  <div className="space-y-7 p-5">

                    {/* FEATURES */}

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-semibold">
                          Key Features
                        </h4>

                        <button
                          type="button"
                          onClick={
                            addFeature
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        >
                          <Plus size={14} />
                          Add Feature
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(
                          form.details
                            ?.features ||
                          []
                        ).map(
                          (
                            feature,
                            index
                          ) => (
                            <div
                              key={index}
                              className="flex gap-2"
                            >
                              <input
                                value={
                                  feature
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateFeature(
                                    index,
                                    e.target
                                      .value
                                  )
                                }
                                placeholder="e.g. Fast Bluetooth 5.3 connectivity"
                                className={`${inputClass} flex-1`}
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeFeature(
                                    index
                                  )
                                }
                                className="rounded-xl border border-red-200 px-3 text-red-500"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* SPECIFICATIONS */}

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-semibold">
                          Specifications
                        </h4>

                        <button
                          type="button"
                          onClick={
                            addSpecification
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        >
                          <Plus size={14} />
                          Add Specification
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(
                          form.details
                            ?.specifications ||
                          []
                        ).map(
                          (
                            specification,
                            index
                          ) => (
                            <div
                              key={index}
                              className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
                            >
                              <input
                                value={
                                  specification.name
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateSpecification(
                                    index,
                                    "name",
                                    e.target
                                      .value
                                  )
                                }
                                placeholder="Name"
                                className={inputClass}
                              />

                              <input
                                value={
                                  specification.value
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateSpecification(
                                    index,
                                    "value",
                                    e.target
                                      .value
                                  )
                                }
                                placeholder="Value"
                                className={inputClass}
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeSpecification(
                                    index
                                  )
                                }
                                className="rounded-xl border border-red-200 px-3 text-red-500"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* ARRAY DETAILS */}

                    <ArrayEditor
                      title="How To Use"
                      field="howToUse"
                      placeholder="Usage instruction"
                      icon={Check}
                    />

                    <ArrayEditor
                      title="Care Instructions"
                      field="careInstructions"
                      placeholder="Care instruction"
                      icon={ShieldCheck}
                    />

                    <ArrayEditor
                      title="What's Included"
                      field="whatsIncluded"
                      placeholder="Included item"
                      icon={Package}
                    />

                    {/* DELIVERY */}

                    <Field
                      label="Delivery Information"
                    >
                      <textarea
                        value={
                          form.details
                            ?.deliveryInfo ||
                          ""
                        }
                        onChange={(e) =>
                          updateDetails(
                            "deliveryInfo",
                            e.target
                              .value
                          )
                        }
                        rows={4}
                        placeholder="Delivery time, delivery area, charges..."
                        className={textareaClass}
                      />
                    </Field>

                    {/* RETURN */}

                    <Field
                      label="Return Policy"
                    >
                      <textarea
                        value={
                          form.details
                            ?.returnPolicy ||
                          ""
                        }
                        onChange={(e) =>
                          updateDetails(
                            "returnPolicy",
                            e.target
                              .value
                          )
                        }
                        rows={4}
                        placeholder="Return and replacement policy..."
                        className={textareaClass}
                      />
                    </Field>

                    {/* WARRANTY */}

                    <Field
                      label="Warranty"
                    >
                      <textarea
                        value={
                          form.details
                            ?.warranty ||
                          ""
                        }
                        onChange={(e) =>
                          updateDetails(
                            "warranty",
                            e.target
                              .value
                          )
                        }
                        rows={4}
                        placeholder="Warranty information..."
                        className={textareaClass}
                      />
                    </Field>
                  </div>
                )}
              </section>

              {/* =====================================
                  BARCODE
              ===================================== */}

              <section>
                <SectionTitle
                  icon={Barcode}
                  title="Barcode"
                  description="Product barcode information"
                />

                <div className="grid gap-5 lg:grid-cols-2">
                  <Field label="Barcode">
                    <input
                      value={
                        form.barcode
                      }
                      onChange={(e) =>
                        updateForm(
                          "barcode",
                          e.target.value
                        )
                      }
                      placeholder="Barcode"
                      className={inputClass}
                    />
                  </Field>

                  {form.barcode && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Barcode Preview
                      </p>

                      <div className="flex min-h-28 items-center justify-center">
                        <BarcodeImage
                          value={
                            form.barcode
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* =====================================
                  SAVE BUTTONS
              ===================================== */}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    cancelEdit
                  }
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  <X size={18} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !canManage
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {editing ===
                      "new"
                        ? "Create Product"
                        : "Update Product"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* =========================================
            PRODUCT LIST
        ========================================= */}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                All Products
              </h2>

              <p className="text-sm text-gray-500">
                {products.length} products
                found
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-60 items-center justify-center rounded-3xl border border-gray-200 bg-white">
              <div className="text-center">
                <Loader2
                  size={32}
                  className="mx-auto animate-spin text-amber-500"
                />

                <p className="mt-3 text-sm text-gray-500">
                  Loading products...
                </p>
              </div>
            </div>
          ) : products.length ===
            0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <Package
                size={40}
                className="mx-auto text-gray-400"
              />

              <h3 className="mt-4 text-lg font-bold">
                No products found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Create your first product to
                get started.
              </p>

              {canManage && (
                <button
                  type="button"
                  onClick={
                    startNew
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white"
                >
                  <Plus size={18} />
                  Create Product
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {products.map(
                (product) => {
                  const productId =
                    product?._id ||
                    product?.id ||
                    product?.productId;

                  const variants =
                    Array.isArray(
                      product?.variants
                    )
                      ? product.variants
                      : [];

                  const profit =
                    Number(
                      product?.price || 0
                    ) -
                    Number(
                      product?.costPrice ||
                        0
                    );

                  return (
                    <div
                      key={
                        productId
                      }
                      className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                    >
                      {/* CARD HEADER */}

                      <div className="flex gap-4 p-5">
                        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                          {product?.image ? (
                            <img
                              src={
                                product.image
                              }
                              alt={
                                product.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">
                              <Package
                                size={
                                  28
                                }
                              />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="line-clamp-2 font-bold text-gray-900">
                                {
                                  product.name
                                }
                              </h3>

                              <p className="mt-1 text-sm text-gray-500">
                                {product.brand ||
                                  "No brand"}
                                {product.category
                                  ? ` • ${product.category}`
                                  : ""}
                              </p>
                            </div>

                            <div className="flex gap-1">
                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startEdit(
                                        product
                                      )
                                    }
                                    className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50"
                                    title="Edit"
                                  >
                                    <Pencil
                                      size={
                                        16
                                      }
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDelete(
                                        product
                                      )
                                    }
                                    disabled={
                                      deletingId ===
                                      productId
                                    }
                                    className="rounded-xl border border-red-200 p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                                    title="Delete"
                                  >
                                    {deletingId ===
                                    productId ? (
                                      <Loader2
                                        size={
                                          16
                                        }
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Trash2
                                        size={
                                          16
                                        }
                                      />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold">
                              {currency(
                                product.price
                              )}
                            </span>

                            {Number(
                              product.oldPrice
                            ) >
                              Number(
                                product.price
                              ) && (
                              <span className="text-sm text-gray-400 line-through">
                                {currency(
                                  product.oldPrice
                                )}
                              </span>
                            )}

                            {Number(
                              product.discount
                            ) >
                              0 && (
                              <span className="rounded-lg bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                                -
                                {
                                  product.discount
                                }
                                %
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CARD INFO */}

                      <div className="grid grid-cols-2 gap-px border-y border-gray-100 bg-gray-100 sm:grid-cols-4">
                        <InfoCell
                          label="Stock"
                          value={
                            product.stock
                          }
                        />

                        <InfoCell
                          label="Variants"
                          value={
                            variants.length
                          }
                        />

                        <InfoCell
                          label="Rating"
                          value={
                            product.rating
                              ? `★ ${product.rating}`
                              : "—"
                          }
                        />

                        <InfoCell
                          label="Reviews"
                          value={
                            product.reviews ||
                            0
                          }
                        />
                      </div>

                      {/* BADGES */}

                      <div className="flex flex-wrap gap-2 p-4">
                        {product.isNew && (
                          <Badge>
                            New
                          </Badge>
                        )}

                        {product.isFeatured && (
                          <Badge>
                            Featured
                          </Badge>
                        )}

                        {product.sku && (
                          <Badge>
                            SKU:{" "}
                            {
                              product.sku
                            }
                          </Badge>
                        )}

                        {product.productId && (
                          <Badge>
                            ID:{" "}
                            {
                              product.productId
                            }
                          </Badge>
                        )}

                        {variants.length >
                          0 && (
                          <Badge>
                            {
                              variants.length
                            }{" "}
                            variant
                            {variants.length >
                            1
                              ? "s"
                              : ""}
                          </Badge>
                        )}
                      </div>

                      {/* FINANCIAL INFO */}

                      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
                        <SmallStat
                          label="Cost"
                          value={currency(
                            product.costPrice
                          )}
                        />

                        <SmallStat
                          label="Profit / Unit"
                          value={currency(
                            profit
                          )}
                        />

                        <SmallStat
                          label="Barcode"
                          value={
                            product.barcode ||
                            "—"
                          }
                        />
                      </div>

                      {/* STOCK ACTIONS */}

                      {canManage && (
                        <div className="border-t border-gray-100 bg-gray-50 p-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleStockAdjustment(
                                  product,
                                  1
                                )
                              }
                              disabled={
                                adjustingId ===
                                productId
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
                            >
                              {adjustingId ===
                              productId ? (
                                <Loader2
                                  size={
                                    15
                                  }
                                  className="animate-spin"
                                />
                              ) : (
                                <PlusCircle
                                  size={
                                    15
                                  }
                                />
                              )}
                              Add Stock
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStockAdjustment(
                                  product,
                                  -1
                                )
                              }
                              disabled={
                                adjustingId ===
                                productId
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <MinusCircle
                                size={
                                  15
                                }
                              />
                              Reduce Stock
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleHistory(
                                  productId
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-100"
                            >
                              <History
                                size={
                                  15
                                }
                              />

                              {historyFor ===
                              productId
                                ? "Hide History"
                                : "Stock History"}
                            </button>
                          </div>

                          {/* HISTORY */}

                          {historyFor ===
                            productId && (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                              <div className="border-b border-gray-100 p-4">
                                <h4 className="font-bold">
                                  Stock History
                                </h4>
                              </div>

                              {historyLoading ? (
                                <div className="p-6 text-center">
                                  <Loader2
                                    size={
                                      22
                                    }
                                    className="mx-auto animate-spin text-amber-500"
                                  />
                                </div>
                              ) : history.length ===
                                0 ? (
                                <div className="p-6 text-center text-sm text-gray-500">
                                  No stock adjustment
                                  history found.
                                </div>
                              ) : (
                                <div className="divide-y divide-gray-100">
                                  {history.map(
                                    (
                                      item,
                                      index
                                    ) => {
                                      const delta =
                                        Number(
                                          item?.delta ||
                                            item?.quantity ||
                                            0
                                        );

                                      return (
                                        <div
                                          key={
                                            item?._id ||
                                            index
                                          }
                                          className="flex items-center justify-between gap-3 p-4"
                                        >
                                          <div>
                                            <p className="text-sm font-semibold">
                                              {item?.reason ||
                                                "Stock adjustment"}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                              {item?.createdAt
                                                ? new Date(
                                                    item.createdAt
                                                  ).toLocaleString(
                                                    "en-BD"
                                                  )
                                                : "—"}
                                            </p>
                                          </div>

                                          <span
                                            className={`font-bold ${
                                              delta >=
                                              0
                                                ? "text-green-600"
                                                : "text-red-600"
                                            }`}
                                          >
                                            {delta >=
                                            0
                                              ? "+"
                                              : ""}
                                            {
                                              delta
                                            }
                                          </span>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

/*
==================================================
REUSABLE UI COMPONENTS
==================================================
*/

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100";

const textareaClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100";

const labelClass =
  "mb-1.5 block text-sm font-semibold text-gray-700";

function Field({
  label,
  required = false,
  children,
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
        <Icon size={18} />
      </div>

      <div>
        <h3 className="font-bold text-gray-900">
          {title}
        </h3>

        <p className="mt-0.5 text-sm text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
}) {
  return (
    <div className="bg-white p-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function SmallStat({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
}) {
  return (
    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
      {children}
    </span>
  );
}