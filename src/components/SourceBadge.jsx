import { getSourceInfo } from "../config/orderSources.js";

const SourceBadge = ({ source }) => {
  const info = getSourceInfo(source);
  if (!info) return <span className="text-xs text-slate-300">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${info.color}`}
    >
      {info.label}
    </span>
  );
};

export default SourceBadge;
