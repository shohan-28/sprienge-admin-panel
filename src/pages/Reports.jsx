import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, BarChart3 } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { getOrders } from "../api/orders.js";
import { getProducts } from "../api/products.js";
import { getAllAssignments } from "../api/assignments.js";
import { ADMINS } from "../config/admins.js";
import { getTenants } from "../config/tenants.js";
import { buildCustomerDirectory } from "../api/customers.js";
import { useAuth } from "../context/AuthContext.jsx";
import { hasPermission } from "../config/admins.js";

const currency = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const RANGE_OPTIONS = [
  { value: "today", label: "আজ" },
  { value: "week", label: "এই সপ্তাহ" },
  { value: "month", label: "এই মাস" },
  { value: "all", label: "সব সময়" },
];

const isWithinRange = (dateStr, range) => {
  if (range === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (range === "today") return d.toDateString() === now.toDateString();
  if (range === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
};

const exportRows = (filename, header, rows) => {
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const TABS = [
  "Sales",
  "Profit",
  "Products",
  "Customers",
  "Courier",
  "Returns",
  "Admin Performance",
  "Inventory",
  "Tenant",
];

const Reports = () => {
  const { admin } = useAuth();
  const canExport = hasPermission(admin, "exportData");
  const canViewFinance = hasPermission(admin, "viewFinance");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("month");
  const [tab, setTab] = useState("Sales");
  const products = getProducts();
  const assignments = getAllAssignments();
  const tenants = getTenants();

  useEffect(() => {
    getOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => orders.filter((o) => isWithinRange(o.createdAt, range)),
    [orders, range]
  );

  const visibleTabs = TABS.filter((t) => (t === "Profit" ? canViewFinance : true));

  return (
    <AdminLayout title="Reports Center" subtitle="সব রিপোর্ট এক জায়গায় — date filter ও CSV export সহ">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                range === r.value ? "bg-ink-900 text-white" : "bg-white text-slate-500 ring-1 ring-mist-200 hover:bg-mist-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 border-b border-mist-200 pb-3">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === t ? "bg-brand-600 text-white" : "bg-white text-slate-500 ring-1 ring-mist-200 hover:bg-mist-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" size={26} />
        </div>
      ) : (
        <div className="rounded-2xl border border-mist-200 bg-white p-6 shadow-card">
          {tab === "Sales" && <SalesReport orders={filtered} canExport={canExport} />}
          {tab === "Profit" && canViewFinance && (
            <ProfitReport orders={filtered} products={products} canExport={canExport} />
          )}
          {tab === "Products" && <ProductsReport orders={filtered} canExport={canExport} />}
          {tab === "Customers" && <CustomersReport orders={filtered} canExport={canExport} />}
          {tab === "Courier" && <CourierReport orders={filtered} canExport={canExport} />}
          {tab === "Returns" && <ReturnsReport orders={filtered} canExport={canExport} />}
          {tab === "Admin Performance" && (
            <AdminReport orders={filtered} assignments={assignments} canExport={canExport} />
          )}
          {tab === "Inventory" && <InventoryReport products={products} canExport={canExport} />}
          {tab === "Tenant" && <TenantReport orders={filtered} tenants={tenants} canExport={canExport} />}
        </div>
      )}
    </AdminLayout>
  );
};

const ReportHeader = ({ title, onExport, canExport }) => (
  <div className="mb-4 flex items-center justify-between">
    <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
      <BarChart3 size={17} className="text-brand-600" /> {title}
    </h3>
    {canExport && (
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-mist-100"
      >
        <Download size={13} /> CSV
      </button>
    )}
  </div>
);

const Stat = ({ label, value }) => (
  <div className="rounded-xl bg-mist-50 px-4 py-3">
    <p className="text-xs text-slate-400">{label}</p>
    <p className="mt-1 text-lg font-bold text-ink-900">{value}</p>
  </div>
);

const SalesReport = ({ orders, canExport }) => {
  const gross = orders.reduce((s, o) => s + (o.total || 0), 0);
  const net = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0);
  const codCollected = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + (o.total || 0), 0);
  const codPending = orders.filter((o) => ["pending", "confirmed", "processing", "shipped"].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0);

  return (
    <>
      <ReportHeader
        title="Sales Report"
        canExport={canExport}
        onExport={() =>
          exportRows(
            "sales-report.csv",
            ["Order ID", "Date", "Customer", "Total", "Status"],
            orders.map((o) => [o._id, new Date(o.createdAt).toLocaleDateString("en-GB"), o.name, o.total, o.status])
          )
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Gross Sales" value={currency(gross)} />
        <Stat label="Net Sales" value={currency(net)} />
        <Stat label="COD সংগৃহীত" value={currency(codCollected)} />
        <Stat label="COD বাকি (in-transit)" value={currency(codPending)} />
      </div>
    </>
  );
};

const ProfitReport = ({ orders, products, canExport }) => {
  const productMap = {};
  products.forEach((p) => (productMap[p.id] = p));

  let totalProfit = 0;
  let totalCost = 0;
  let totalRevenue = 0;
  const rows = [];

  orders
    .filter((o) => o.status !== "cancelled")
    .forEach((o) => {
      (o.items || []).forEach((it) => {
        const cost = it.productId && productMap[it.productId] ? productMap[it.productId].costPrice || 0 : 0;
        const revenue = (it.price || 0) * (it.quantity || 1);
        const costTotal = cost * (it.quantity || 1);
        const profit = revenue - costTotal;
        totalProfit += profit;
        totalCost += costTotal;
        totalRevenue += revenue;
        rows.push([o._id, it.name, it.quantity, it.price, cost, profit]);
      });
    });

  return (
    <>
      <ReportHeader
        title="Profit Report"
        canExport={canExport}
        onExport={() =>
          exportRows(
            "profit-report.csv",
            ["Order ID", "Product", "Qty", "Sale Price", "Cost Price", "Profit"],
            rows
          )
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total Revenue" value={currency(totalRevenue)} />
        <Stat label="Total Cost" value={currency(totalCost)} />
        <Stat label="Total Profit" value={currency(totalProfit)} />
      </div>
      <p className="mt-3 text-xs text-slate-400">
        শুধু Create Order দিয়ে তৈরি অর্ডারের item-এ productId থাকে (Products
        ক্যাটালগ থেকে সিলেক্ট করা), তাই cost/profit শুধু ওই আইটেমগুলোর জন্য
        হিসাব হয়েছে — অন্য উৎস থেকে আসা অর্ডারে cost price জানা নেই বলে
        cost 0 ধরা হয়েছে।
      </p>
    </>
  );
};

const ProductsReport = ({ orders, canExport }) => {
  const map = {};
  orders
    .filter((o) => o.status !== "cancelled")
    .forEach((o) =>
      (o.items || []).forEach((it) => {
        const key = it.name || "Unnamed";
        if (!map[key]) map[key] = { name: key, qty: 0, amount: 0 };
        map[key].qty += it.quantity || 0;
        map[key].amount += (it.price || 0) * (it.quantity || 0);
      })
    );
  const list = Object.values(map).sort((a, b) => b.qty - a.qty);

  return (
    <>
      <ReportHeader
        title="Product Report"
        canExport={canExport}
        onExport={() => exportRows("product-report.csv", ["Product", "Qty Sold", "Amount"], list.map((p) => [p.name, p.qty, p.amount]))}
      />
      <div className="space-y-1.5">
        {list.map((p) => (
          <div key={p.name} className="flex items-center justify-between rounded-lg bg-mist-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">{p.name}</span>
            <span className="text-slate-500">{p.qty} বার — {currency(p.amount)}</span>
          </div>
        ))}
      </div>
    </>
  );
};

const CustomersReport = ({ orders, canExport }) => {
  const customers = buildCustomerDirectory(orders).slice(0, 20);
  return (
    <>
      <ReportHeader
        title="Top Customers"
        canExport={canExport}
        onExport={() =>
          exportRows(
            "customer-report.csv",
            ["Name", "Phone", "Total Orders", "Total Spend", "Success Rate", "Tag"],
            customers.map((c) => [c.name, c.phone, c.totalOrders, c.totalSpend, `${c.successRate}%`, c.tag])
          )
        }
      />
      <div className="space-y-1.5">
        {customers.map((c) => (
          <div key={c.phone} className="flex items-center justify-between rounded-lg bg-mist-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">{c.name} ({c.phone})</span>
            <span className="text-slate-500">{c.totalOrders} অর্ডার — {currency(c.totalSpend)}</span>
          </div>
        ))}
      </div>
    </>
  );
};

const CourierReport = ({ orders, canExport }) => {
  const withCourier = orders.filter((o) => o.consignmentId);
  const byStatus = {};
  withCourier.forEach((o) => {
    const s = o.courierStatus || "created";
    byStatus[s] = (byStatus[s] || 0) + 1;
  });
  return (
    <>
      <ReportHeader
        title="Courier Report"
        canExport={canExport}
        onExport={() =>
          exportRows(
            "courier-report.csv",
            ["Order ID", "Consignment ID", "Courier Status"],
            withCourier.map((o) => [o._id, o.consignmentId, o.courierStatus])
          )
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(byStatus).map(([s, count]) => (
          <Stat key={s} label={s} value={count} />
        ))}
        {withCourier.length === 0 && <p className="col-span-full text-sm text-slate-400">কোনো ডেটা নেই</p>}
      </div>
    </>
  );
};

const ReturnsReport = ({ orders, canExport }) => {
  const returns = orders.filter((o) => o.returnReason || o.refundAmount > 0);
  const totalRefund = returns.reduce((s, o) => s + (o.refundAmount || 0), 0);
  return (
    <>
      <ReportHeader
        title="Return Report"
        canExport={canExport}
        onExport={() =>
          exportRows(
            "return-report.csv",
            ["Order ID", "Customer", "Return Reason", "Refund Amount", "Refund Status"],
            returns.map((o) => [o._id, o.name, o.returnReason, o.refundAmount, o.refundStatus])
          )
        }
      />
      <Stat label="মোট রিফান্ড" value={currency(totalRefund)} />
      <div className="mt-3 space-y-1.5">
        {returns.map((o) => (
          <div key={o._id} className="rounded-lg bg-mist-50 px-3 py-2 text-sm">
            <p className="font-medium text-ink-900">{o.name} — {currency(o.refundAmount)}</p>
            <p className="text-xs text-slate-400">{o.returnReason}</p>
          </div>
        ))}
        {returns.length === 0 && <p className="text-sm text-slate-400">কোনো রিটার্ন নেই</p>}
      </div>
    </>
  );
};

const AdminReport = ({ orders, assignments, canExport }) => {
  const map = {};
  ADMINS.forEach((a) => (map[a.id] = { admin: a, count: 0, amount: 0 }));
  orders.forEach((o) => {
    const adminId = assignments[o._id]?.adminId;
    if (!adminId || !map[adminId]) return;
    map[adminId].count += 1;
    if (o.status !== "cancelled") map[adminId].amount += o.total || 0;
  });
  const list = Object.values(map).sort((a, b) => b.count - a.count);

  return (
    <>
      <ReportHeader
        title="Admin Performance"
        canExport={canExport}
        onExport={() =>
          exportRows(
            "admin-performance.csv",
            ["Admin", "Orders Handled", "Amount"],
            list.map((x) => [x.admin.name, x.count, x.amount])
          )
        }
      />
      <div className="space-y-1.5">
        {list.map((x) => (
          <div key={x.admin.id} className="flex items-center justify-between rounded-lg bg-mist-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">{x.admin.name} ({x.admin.role})</span>
            <span className="text-slate-500">{x.count} অর্ডার — {currency(x.amount)}</span>
          </div>
        ))}
      </div>
    </>
  );
};

const InventoryReport = ({ products, canExport }) => (
  <>
    <ReportHeader
      title="Inventory Report"
      canExport={canExport}
      onExport={() =>
        exportRows(
          "inventory-report.csv",
          ["Product", "SKU", "Stock", "Cost Price", "Sale Price"],
          products.map((p) => [p.name, p.sku, p.stock, p.costPrice, p.price])
        )
      }
    />
    <div className="space-y-1.5">
      {products.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-lg bg-mist-50 px-3 py-2 text-sm">
          <span className="font-medium text-ink-900">{p.name}</span>
          <span className={typeof p.stock === "number" && p.stock <= 5 ? "text-rose-500" : "text-slate-500"}>
            স্টক: {p.stock ?? "—"}
          </span>
        </div>
      ))}
    </div>
  </>
);

const TenantReport = ({ orders, tenants, canExport }) => {
  const map = {};
  tenants.forEach((t) => (map[t.id] = { tenant: t, count: 0, amount: 0 }));
  orders.forEach((o) => {
    if (!o.tenantId || !map[o.tenantId]) return;
    map[o.tenantId].count += 1;
    if (o.status !== "cancelled") map[o.tenantId].amount += o.total || 0;
  });
  const list = Object.values(map);

  return (
    <>
      <ReportHeader
        title="Tenant Report"
        canExport={canExport}
        onExport={() =>
          exportRows(
            "tenant-report.csv",
            ["Tenant", "Orders", "Amount"],
            list.map((x) => [x.tenant.name, x.count, x.amount])
          )
        }
      />
      <div className="space-y-1.5">
        {list.map((x) => (
          <div key={x.tenant.id} className="flex items-center justify-between rounded-lg bg-mist-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">{x.tenant.name}</span>
            <span className="text-slate-500">{x.count} অর্ডার — {currency(x.amount)}</span>
          </div>
        ))}
      </div>
    </>
  );
};

export default Reports;
