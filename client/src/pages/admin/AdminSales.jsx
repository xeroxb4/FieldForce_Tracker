import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AdminSales() {
  const { dark } = useTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data)).catch(() => {});
  }, []);

  const fmt = (n) => `GHS ${Number(n || 0).toLocaleString()}`;
  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Sales</h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Today · this week · this month · per OMR
      </p>

      <div className="grid sm:grid-cols-3 gap-3">
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
        <h3 className={`font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>Daily sales by OMR</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={dark ? 'text-slate-400' : 'text-slate-600'}>
                <th className="text-left py-2 font-bold">OMR</th>
                <th className="text-left py-2 font-bold">Distributor</th>
                <th className="text-right py-2 font-bold">Orders</th>
                <th className="text-right py-2 font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.omrSalesToday || []).map((r, i) => (
                <tr key={i} className={`border-t ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <td className={`py-2 font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{r.omr}</td>
                  <td className={dark ? 'text-slate-400' : 'text-slate-600'}>{r.distributor || '—'}</td>
                  <td className="text-right font-medium">{r.orders}</td>
                  <td className="text-right font-bold text-[#2596be]">{fmt(r.total)}</td>
                </tr>
              ))}
              {!data?.omrSalesToday?.length && (
                <tr>
                  <td colSpan={4} className={`py-4 text-center ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                    No sales recorded today
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
