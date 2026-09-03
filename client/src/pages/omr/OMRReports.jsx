import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function OMRReports() {
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

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">My Reports</h2>
      <p className="text-sm text-slate-500 mb-4">View your visits and wrap-ups</p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <>
          {/* Visits */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">
              Shop Visits ({visits.length})
            </h3>
            {visits.length === 0 ? (
              <p className="text-sm text-slate-400">No visits on this date</p>
            ) : (
              <div className="space-y-2">
                {visits.map((v) => (
                  <div key={v._id} className="bg-white border border-slate-200 rounded-xl p-3 text-sm">
                    <div className="font-medium text-slate-800">{v.shopName}</div>
                    <div className="text-slate-500 mt-0.5">
                      {v.outcome}
                      {v.amount > 0 && ` · GHS ${v.amount}`}
                    </div>
                    {v.products && <div className="text-slate-400 text-xs mt-0.5">{v.products}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wrap-ups */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-2">
              Day Wrap-Ups ({wrapUps.length})
            </h3>
            {wrapUps.length === 0 ? (
              <p className="text-sm text-slate-400">No wrap-up on this date</p>
            ) : (
              <div className="space-y-2">
                {wrapUps.map((w) => (
                  <div key={w._id} className="bg-white border border-slate-200 rounded-xl p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Visited: {w.shopsVisited}</span>
                      <span className="text-slate-500">Orders: {w.ordersCount}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5">Amount: GHS {w.totalAmount}</div>
                    {w.shopNames?.length > 0 && (
                      <div className="text-xs text-slate-400 mt-1">
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
