import { useState } from "react";
import { Download, History, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout.jsx";
import { getAuditLog, exportAuditLogCsv } from "../api/auditLog.js";
import { getAdminById, hasPermission } from "../config/admins.js";
import { useAuth } from "../context/AuthContext.jsx";

const AuditLog = () => {
  const { admin } = useAuth();
  const canExport = hasPermission(admin, "exportData");
  const [log] = useState(getAuditLog());

  const handleExport = () => {
    exportAuditLogCsv((adminId) => getAdminById(adminId)?.name);
  };

  return (
    <AdminLayout title="Audit Log" subtitle="কে, কবে, কোন অর্ডারে কী করেছেন — সম্পূর্ণ হিস্টোরি">
      <div className="mb-5 flex justify-end">
        {canExport && (
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl border border-mist-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-mist-100"
        >
          <Download size={15} /> CSV এক্সপোর্ট
        </button>
        )}
      </div>

      {log.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-mist-200 bg-white py-16 text-slate-400 shadow-card">
          <History size={32} className="mb-3" />
          <p className="text-sm font-medium">এখনো কোনো অ্যাকশন লগ হয়নি</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-mist-200 bg-mist-50/60 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3.5">সময়</th>
                  <th className="px-5 py-3.5">Admin</th>
                  <th className="px-5 py-3.5">অ্যাকশন</th>
                  <th className="px-5 py-3.5">বিস্তারিত</th>
                  <th className="px-5 py-3.5">অর্ডার</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {log.slice(0, 300).map((e) => {
                  const a = getAdminById(e.adminId);
                  return (
                    <tr key={e.id} className="hover:bg-mist-50/70">
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {new Date(e.at).toLocaleString("en-GB")}
                      </td>
                      <td className="px-5 py-3 font-medium text-ink-900">
                        {a?.name || e.adminId || "—"}
                      </td>
                      <td className="px-5 py-3 capitalize text-slate-600">{e.action}</td>
                      <td className="px-5 py-3 text-slate-400">{e.details || "—"}</td>
                      <td className="px-5 py-3">
                        {e.orderId ? (
                          <Link
                            to={`/orders/${e.orderId}`}
                            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            <LinkIcon size={12} /> {e.orderId.slice(-6)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AuditLog;
