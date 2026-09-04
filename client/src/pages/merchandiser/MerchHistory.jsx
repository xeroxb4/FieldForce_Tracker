import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function MerchHistory() {
  const { dark } = useTheme();
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
      <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>
        Visit History
      </h2>
      <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        Your past merchandiser visits
      </p>

      <div className="mb-4">
        <label className={`block text-sm font-medium mb-1 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`w-full rounded-xl px-4 py-3 text-sm border ${
            dark
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 text-sm px-4 py-3 rounded-xl border border-red-500/20 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Loading...</p>
      ) : visits.length === 0 ? (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-400'}`}>No visits on this date</p>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <div
              key={v._id}
              className={`rounded-xl p-3 border ${
                dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`font-medium text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>
                {v.shopName}
              </div>
              <div className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
                {v.skuEntries?.length || 0} SKUs recorded
              </div>
              {v.overallNotes && (
                <div className={`text-sm mt-1 ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
                  {v.overallNotes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
