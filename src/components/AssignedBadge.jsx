import { UserPlus } from "lucide-react";
import { getAdminById } from "../config/admins.js";

const AssignedBadge = ({ adminId, size = "sm" }) => {
  const admin = adminId ? getAdminById(adminId) : null;

  const dims = size === "sm" ? "h-6 w-6" : "h-9 w-9";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (!admin) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-mist-100 px-2.5 py-1 text-xs font-medium text-slate-400">
        <UserPlus size={13} />
        অ্যাসাইন করা হয়নি
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <img
        src={admin.avatar}
        alt={admin.name}
        className={`${dims} flex-shrink-0 rounded-full bg-mist-100 ring-1 ring-mist-200`}
      />
      <span className={`${textSize} font-semibold text-ink-900`}>
        {admin.name}
      </span>
    </span>
  );
};

export default AssignedBadge;
