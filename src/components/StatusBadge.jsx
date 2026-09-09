const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmed: "bg-sky-50 text-sky-700 ring-sky-600/20",
  processing: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  shipped: "bg-violet-50 text-violet-700 ring-violet-600/20",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const STATUS_LABEL_BN = {
  pending: "অপেক্ষমান",
  confirmed: "কনফার্মড",
  processing: "প্রসেসিং",
  shipped: "শিপড",
  delivered: "ডেলিভারড",
  cancelled: "বাতিল",
};

const StatusBadge = ({ status = "pending" }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const label = STATUS_LABEL_BN[status] || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

export default StatusBadge;
export { STATUS_STYLES, STATUS_LABEL_BN };
