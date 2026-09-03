import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Beats() {
  const [beat, setBeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/beats/today')
      .then((res) => setBeat(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load beat'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading today's beat...</p>;
  if (error) return <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>;
  if (!beat) return null;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Today's Beat</h2>
      <p className="text-sm text-slate-500 mb-4">
        {beat.dayName} · {beat.date}
        {beat.isWorkingDay && beat.total > 0 && (
          <span className="ml-2 text-navy font-medium">
            {beat.visitedCount}/{beat.total} visited
          </span>
        )}
      </p>

      {!beat.isWorkingDay ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          {beat.message || 'Not a working day'}
        </div>
      ) : beat.outlets.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
          No outlets assigned for {beat.dayName}. Create outlets and wait for admin to approve & assign days.
        </div>
      ) : (
        <div className="space-y-2">
          {beat.outlets.map((o) => (
            <div
              key={o._id}
              className={`bg-white border rounded-xl p-3 ${
                o.visited ? 'border-green-200 bg-green-50/50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-slate-800">{o.name}</div>
                  {o.contactName && (
                    <div className="text-xs text-slate-500">{o.contactName}</div>
                  )}
                  {o.address && <div className="text-xs text-slate-400">{o.address}</div>}
                </div>
                {o.visited ? (
                  <span className="text-xs font-medium text-green-600">✓ Visited</span>
                ) : (
                  <button
                    onClick={() => navigate('/omr/log-shop', { state: { shopName: o.name } })}
                    className="text-xs bg-navy text-white px-3 py-1.5 rounded-lg font-medium"
                  >
                    Log Visit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
