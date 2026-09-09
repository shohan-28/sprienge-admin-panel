import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2 } from "lucide-react";
import { checkFraud } from "../api/orders.js";

// Shows a phone number's courier-wide delivery track record (across ALL
// Steadfast merchants, not just your own store) — total parcels sent to
// this number, how many were actually delivered vs cancelled, and a
// success percentage. Requires the backend's GET /orders/fraud-check/:phone
// proxy route (see backend-reference/) — degrades to a quiet error message
// if that route isn't deployed yet, rather than breaking the page.
const FraudCheckPanel = ({ phone }) => {
  const [state, setState] = useState({ loading: false, data: null, error: "" });

  useEffect(() => {
    if (!phone || phone.length !== 11) {
      setState({ loading: false, data: null, error: "" });
      return;
    }
    let cancelled = false;
    setState({ loading: true, data: null, error: "" });
    checkFraud(phone)
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: "" });
      })
      .catch(() => {
        if (!cancelled)
          setState({
            loading: false,
            data: null,
            error: "ফ্রড চেক করা যায়নি — ব্যাকএন্ডে /orders/fraud-check/:phone রুট আছে কিনা যাচাই করুন।",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  if (!phone || phone.length !== 11) return null;

  if (state.loading) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 size={12} className="animate-spin" /> কুরিয়ার ফ্রড চেক করা হচ্ছে...
      </p>
    );
  }

  if (state.error) {
    return <p className="mt-1.5 text-xs text-slate-300">{state.error}</p>;
  }

  if (!state.data) return null;

  const total = Number(state.data.total_parcels) || 0;
  const delivered = Number(state.data.total_delivered) || 0;
  const cancelled = Number(state.data.total_cancelled) || 0;
  const ratio =
    state.data.success_ratio != null
      ? Number(state.data.success_ratio)
      : total > 0
      ? Math.round((delivered / total) * 100)
      : null;

  if (total === 0) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldQuestion size={13} /> এই নাম্বারে Steadfast-এ কোনো আগের পার্সেল
        নেই (নতুন নাম্বার)
      </p>
    );
  }

  const tone =
    ratio >= 80
      ? { icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" }
      : ratio >= 50
      ? { icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50" }
      : { icon: ShieldAlert, color: "text-rose-600", bg: "bg-rose-50" };
  const Icon = tone.icon;

  return (
    <div className={`mt-1.5 flex items-center gap-2 rounded-lg ${tone.bg} px-2.5 py-1.5`}>
      <Icon size={14} className={`flex-shrink-0 ${tone.color}`} />
      <p className={`text-xs font-semibold ${tone.color}`}>
        কুরিয়ার সাকসেস রেট: {ratio}% ({delivered} ডেলিভার্ড / {cancelled}{" "}
        বাতিল, মোট {total} পার্সেল)
      </p>
    </div>
  );
};

export default FraudCheckPanel;
