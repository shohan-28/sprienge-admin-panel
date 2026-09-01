import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  { keys: "n", desc: "নতুন অর্ডার তৈরি করুন" },
  { keys: "g → d", desc: "Dashboard-এ যান" },
  { keys: "g → o", desc: "Orders-এ যান" },
  { keys: "g → p", desc: "Products-এ যান" },
  { keys: "g → c", desc: "Customers-এ যান" },
  { keys: "g → r", desc: "Reports-এ যান" },
  { keys: "?", desc: "এই তালিকা দেখান/লুকান" },
];

const KeyboardShortcutsHint = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
            <Keyboard size={18} className="text-brand-600" />
            কিবোর্ড শর্টকাট
          </h3>
          <button onClick={onClose}>
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{s.desc}</span>
              <kbd className="rounded-md bg-mist-100 px-2 py-1 font-mono text-xs font-semibold text-ink-900">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHint;
