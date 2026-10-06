import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAdminPremium, AdminPageHeader } from '../../lib/adminPremium';

function StatCard({ title, value, sub, tone }) {
  const tones = {
    rose: 'linear-gradient(145deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)',
    sky: 'linear-gradient(145deg, #28B8F0 0%, #0ea5e9 50%, #0284c7 100%)',
    emerald: 'linear-gradient(145deg, #34d399 0%, #059669 55%, #047857 100%)',
  };
  return (
    <div
      className="rounded-[1.35rem] p-5 text-white relative overflow-hidden"
      style={{
        background: tones[tone] || tones.sky,
        boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 16px 40px rgba(0,0,0,0.2)',
      }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
      <div className="text-[11px] font-black uppercase tracking-[0.15em] opacity-90 relative">{title}</div>
      <div className="text-2xl md:text-3xl font-black mt-2 tracking-tight relative">{value}</div>
      {sub && <div className="text-xs mt-2 opacity-90 font-semibold relative">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { dark } = useTheme();
  const a = useAdminPremium(dark);
  const [unvisited, setUnvisited] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    api
      .get('/admin/unvisited-today')
      .then((r) => setUnvisited(r.data))
      .catch(() => {});
  }, []);

  const fmt = (n) =>
    `GHS ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-2 border-[#3F258B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        dark={dark}
        eyebrow="Executive"
        title="Dashboard"
        subtitle="FieldForce overview · sales, team & programs"
        right={
          <Link to="/admin/analytics" className={a.btnPrimary} style={a.btnPrimaryStyle}>
            Full analysis →
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          title="Sales today"
          value={fmt(data?.sales?.today?.amount)}
          sub={`${data?.sales?.today?.orders || 0} orders`}
          tone="rose"
        />
        <StatCard
          title="This week"
          value={fmt(data?.sales?.week?.amount)}
          sub={`${data?.sales?.week?.orders || 0} orders`}
          tone="sky"
        />
        <StatCard
          title="This month"
          value={fmt(data?.sales?.month?.amount)}
          sub={`${data?.sales?.month?.orders || 0} orders`}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active OMRs', v: data?.counts?.omrs },
          { label: 'Merchandisers', v: data?.counts?.merchandisers },
          { label: 'Outlets', v: data?.counts?.outlets },
          { label: 'AVC outlets', v: data?.counts?.avc },
        ].map((x) => (
          <div key={x.label} className={`${a.card} p-4`} style={a.cardStyle}>
            <div className={`text-[10px] font-black uppercase tracking-wider ${a.muted}`}>{x.label}</div>
            <div className={`text-2xl font-black mt-1.5 ${a.title}`}>{x.v ?? 0}</div>
          </div>
        ))}
      </div>

      <div className={`${a.card} p-5`} style={a.cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className={a.pageEyebrow}>Coverage</p>
            <h2 className={`font-black text-lg ${a.title}`}>Unvisited today</h2>
          </div>
          <Link to="/admin/outlet-sales" className={`text-xs font-bold ${dark ? 'text-violet-300' : 'text-[#3F258B]'}`}>
            Outlet sales →
          </Link>
        </div>
        {!unvisited && <p className={`text-sm ${a.muted}`}>Loading…</p>}
        {unvisited?.reps?.length === 0 && (
          <p className={`text-sm ${a.muted}`}>No OMR beat data.</p>
        )}
        <div className="space-y-2.5">
          {(unvisited?.reps || []).map((r) => (
            <div
              key={r.omrId || r.name}
              className={`rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3 border ${
                dark ? 'border-white/8 bg-black/25' : 'border-slate-100 bg-slate-50'
              }`}
            >
              <div className="min-w-0">
                <div className={`text-sm font-bold truncate ${a.title}`}>{r.name || r.fullName}</div>
                <div className={`text-[11px] ${a.muted}`}>
                  {r.unvisited ?? r.count ?? 0} outlets still open
                </div>
              </div>
              <span
                className="shrink-0 text-xs font-black px-2.5 py-1 rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg, #5b3aad, #3F258B)' }}
              >
                {r.unvisited ?? r.count ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
