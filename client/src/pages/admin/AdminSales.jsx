import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const DISTRIBUTORS = ['Amata', 'Daddy Ash', 'Daniel Adjei', 'Ernievero', 'Nivea Ghana'];

export default function AdminSales() {
  const { dark } = useTheme();
  const [data, setData] = useState(null);
  const [filterDist, setFilterDist] = useState('');

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data)).catch(() => {});
  }, []);

  const fmt = (n) => `GHS ${Number(n || 0).toLocaleString()}`;
  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';
  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border-2 font-medium ${
    dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-[#2596be]/40 text-slate-900'
  }`;

  const rows = useMemo(() => {
    const list = data?.omrSalesToday || [];
    if (!filterDist) return list;
    return list.filter((r) =>
      (r.distributor || '').toLowerCase().includes(filterDist.toLowerCase())
    );
  }, [data, filterDist]);

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Sales</h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Today · this week · this month · per OMR (filter by distributor)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ['Today', data?.sales?.today],
          ['This week', data?.sales?.week],
          ['This month', data?.sales?.month],
        ].map(([label, s]) => (
          <div key={label} className={`rounded-2xl border-2 p-4 ${card}`}>
            <div className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</div>
            <div className={`text-xl font-extrabold mt-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
              {fmt(s?.amount)}
            </div>
            <div className="text-xs font-semibold text-[#2596be] mt-1">{s?.orders || 0} orders</div>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Daily sales by OMR</h3>
          <select className={`${inputCls} sm:max-w-xs`} value={filterDist} onChange={(e) => setFilterDist(e.target.value)}>
            <option value="">All distributors</option>
            {DISTRIBUTORS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className={dark ? 'text-slate-400' : 'text-slate-600'}>
                <th className="text-left py-2 font-bold">OMR</th>
                <th className="text-left py-2 font-bold">Distributor</th>
                <th className="text-right py-2 font-bold">Orders</th>
                <th className="text-right py-2 font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-t ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <td className={`py-2 font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{r.omr}</td>
                  <td className={dark ? 'text-slate-400' : 'text-slate-600'}>{r.distributor || '—'}</td>
                  <td className="text-right font-medium">{r.orders}</td>
                  <td className="text-right font-bold text-[#2596be]">{fmt(r.total)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    No sales for this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
