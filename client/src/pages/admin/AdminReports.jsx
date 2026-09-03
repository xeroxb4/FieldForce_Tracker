import { useState } from 'react';
import api from '../../services/api';

export default function AdminReports() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [repName, setRepName] = useState('All');
  const [territory, setTerritory] = useState('All');
  const [distributor, setDistributor] = useState('All');
  const [visits, setVisits] = useState([]);
  const [wrapUps, setWrapUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ date });
      if (repName !== 'All') params.set('repName', repName);
      if (territory !== 'All') params.set('territory', territory);
      if (distributor !== 'All') params.set('distributor', distributor);

      const [vRes, wRes] = await Promise.all([
        api.get(`/admin/reports/visits?${params}`),
        api.get(`/admin/reports/wrapups?${params}`),
      ]);
      setVisits(vRes.data);
      setWrapUps(wRes.data);
      setLoaded(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Admin Reports</h2>
      <p className="text-sm text-slate-500 mb-4">Filter and view all field data</p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rep</label>
            <input
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="All"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Territory</label>
            <input
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="All"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Distributor</label>
            <input
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="All"
            />
          </div>
        </div>

        <button
          onClick={loadReports}
          disabled={loading}
          className="w-full bg-navy text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Load Reports'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200 mb-4">
          {error}
        </div>
      )}

      {loaded && (
        <>
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">
              Shop Visits ({visits.length})
            </h3>
            {visits.length === 0 ? (
              <p className="text-sm text-slate-400">No visits found</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {visits.map((v) => (
                  <div key={v._id} className="bg-white border border-slate-200 rounded-xl p-3 text-sm">
                    <div className="font-medium">{v.shopName}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {v.repName} · {v.outcome}
                      {v.amount > 0 && ` · GHS ${v.amount}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-2">
              Wrap-Ups ({wrapUps.length})
            </h3>
            {wrapUps.length === 0 ? (
              <p className="text-sm text-slate-400">No wrap-ups found</p>
            ) : (
              <div className="space-y-2">
                {wrapUps.map((w) => (
                  <div key={w._id} className="bg-white border border-slate-200 rounded-xl p-3 text-sm">
                    <div className="font-medium">{w.repName}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      Visited: {w.shopsVisited} · Orders: {w.ordersCount} · GHS {w.totalAmount}
                    </div>
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
