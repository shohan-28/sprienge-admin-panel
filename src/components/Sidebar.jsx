import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  LogOut,
  Store,
  X,
  Settings as SettingsIcon,
  ShoppingBag,
  Plus,
  History,
  Users,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/products", label: "Products", icon: ShoppingBag },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/audit-log", label: "Audit Log", icon: History },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const SidebarContent = ({ onNavigate }) => {
  const { logout, admin } = useAuth();

  return (
    <div className="flex h-full flex-col bg-ink-900 text-mist-100">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg shadow-lg shadow-brand-600/30">
          <img src="https://i.postimg.cc/GhTz4zKR/Spriengge-logo-big.png" alt="" />
        </div>
        <div>
          <p className="font-display text-[15px] font-bold leading-tight text-white">
            Spriengge
          </p>
          <p className="text-[11px] font-medium tracking-wide text-mist-100/50">
            ADMIN PANEL
          </p>
        </div>
      </div>

      <div className="mx-6 h-px bg-white/10" />

      <div className="px-4 pt-4">
        <NavLink
          to="/orders/new"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700"
        >
          <Plus size={16} /> Create Order
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600/15 text-brand-400"
                  : "text-mist-100/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={18} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {admin && (
        <div className="mx-4 mb-1 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <img
            src={admin.avatar}
            alt={admin.name}
            className="h-8 w-8 rounded-full ring-1 ring-white/10"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {admin.name}
            </p>
            <p className="text-[11px] text-mist-100/50">{admin.role}</p>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 px-4 py-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-mist-100/70 transition-colors hover:bg-white/5 hover:text-rose-400"
        >
          <LogOut size={18} strokeWidth={2.2} />
          Log Out
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ mobileOpen, onClose }) => {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative h-full w-64 animate-in">
            <SidebarContent onNavigate={onClose} />
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
