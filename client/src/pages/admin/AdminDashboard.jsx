import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function StatCard({ title, value, sub, gradient }) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
      <div className="text-sm font-semibold opacity-90">{title}</div>
      <div className="text-2xl md:text-3xl font-extrabold mt-2 tracking-tight">{value}</div>
      {sub && <div className="text-xs mt-2 opacity-85 font-medium">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { dark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) =>
    `GHS ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  if (loading) {
    return <p className={dark ? 'text-slate-400' : 'text-slate-600'}>Loading dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Dashboard
          </h1>
          <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            FieldForce overview · sales, team & programs
          </p>
        </div>
        <Link
          to="/admin/analytics"
          className="text-xs font-bold px-3 py-2 rounded-xl bg-[#2596be] text-white"
        >
          Full analysis →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Sales today"
          value={fmt(data?.sales?.today?.amount)}
          sub={`${data?.sales?.today?.orders || 0} orders`}
          gradient="bg-gradient-to-br from-rose-400 to-pink-500"
        />
        <StatCard
          title="This week"
          value={fmt(data?.sales?.week?.amount)}
          sub={`${data?.sales?.week?.orders || 0} orders`}
          gradient="bg-gradient-to-br from-sky-400 to-blue-600"
        />
        <StatCard
          title="This month"
          value={fmt(data?.sales?.month?.amount)}
          sub={`${data?.sales?.month?.orders || 0} orders`}
          gradient="bg-gradient-to-br from-teal-400 to-emerald-600"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active OMRs', v: data?.counts?.omrs },
          { label: 'Merchandisers', v: data?.counts?.merchandisers },
          { label: 'Outlets', v: data?.counts?.outlets },
          { label: 'AVC outlets', v: data?.counts?.avc },
        ].map((x) => (
          <div
            key={x.label}
            className={`rounded-2xl border-2 p-4 ${
              dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm'
            }`}
          >
            <div className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              {x.label}
            </div>
            <div className={`text-2xl font-extrabold mt-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
              {x.v ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div
          className={`rounded-2xl border-2 p-4 ${
            dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm'
          }`}
        >
          <h3 className={`font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>
            OMR sales today
          </h3>
          {!data?.omrSalesToday?.length ? (
            <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>No orders today yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.omrSalesToday.map((r, i) => (
                <div key={i} className="flex justify-between text-sm gap-2">
                  <div>
                    <div className={`font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{r.omr}</div>
                    <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {r.distributor || '—'} · {r.orders} order(s)
                    </div>
                  </div>
                  <div className="font-bold text-[#2596be] shrink-0">{fmt(r.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`rounded-2xl border-2 p-4 ${
            dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm'
          }`}
        >
          <h3 className={`font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>
            Month by distributor
          </h3>
          {!data?.distributorMonth?.length ? (
            <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>No data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.distributorMonth.map((d, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className={`font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{d.name}</span>
                  <span className="font-bold text-[#2596be]">{fmt(d.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
