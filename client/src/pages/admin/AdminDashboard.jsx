import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useAdminPremium } from "../../lib/adminPremium";

function StatCard({ title, value, sub, tone }) {
  const tones = {
    rose: "linear-gradient(145deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)",
    sky: "linear-gradient(145deg, #28B8F0 0%, #0ea5e9 50%, #0284c7 100%)",
    emerald: "linear-gradient(145deg, #34d399 0%, #059669 55%, #047857 100%)",
  };
  return (
    <div
      className="rounded-[1.35rem] p-5 text-white relative overflow-hidden"
      style={{
        background: tones[tone] || tones.sky,
        boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 16px 40px rgba(0,0,0,0.2)",
      }}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.15em] opacity-90">{title}</div>
      <div className="text-2xl md:text-3xl font-black mt-2 tracking-tight">{value}</div>
      {sub ? <div className="text-xs mt-2 opacity-90 font-semibold">{sub}</div> : null}
    </div>
  );
}

export default function AdminDashboard() {
  const { dark } = useTheme();
  const ap = useAdminPremium(!!dark);
  const [data, setData] = useState(null);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dash, uv] = await Promise.allSettled([
          api.get("/admin/dashboard"),
          api.get("/admin/unvisited-today"),
        ]);
        if (cancelled) return;
        if (dash.status === "fulfilled") setData(dash.value?.data ?? null);
        else setError("Could not load dashboard stats");
        if (uv.status === "fulfilled") {
          const raw = uv.value?.data;
          const list = Array.isArray(raw?.reps) ? raw.reps : Array.isArray(raw) ? raw : [];
          setReps(list);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n) =>
    "GHS " + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-2 border-[#3F258B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className={ap.pageEyebrow}>Executive</p>
          <h1 className={"text-2xl font-black tracking-tight mt-0.5 " + ap.title}>Dashboard</h1>
          <p className={"text-sm font-medium mt-1 " + ap.muted}>
            FieldForce overview · sales, team & programs
          </p>
        </div>
        <Link to="/admin/analytics" className={ap.btnPrimary} style={ap.btnPrimaryStyle}>
          Full analysis →
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl px-4 py-3 text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          title="Sales today"
          value={fmt(data?.sales?.today?.amount)}
          sub={(data?.sales?.today?.orders || 0) + " orders"}
          tone="rose"
        />
        <StatCard
          title="This week"
          value={fmt(data?.sales?.week?.amount)}
          sub={(data?.sales?.week?.orders || 0) + " orders"}
          tone="sky"
        />
        <StatCard
          title="This month"
          value={fmt(data?.sales?.month?.amount)}
          sub={(data?.sales?.month?.orders || 0) + " orders"}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active OMRs", v: data?.counts?.omrs },
          { label: "Merchandisers", v: data?.counts?.merchandisers },
          { label: "Outlets", v: data?.counts?.outlets },
          { label: "AVC outlets", v: data?.counts?.avc },
        ].map((x) => (
          <div key={x.label} className={ap.card + " p-4"} style={ap.cardStyle}>
            <div className={"text-[10px] font-black uppercase tracking-wider " + ap.muted}>{x.label}</div>
            <div className={"text-2xl font-black mt-1.5 " + ap.title}>{x.v ?? 0}</div>
          </div>
        ))}
      </div>

      <div className={ap.card + " p-5"} style={ap.cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className={ap.pageEyebrow}>Coverage</p>
            <h2 className={"font-black text-lg " + ap.title}>Unvisited today</h2>
          </div>
          <Link
            to="/admin/outlet-sales"
            className={"text-xs font-bold " + (dark ? "text-violet-300" : "text-[#3F258B]")}
          >
            Outlet sales →
          </Link>
        </div>
        {reps.length === 0 ? (
          <p className={"text-sm " + ap.muted}>No unvisited beat data for today.</p>
        ) : (
          <div className="space-y-2.5">
            {reps.map((r, i) => (
              <div
                key={String(r.omrId || r.name || r.fullName || i)}
                className={
                  "rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3 border " +
                  (dark ? "border-white/8 bg-black/25" : "border-slate-100 bg-slate-50")
                }
              >
                <div className="min-w-0">
                  <div className={"text-sm font-bold truncate " + ap.title}>
                    {r.name || r.fullName || "OMR"}
                  </div>
                  <div className={"text-[11px] " + ap.muted}>
                    {String(r.unvisited ?? r.count ?? 0)} outlets still open
                  </div>
                </div>
                <span
                  className="shrink-0 text-xs font-black px-2.5 py-1 rounded-xl text-white"
                  style={{ background: "linear-gradient(135deg, #5b3aad, #3F258B)" }}
                >
                  {r.unvisited ?? r.count ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
