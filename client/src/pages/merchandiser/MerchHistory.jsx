import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function MerchHistory() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/merchandiser/visits?date=${date}`)
      .then((res) => setVisits(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Visit History</h2>
      <p className="text-sm text-slate-500 mb-4">Your past merchandiser visits</p>

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
      ) : visits.length === 0 ? (
        <p className="text-sm text-slate-400">No visits on this date</p>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <div key={v._id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="font-medium text-slate-800">{v.shopName}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {v.skuEntries?.length || 0} SKUs recorded
              </div>
              {v.overallNotes && (
                <div className="text-sm text-slate-500 mt-1">{v.overallNotes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
