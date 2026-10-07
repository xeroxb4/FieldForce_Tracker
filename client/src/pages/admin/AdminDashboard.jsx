import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useAdminPremium, AdminPageHeader } from "../../lib/adminPremium";

function asText(v, fallback = "—") {
  if (v == null || v === "") return fallback;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    if (v.name != null && (typeof v.name === "string" || typeof v.name === "number")) return String(v.name);
    if (v.fullName != null) return String(v.fullName);
    if (v.label != null) return String(v.label);
    return fallback;
  }
  return fallback;
}

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminDashboard() {
  const { dark } = useTheme();
  const ap = useAdminPremium(dark);
  const [data, setData] = useState(null);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashRes, uvRes] = await Promise.allSettled([
          api.get("/admin/dashboard"),
          api.get("/admin/unvisited-today"),
        ]);
        if (cancelled) return;
        if (dashRes.status === "fulfilled") setData(dashRes.value?.data ?? null);
        else setError("Could not load dashboard stats");
        if (uvRes.status === "fulfilled") {
          const raw = uvRes.value?.data;
          let list = [];
          if (Array.isArray(raw?.reps)) list = raw.reps;
          else if (Array.isArray(raw?.omrs)) list = raw.omrs;
          else if (Array.isArray(raw)) list = raw;
          list = list.map((row, idx) => {
            if (!row || typeof row !== "object") return { key: String(idx), label: "OMR", count: 0 };
            const label = asText(row.omrName || row.fullName || row.name || row.omr || row.user, "OMR");
            const count = asNum(
              row.unvisited ?? row.count ?? row.unvisitedCount ??
              (Array.isArray(row.outlets) ? row.outlets.length : 0) ??
              (Array.isArray(row.unvisitedOutlets) ? row.unvisitedOutlets.length : 0)
            );
            return { key: String(row.omrId || row._id || row.id || label || idx), label, count };
          });
          setReps(list);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fmt = (n) => "GHS " + asNum(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-2 border-[#3F258B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const salesToday = data?.sales?.today || {};
  const salesWeek = data?.sales?.week || {};
  const salesMonth = data?.sales?.month || {};
  const counts = data?.counts || {};

  const statTiles = [
    { title: "Sales today", value: fmt(salesToday.amount), sub: asNum(salesToday.orders) + " orders", bg: "linear-gradient(145deg, #f43f5e 0%, #e11d48 55%, #be123c 100%)" },
    { title: "This week", value: fmt(salesWeek.amount), sub: asNum(salesWeek.orders) + " orders", bg: "linear-gradient(145deg, #28B8F0 0%, #0ea5e9 55%, #0284c7 100%)" },
    { title: "This month", value: fmt(salesMonth.amount), sub: asNum(salesMonth.orders) + " orders", bg: "linear-gradient(145deg, #34d399 0%, #059669 55%, #047857 100%)" },
  ];

  const metricTiles = [
    { label: "Active OMRs", v: asNum(counts.omrs) },
    { label: "Merchandisers", v: asNum(counts.merchandisers) },
    { label: "Outlets", v: asNum(counts.outlets) },
    { label: "AVC outlets", v: asNum(counts.avc) },
  ];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        dark={dark}
        eyebrow="Executive"
        title="Dashboard"
        subtitle="FieldForce overview · sales, team & programs"
        right={
          <Link to="/admin/analytics" className={ap.btnPrimary} style={ap.btnPrimaryStyle}>
            Full analysis →
          </Link>
        }
      />

      {error ? (
        <div className={ap.cardSoft + " px-4 py-3 text-sm font-semibold text-red-400"} style={ap.cardSoftStyle}>
          {asText(error, "Error")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {statTiles.map((s) => (
          <div
            key={s.title}
            className="rounded-[1.5rem] p-5 text-white relative overflow-hidden"
            style={{ background: s.bg, boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 10px 28px -6px rgba(0,0,0,0.28)" }}
          >
            <div className="text-[11px] font-black uppercase tracking-[0.15em] opacity-90">{s.title}</div>
            <div className="text-2xl md:text-3xl font-black mt-2 tracking-tight">{s.value}</div>
            <div className="text-xs mt-2 opacity-90 font-semibold">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricTiles.map((x) => (
          <div key={x.label} className={ap.cardSoft + " p-4"} style={ap.cardSoftStyle}>
            <div className={`text-[10px] font-black uppercase tracking-wider ${ap.muted}`}>{x.label}</div>
            <div className={`text-2xl font-black mt-1.5 ${ap.title}`}>{x.v}</div>
          </div>
        ))}
      </div>

      <div className={ap.card + " p-5"} style={ap.cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className={ap.pageEyebrow}>Coverage</p>
            <h2 className={`font-black text-lg ${ap.title}`}>Unvisited today</h2>
          </div>
          <Link to="/admin/outlet-sales" className={`text-xs font-bold ${dark ? "text-violet-200" : "text-[#3F258B]"}`}>
            Outlet sales →
          </Link>
        </div>
        {reps.length === 0 ? (
          <p className={`text-sm ${ap.muted}`}>No unvisited beat data for today.</p>
        ) : (
          <div className="space-y-2.5">
            {reps.map((row) => (
              <div key={row.key} className={ap.cardSoft + " px-3.5 py-3 flex items-center justify-between gap-3"} style={ap.cardSoftStyle}>
                <div className="min-w-0">
                  <div className={`text-sm font-bold truncate ${ap.title}`}>{row.label}</div>
                  <div className={`text-[11px] ${ap.muted}`}>{row.count} outlets still open</div>
                </div>
                <span
                  className="shrink-0 text-xs font-black px-2.5 py-1 rounded-xl text-white"
                  style={{ background: "linear-gradient(145deg, #6d4ad1, #3F258B)" }}
                >
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
