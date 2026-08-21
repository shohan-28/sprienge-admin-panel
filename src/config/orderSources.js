// Where an order came in from — set at Create Order time, shown as a
// colored badge everywhere the order appears (Orders list, Order Details).

export const ORDER_SOURCES = [
  { id: "phone", label: "Phone Call", color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  { id: "whatsapp", label: "WhatsApp", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  { id: "facebook", label: "Facebook", color: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  { id: "website", label: "Website", color: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  { id: "walkin", label: "Walk-in", color: "bg-slate-100 text-slate-600 ring-slate-400/20" },
  { id: "other", label: "Other", color: "bg-rose-50 text-rose-700 ring-rose-600/20" },
];

export const getSourceInfo = (id) =>
  ORDER_SOURCES.find((s) => s.id === id) || null;
