import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAdminPremium, AdminPageHeader } from '../../lib/adminPremium';
import PremiumPicker from '../../components/PremiumPicker';

const DISTRIBUTORS = ['Amata', 'Daddy Ash', 'Daniel Adjei', 'Ernievero'];

export default function AdminSales() {
  const { dark } = useTheme();
  const ap = useAdminPremium(dark);
  const [data, setData] = useState(null);
  const [filterDist, setFilterDist] = useState('');
  const [distOpen, setDistOpen] = useState(false);

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data)).catch(() => {});
  }, []);

  const fmt = (n) => `GHS ${Number(n || 0).toLocaleString()}`;
  const card = ap.card;
  const cardStyle = ap.cardStyle;

  const rows = useMemo(() => {
    const list = data?.omrSalesToday || [];
    if (!filterDist) return list;
    return list.filter((r) =>
      (r.distributor || '').toLowerCase().includes(filterDist.toLowerCase())
    );
  }, [data, filterDist]);

  const distOptions = [
    { value: '', label: 'All distributors' },
    ...DISTRIBUTORS.map((d) => ({ value: d, label: d })),
  ];

  const tiles = [
    {
      label: 'Today',
      s: data?.sales?.today,
      bg: 'linear-gradient(145deg, #f43f5e 0%, #e11d48 55%, #be123c 100%)',
    },
    {
      label: 'This week',
      s: data?.sales?.week,
      bg: 'linear-gradient(145deg, #28B8F0 0%, #0ea5e9 55%, #0284c7 100%)',
    },
    {
      label: 'This month',
      s: data?.sales?.month,
      bg: 'linear-gradient(145deg, #34d399 0%, #059669 55%, #047857 100%)',
    },
  ];

  return (
    <div className="space-y-4">
      <AdminPageHeader
        dark={dark}
        eyebrow="Revenue"
        title="Sales"
        subtitle="Today · this week · this month · per OMR"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-[1.35rem] p-4 text-white relative overflow-visible"
            style={{
              background: t.bg,
              boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 12px 28px -6px rgba(0,0,0,0.35)',
            }}
          >
            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-white/95">
              {t.label}
            </div>
            <div className="text-xl font-black mt-1.5 text-white tracking-tight">
              {fmt(t.s?.amount)}
            </div>
            <div className="text-xs font-bold mt-1 text-white/90">{t.s?.orders || 0} orders</div>
          </div>
        ))}
      </div>

      <div className={`${card} p-4`} style={cardStyle}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className={`font-black ${ap.title}`}>Daily sales by OMR</h3>
          <button
            type="button"
            onClick={() => setDistOpen(true)}
            className={`${ap.input} sm:max-w-xs text-left flex items-center justify-between gap-2`}
          >
            <span>{filterDist || 'All distributors'}</span>
            <span className="opacity-60">▾</span>
          </button>
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className={ap.muted}>
                <th className="text-left py-2 font-bold">OMR</th>
                <th className="text-left py-2 font-bold">Distributor</th>
                <th className="text-right py-2 font-bold">Orders</th>
                <th className="text-right py-2 font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-t ${dark ? 'border-white/10' : 'border-slate-100'}`}>
                  <td className={`py-2 font-semibold ${ap.title}`}>{r.omr}</td>
                  <td className={ap.muted}>{r.distributor || '—'}</td>
                  <td className={`text-right font-medium ${ap.title}`}>{r.orders}</td>
                  <td className="text-right font-bold text-[#3F258B]">{fmt(r.total)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className={`py-4 text-center ${ap.soft}`}>
                    No sales for this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PremiumPicker
        open={distOpen}
        onClose={() => setDistOpen(false)}
        title="Distributor"
        options={distOptions}
        value={filterDist}
        onChange={(v) => setFilterDist(v)}
        searchable={false}
      />
    </div>
  );
}
