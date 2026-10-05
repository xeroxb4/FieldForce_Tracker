import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function OMRReports() {
  const { dark } = useTheme();
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

  const card = dark
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200 shadow-sm';
  const title = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-300' : 'text-slate-700';
  const soft = dark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="pb-6">
      <h2 className={`text-lg font-bold mb-1 ${title}`}>My Reports</h2>
      <p className={`text-sm mb-4 ${soft}`}>Visits and wrap-ups for the selected day</p>

      <div className={`mb-4 rounded-2xl border p-3 ${card}`}>
        <label className={`block text-sm font-semibold mb-2 ${title}`}>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`w-full rounded-xl px-4 py-3 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-[#3F258B] ${
            dark
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
          style={{ colorScheme: dark ? 'dark' : 'light' }}
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className={`text-sm ${muted}`}>Loading...</p>
      ) : (
        <>
          <div className="mb-6">
            <h3 className={`text-sm font-bold mb-2 ${title}`}>
              Shop Visits ({visits.length})
            </h3>
            {visits.length === 0 ? (
              <p className={`text-sm ${soft}`}>No visits on this date</p>
            ) : (
              <div className="space-y-2">
                {visits.map((v) => (
                  <div key={v._id} className={`rounded-xl border p-3 text-sm ${card}`}>
                    <div className={`font-semibold ${title}`}>{v.shopName}</div>
                    <div className={`mt-0.5 ${muted}`}>
                      {v.outcome}
                      {v.amount > 0 && ` · GHS ${Number(v.amount).toLocaleString()}`}
                    </div>
                    {v.products && (
                      <div className={`text-xs mt-1 ${soft}`}>{v.products}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className={`text-sm font-bold mb-2 ${title}`}>
              Day Wrap-ups ({wrapUps.length})
            </h3>
            {wrapUps.length === 0 ? (
              <p className={`text-sm ${soft}`}>No wrap-up on this date</p>
            ) : (
              <div className="space-y-2">
                {wrapUps.map((w) => (
                  <div key={w._id} className={`rounded-xl border p-3 text-sm ${card}`}>
                    <div className={`font-semibold ${title}`}>
                      {w.date || date}
                    </div>
                    {w.notes && <div className={`mt-1 ${muted}`}>{w.notes}</div>}
                    {w.totalSales != null && (
                      <div className={`mt-1 font-medium ${title}`}>
                        Sales: GHS {Number(w.totalSales).toLocaleString()}
                      </div>
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
