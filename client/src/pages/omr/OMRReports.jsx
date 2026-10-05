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
      setVisits(vRes.data);
      setWrapUps(wRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';

  return (
    <div>
      <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>My Reports</h2>
      <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        View your visits and wrap-ups
      </p>

      <div className="mb-4">
        <label className={`block text-sm font-medium mb-1 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ colorScheme: dark ? 'dark' : 'light' }}
          className={`w-full rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-2 focus:ring-[#2596be] ${
            dark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'
          }`}
        />
      </div>

      {error && (
        <div
          className={`text-sm px-4 py-3 rounded-xl border mb-4 ${
            dark ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Loading...</p>
      ) : (
        <>
          {/* Visits */}
          <div className="mb-6">
            <h3 className={`text-sm font-bold mb-2 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
              Shop Visits ({visits.length})
            </h3>
            {visits.length === 0 ? (
              <p className={`text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No visits on this date</p>
            ) : (
              <div className="space-y-2">
                {visits.map((v) => (
                  <div key={v._id} className={`rounded-xl p-3 text-sm border ${card}`}>
                    <div className={`font-medium ${dark ? 'text-white' : 'text-slate-800'}`}>{v.shopName}</div>
                    <div className={`mt-0.5 ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
                      {v.outcome}
                      {v.amount > 0 && ` · GHS ${v.amount}`}
                    </div>
                    {v.products && (
                      <div className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
                        {v.products}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wrap-ups */}
          <div>
            <h3 className={`text-sm font-bold mb-2 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
              Day Wrap-Ups ({wrapUps.length})
            </h3>
            {wrapUps.length === 0 ? (
              <p className={`text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No wrap-up on this date</p>
            ) : (
              <div className="space-y-2">
                {wrapUps.map((w) => (
                  <div key={w._id} className={`rounded-xl p-3 text-sm border ${card}`}>
                    <div className="flex justify-between">
                      <span className={`font-medium ${dark ? 'text-white' : 'text-slate-800'}`}>
                        Visited: {w.shopsVisited}
                      </span>
                      <span className={dark ? 'text-slate-300' : 'text-slate-500'}>
                        Orders: {w.ordersCount}
                      </span>
                    </div>
                    <div className={`mt-0.5 ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
                      Amount: GHS {w.totalAmount}
                    </div>
                    {w.shopNames?.length > 0 && (
                      <div className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
                        {w.shopNames.join(', ')}
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
