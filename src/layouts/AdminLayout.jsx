import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";
import KeyboardShortcutsHint from "../components/KeyboardShortcutsHint.jsx";

// Global keyboard shortcuts, active on every admin page:
//   n        -> Create Order
//   g then d -> Dashboard
//   g then o -> Orders
//   g then p -> Products
//   ?        -> toggle the shortcuts cheat-sheet
// Ignored while typing in an input/textarea/select so normal typing is
// never hijacked.
const useKeyboardShortcuts = (onShowHelp) => {
  const navigate = useNavigate();

  useEffect(() => {
    let pendingG = false;
    let pendingGTimer = null;

    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (isTyping) return;

      if (pendingG) {
        pendingG = false;
        clearTimeout(pendingGTimer);
        if (e.key === "d") navigate("/dashboard");
        else if (e.key === "o") navigate("/orders");
        else if (e.key === "p") navigate("/products");
        else if (e.key === "c") navigate("/customers");
        else if (e.key === "r") navigate("/reports");
        return;
      }

      if (e.key === "g") {
        pendingG = true;
        pendingGTimer = setTimeout(() => (pendingG = false), 1200);
        return;
      }
      if (e.key === "n") {
        navigate("/orders/new");
        return;
      }
      if (e.key === "?") {
        onShowHelp();
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearTimeout(pendingGTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const AdminLayout = ({ title, subtitle, children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useKeyboardShortcuts(() => setShowHelp((v) => !v));

  return (
    <div className="min-h-screen bg-mist-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <Topbar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
      {showHelp && <KeyboardShortcutsHint onClose={() => setShowHelp(false)} />}
    </div>
  );
};

export default AdminLayout;
