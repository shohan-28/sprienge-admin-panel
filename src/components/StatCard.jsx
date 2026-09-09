const StatCard = ({ label, value, icon: Icon, accent = "brand", hint }) => {
  const accentMap = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="animate-in rounded-2xl border border-mist-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">
            {label}
          </p>
          <p className="mt-2 truncate font-display text-xl font-bold text-ink-900 sm:text-2xl">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${accentMap[accent]}`}
        >
          <Icon size={19} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
