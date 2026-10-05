import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usePremium, PremiumHero } from '../../lib/premium';

export default function OMRReports() {
  const { dark } = useTheme();
  const p = usePremium(dark);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [visits, setVisits] = useState([]);
  const [wrapUps, setWrapUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [vRes, wRes] = await Promise.all([
        api.get(`/omr/visits?date=${date}`),
        api.get(`/omr/wrapups?date=${date}`),
      ]);
      setVisits(vRes.data || []);
      setWrapUps(wRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  const productive = visits.filter((v) => v.outcome === 'Order Placed').length;
  const totalAmt = visits.reduce((s, v) => s + (Number(v.amount) || 0), 0);

  return (
    <div className={`-mx-4 -mt-2 px-4 pb-12 min-h-[70vh] ${p.shell}`}>
      <PremiumHero
        dark={dark}
        eyebrow="Field intelligence"
        title="My Reports"
        subtitle="Visits, orders & wrap-ups for any day"
      />

      {/* Date + KPI strip */}
      <div className={`rounded-[1.5rem] p-5 mb-5 ${p.glass}`}>
        <label className={p.label}>Select date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={p.input}
          style={{ colorScheme: dark ? 'dark' : 'light' }}
        />
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Visits', value: visits.length, color: 'text-sky-400' },
            { label: 'Orders', value: productive, color: 'text-emerald-400' },
            {
              label: 'Value',
              value: totalAmt ? `GHS ${totalAmt.toLocaleString()}` : '—',
              color: 'text-violet-400',
            },
          ].map((k) => (
            <div
              key={k.label}
              className={`rounded-2xl px-3 py-3 text-center ${
                dark ? 'bg-slate-950/70 border border-white/8' : 'bg-violet-50/80 border border-violet-100'
              }`}
            >
              <p className={`text-[10px] font-black uppercase tracking-wider ${p.soft}`}>{k.label}</p>
              <p className={`text-lg font-black mt-0.5 ${k.color}`}>{loading ? '…' : k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm px-4 py-3 rounded-2xl border font-semibold bg-red-50 text-red-700 border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className={`rounded-[1.5rem] p-8 text-center ${p.glass}`}>
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#3F258B] border-t-transparent animate-spin" />
          <p className={`text-sm mt-3 font-medium ${p.muted}`}>Loading reports…</p>
        </div>
      ) : (
        <>
          {/* Visits */}
          <div className={`rounded-[1.5rem] p-5 mb-5 ${p.glass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-black tracking-tight ${p.title}`}>
                Shop visits
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${p.chip}`}>
                {visits.length}
              </span>
            </div>
            {visits.length === 0 ? (
              <p className={`text-sm ${p.soft}`}>No visits on this date</p>
            ) : (
              <div className="space-y-2.5">
                {visits.map((v) => {
                  const ordered = v.outcome === 'Order Placed';
                  return (
                    <div
                      key={v._id}
                      className={`rounded-2xl p-4 border ${
                        dark
                          ? 'bg-slate-950/60 border-white/8'
                          : 'bg-white border-slate-100 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-bold text-sm truncate ${p.title}`}>{v.shopName}</p>
                          <p className={`text-xs mt-1 font-medium ${ordered ? 'text-emerald-500' : p.muted}`}>
                            {v.outcome}
                            {v.amount > 0 && ` · GHS ${Number(v.amount).toLocaleString()}`}
                          </p>
                          {v.products && (
                            <p className={`text-[11px] mt-1.5 leading-relaxed ${p.soft}`}>{v.products}</p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg ${
                            ordered
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : dark
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {ordered ? 'Order' : 'Visit'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wrap-ups */}
          <div className={`rounded-[1.5rem] p-5 ${p.glass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-black tracking-tight ${p.title}`}>Day wrap-ups</h3>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${p.chip}`}>
                {wrapUps.length}
              </span>
            </div>
            {wrapUps.length === 0 ? (
              <p className={`text-sm ${p.soft}`}>No wrap-up on this date</p>
            ) : (
              <div className="space-y-2.5">
                {wrapUps.map((w) => (
                  <div
                    key={w._id}
                    className={`rounded-2xl p-4 border ${
                      dark
                        ? 'bg-slate-950/60 border-white/8'
                        : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <p className={`font-bold text-sm ${p.title}`}>{w.date || date}</p>
                    {w.notes && <p className={`text-xs mt-1.5 ${p.muted}`}>{w.notes}</p>}
                    {(w.totalSales != null || w.totalAmount != null) && (
                      <p className={`text-sm font-black mt-2 text-violet-400`}>
                        Sales: GHS {Number(w.totalSales ?? w.totalAmount).toLocaleString()}
                      </p>
                    )}
                    {w.shopsVisited != null && (
                      <p className={`text-[11px] mt-1 ${p.soft}`}>
                        Visited {w.shopsVisited}
                        {w.shopsPlanned != null ? ` / ${w.shopsPlanned} planned` : ''}
                        {w.ordersCount != null ? ` · ${w.ordersCount} orders` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
