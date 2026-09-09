import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Moon,
  Sun,
  Bell,
  ShoppingBag,
  AlertTriangle,
  Truck,
  UserPlus,
  PackageX,
  Clock,
  Search,
} from "lucide-react";
import { getOrders } from "../api/orders.js";
import {
  scanForNotifications,
  getNotifications,
  getUnreadCount,
  markAllRead,
} from "../api/notifications.js";
import GlobalSearch from "./GlobalSearch.jsx";

const DARK_KEY = "bdmart_dark_mode";

const NOTIF_ICON = {
  new_order: ShoppingBag,
  cancelled: AlertTriangle,
  courier_issue: Truck,
  new_customer: UserPlus,
  low_stock: PackageX,
  stale_pending: Clock,
  confirmed_no_parcel: AlertTriangle,
};

const Topbar = ({ title, subtitle, onMenuClick }) => {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [dark, setDark] = useState(() => localStorage.getItem(DARK_KEY) === "true");
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifs, setNotifs] = useState(getNotifications());
  const [unread, setUnread] = useState(getUnreadCount());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(DARK_KEY, String(dark));
  }, [dark]);

  useEffect(() => {
    const poll = async () => {
      try {
        const orders = await getOrders();
        scanForNotifications(orders);
        setNotifs(getNotifications());
        setUnread(getUnreadCount());
      } catch {
        // backend hiccup — skip this cycle, try again next interval
      }
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, []);

  const handleOpenNotifs = () => {
    setNotifOpen((v) => !v);
    if (!notifOpen) {
      markAllRead();
      setUnread(0);
    }
  };

  const handleNotifClick = (n) => {
    setNotifOpen(false);
    if (n.orderId) navigate(`/orders/${n.orderId}`);
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-mist-200 bg-mist-50/80 px-4 py-4 backdrop-blur sm:px-8 sm:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-mist-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-bold text-ink-900 sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-medium text-slate-400">
            {now.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
          <p className="font-mono text-sm text-ink-900">
            {now.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <button
          onClick={() => setSearchOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-mist-100"
          title="সব জায়গায় খুঁজুন"
        >
          <Search size={18} />
        </button>

        <button
          onClick={() => setDark((d) => !d)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-mist-100"
          title={dark ? "লাইট মোড" : "ডার্ক মোড"}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={handleOpenNotifs}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-mist-100"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="animate-in absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-mist-200 bg-white p-2 shadow-panel">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  নোটিফিকেশন
                </p>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-slate-400">
                      কোনো নোটিফিকেশন নেই
                    </p>
                  )}
                  {notifs.slice(0, 20).map((n) => {
                    const Icon = NOTIF_ICON[n.type] || Bell;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-mist-50"
                      >
                        <Icon
                          size={15}
                          className={`mt-0.5 flex-shrink-0 ${
                            n.type === "cancelled" || n.type === "courier_issue"
                              ? "text-rose-500"
                              : "text-brand-600"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-ink-900">{n.message}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(n.at).toLocaleString("en-GB")}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 shadow-card" />
      </div>
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </header>
  );
};

export default Topbar;
