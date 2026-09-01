import { useEffect, useState } from "react";

import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Loader2,
  X,
  Truck,
  PackageCheck,
  PackageX,
  RotateCcw,
  ChevronRight,
  Phone,
  Clock3,
} from "lucide-react";

import {
  checkFraud,
  normalizePhone,
} from "../api/orders.js";

// ======================================================
// Fraud Check Panel
// ======================================================

const FraudCheckPanel = ({ phone }) => {
  const [state, setState] = useState({
    loading: false,
    data: null,
    error: "",
  });

  const [showDetails, setShowDetails] =
    useState(false);

  // ====================================================
  // Normalize phone
  // ====================================================

  const normalizedPhone =
    normalizePhone(phone);

  // ====================================================
  // Fraud Check
  // ====================================================

  useEffect(() => {
    if (
      !normalizedPhone ||
      normalizedPhone.length !== 11
    ) {
      setState({
        loading: false,
        data: null,
        error: "",
      });

      return;
    }

    let cancelled = false;

    const loadFraudData = async () => {
      try {
        setState({
          loading: true,
          data: null,
          error: "",
        });

        const data =
          await checkFraud(
            normalizedPhone
          );

        if (cancelled) return;

        setState({
          loading: false,
          data,
          error: "",
        });
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Fraud Check Error:",
          error
        );

        setState({
          loading: false,
          data: null,
          error:
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            "ফ্রড চেক করা যায়নি। Backend fraud-check API যাচাই করুন।",
        });
      }
    };

    loadFraudData();

    return () => {
      cancelled = true;
    };
  }, [normalizedPhone]);

  // ====================================================
  // ESC close modal
  // ====================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowDetails(false);
      }
    };

    if (showDetails) {
      document.addEventListener(
        "keydown",
        handleEscape
      );
    }

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [showDetails]);

  // ====================================================
  // Invalid phone
  // ====================================================

  if (
    !normalizedPhone ||
    normalizedPhone.length !== 11
  ) {
    return null;
  }

  // ====================================================
  // Loading
  // ====================================================

  if (state.loading) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <Loader2
          size={14}
          className="animate-spin text-slate-500"
        />

        <p className="text-xs text-slate-500">
          কুরিয়ার ফ্রড চেক করা হচ্ছে...
        </p>
      </div>
    );
  }

  // ====================================================
  // Error
  // ====================================================

  if (state.error) {
    return (
      <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
        <div className="flex items-start gap-2">
          <ShieldAlert
            size={14}
            className="mt-0.5 shrink-0 text-rose-500"
          />

          <p className="text-xs leading-5 text-rose-600">
            {state.error}
          </p>
        </div>
      </div>
    );
  }

  // ====================================================
  // No data
  // ====================================================

  if (!state.data) {
    return null;
  }

  // ====================================================
  // Response Data
  // ====================================================

  const data = state.data;

  const total =
    Number(
      data.total_parcels ??
        data.total_orders ??
        data.total ??
        0
    ) || 0;

  const delivered =
    Number(
      data.total_delivered ??
        data.delivered ??
        0
    ) || 0;

  const cancelled =
    Number(
      data.total_cancelled ??
        data.cancelled ??
        0
    ) || 0;

  const returned =
    Number(
      data.total_returned ??
        data.returned ??
        0
    ) || 0;

  // ====================================================
  // Success Ratio
  // ====================================================

  let ratio = null;

  if (data.success_ratio != null) {
    ratio = Number(data.success_ratio);
  } else if (data.successRate != null) {
    ratio = Number(data.successRate);
  } else if (data.success_rate != null) {
    ratio = Number(data.success_rate);
  } else if (total > 0) {
    ratio = Math.round(
      (delivered / total) * 100
    );
  }

  if (ratio === null || Number.isNaN(ratio)) {
    ratio = 0;
  }

  ratio = Math.min(
    Math.max(ratio, 0),
    100
  );

  // ====================================================
  // Courier Data
  // ====================================================

  const courierData =
    Array.isArray(data.couriers)
      ? data.couriers
      : Array.isArray(
          data.courier_breakdown
        )
      ? data.courier_breakdown
      : [];

  // ====================================================
  // No Previous Parcel
  // ====================================================

  if (total === 0) {
    return (
      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <ShieldQuestion
            size={14}
            className="text-slate-400"
          />

          <p className="text-xs text-slate-500">
            এই নাম্বারে কোনো আগের courier parcel
            পাওয়া যায়নি
          </p>
        </div>

        <p className="mt-1 pl-5 text-[11px] text-slate-400">
          নতুন customer হতে পারে
        </p>
      </div>
    );
  }

  // ====================================================
  // Risk
  // ====================================================

  const tone =
    ratio >= 80
      ? {
          icon: ShieldCheck,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          border: "border-emerald-100",
          progress: "bg-emerald-500",
          label: "Low Risk",
        }
      : ratio >= 50
      ? {
          icon: ShieldAlert,
          color: "text-amber-600",
          bg: "bg-amber-50",
          border: "border-amber-100",
          progress: "bg-amber-500",
          label: "Medium Risk",
        }
      : {
          icon: ShieldAlert,
          color: "text-rose-600",
          bg: "bg-rose-50",
          border: "border-rose-100",
          progress: "bg-rose-500",
          label: "High Risk",
        };

  const RiskIcon = tone.icon;

  // ====================================================
  // Render
  // ====================================================

  return (
    <>
      {/* =================================================
          Compact Summary
      ================================================= */}

      <div
        className={`mt-2 overflow-hidden rounded-xl border ${tone.border} ${tone.bg}`}
      >
        <div className="px-3 py-2.5">
          {/* Header */}

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <RiskIcon
                  size={15}
                  className={tone.color}
                />
              </div>

              <div className="min-w-0">
                <p
                  className={`text-xs font-bold ${tone.color}`}
                >
                  {tone.label}
                </p>

                <p className="text-[10px] text-slate-500">
                  Courier delivery history
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowDetails(true)
              }
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              View Details
              <ChevronRight size={12} />
            </button>
          </div>

          {/* Success Rate */}

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">
                Courier Success Rate
              </span>

              <span
                className={`text-xs font-bold ${tone.color}`}
              >
                {ratio}%
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-white/80">
              <div
                className={`h-full rounded-full ${tone.progress} transition-all duration-700`}
                style={{
                  width: `${ratio}%`,
                }}
              />
            </div>
          </div>

          {/* Stats */}

          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <MiniStat
              icon={PackageCheck}
              label="Delivered"
              value={delivered}
            />

            <MiniStat
              icon={PackageX}
              label="Cancelled"
              value={cancelled}
            />

            <MiniStat
              icon={Truck}
              label="Total"
              value={total}
            />
          </div>
        </div>
      </div>

      {/* =================================================
          Details Modal
      ================================================= */}

      {showDetails && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowDetails(false);
            }
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                  <RiskIcon
                    size={18}
                    className={tone.color}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Customer Risk Analysis
                  </h2>

                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                    <Phone size={10} />
                    {normalizedPhone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDetails(false)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}

            <div className="max-h-[calc(90vh-75px)] overflow-y-auto p-5">
              {/* Risk Overview */}

              <div
                className={`rounded-2xl border ${tone.border} ${tone.bg} p-4`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Overall Courier Risk
                    </p>

                    <p
                      className={`mt-1 text-xl font-bold ${tone.color}`}
                    >
                      {tone.label}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-800">
                      {ratio}%
                    </p>

                    <p className="text-[10px] text-slate-400">
                      success rate
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${tone.progress} transition-all duration-700`}
                      style={{
                        width: `${ratio}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Overall Statistics */}

              <section className="mt-5">
                <SectionTitle title="Overall Courier History" />

                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DetailStat
                    icon={Truck}
                    label="Total Parcels"
                    value={total}
                  />

                  <DetailStat
                    icon={PackageCheck}
                    label="Delivered"
                    value={delivered}
                  />

                  <DetailStat
                    icon={PackageX}
                    label="Cancelled"
                    value={cancelled}
                  />

                  <DetailStat
                    icon={RotateCcw}
                    label="Returned"
                    value={returned}
                  />
                </div>
              </section>

              {/* Courier Breakdown */}

              <section className="mt-6">
                <div className="flex items-center justify-between">
                  <SectionTitle title="Courier-wise Breakdown" />

                  {courierData.length > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {courierData.length} courier
                      {courierData.length > 1
                        ? "s"
                        : ""}
                    </span>
                  )}
                </div>

                {courierData.length > 0 ? (
                  <div className="mt-2 space-y-2.5">
                    {courierData.map(
                      (courier, index) => {
                        const courierName =
                          courier.courier ||
                          courier.courier_name ||
                          courier.name ||
                          courier.provider ||
                          "Unknown Courier";

                        const courierTotal =
                          Number(
                            courier.total_parcels ??
                              courier.total ??
                              courier.orders ??
                              0
                          ) || 0;

                        const courierDelivered =
                          Number(
                            courier.total_delivered ??
                              courier.delivered ??
                              0
                          ) || 0;

                        const courierCancelled =
                          Number(
                            courier.total_cancelled ??
                              courier.cancelled ??
                              0
                          ) || 0;

                        const courierReturned =
                          Number(
                            courier.total_returned ??
                              courier.returned ??
                              0
                          ) || 0;

                        let courierRatio =
                          courier.success_ratio ??
                          courier.success_rate ??
                          courier.successRate;

                        if (
                          courierRatio == null
                        ) {
                          courierRatio =
                            courierTotal > 0
                              ? Math.round(
                                  (courierDelivered /
                                    courierTotal) *
                                    100
                                )
                              : 0;
                        }

                        courierRatio =
                          Number(
                            courierRatio
                          ) || 0;

                        courierRatio =
                          Math.min(
                            Math.max(
                              courierRatio,
                              0
                            ),
                            100
                          );

                        return (
                          <div
                            key={`${courierName}-${index}`}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                                  <Truck
                                    size={15}
                                    className="text-slate-500"
                                  />
                                </div>

                                <div>
                                  <p className="text-xs font-bold text-slate-700">
                                    {courierName}
                                  </p>

                                  <p className="text-[10px] text-slate-400">
                                    {courierTotal} total
                                    parcels
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`text-xs font-bold ${
                                  courierRatio >=
                                  80
                                    ? "text-emerald-600"
                                    : courierRatio >=
                                      50
                                    ? "text-amber-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {courierRatio}%
                              </span>
                            </div>

                            {/* Progress */}

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                              <div
                                className={`h-full rounded-full ${
                                  courierRatio >=
                                  80
                                    ? "bg-emerald-500"
                                    : courierRatio >=
                                      50
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{
                                  width: `${courierRatio}%`,
                                }}
                              />
                            </div>

                            {/* Courier Stats */}

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                              <span>
                                Delivered:{" "}
                                <b className="text-emerald-600">
                                  {
                                    courierDelivered
                                  }
                                </b>
                              </span>

                              <span>
                                Cancelled:{" "}
                                <b className="text-rose-600">
                                  {
                                    courierCancelled
                                  }
                                </b>
                              </span>

                              <span>
                                Returned:{" "}
                                <b className="text-amber-600">
                                  {
                                    courierReturned
                                  }
                                </b>
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-dashed border-slate-200 p-4 text-center">
                    <Truck
                      size={20}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Courier-wise data available
                      নেই
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      Backend response-এ courier
                      breakdown যোগ করলে এখানে
                      দেখা যাবে।
                    </p>
                  </div>
                )}
              </section>

              {/* Verification */}

              <section className="mt-6">
                <SectionTitle title="Verification Information" />

                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <Phone
                      size={14}
                      className="text-slate-400"
                    />

                    <div>
                      <p className="text-[10px] text-slate-400">
                        Normalized Phone Number
                      </p>

                      <p className="mt-0.5 text-xs font-semibold text-slate-700">
                        {normalizedPhone}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Clock3
                      size={14}
                      className="text-slate-400"
                    />

                    <p className="text-[10px] text-slate-400">
                      Fraud data checked from courier
                      records
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() =>
                  setShowDetails(false)
                }
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ======================================================
// Mini Stat
// ======================================================

const MiniStat = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1.5">
      <Icon
        size={12}
        className="shrink-0 text-slate-400"
      />

      <div className="min-w-0">
        <p className="truncate text-[9px] text-slate-400">
          {label}
        </p>

        <p className="text-[11px] font-bold text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
};

// ======================================================
// Detail Stat
// ======================================================

const DetailStat = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
        <Icon
          size={14}
          className="text-slate-500"
        />
      </div>

      <p className="mt-2 text-[10px] text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 text-base font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
};

// ======================================================
// Section Title
// ======================================================

const SectionTitle = ({ title }) => {
  return (
    <h3 className="text-xs font-bold text-slate-700">
      {title}
    </h3>
  );
};

export default FraudCheckPanel;