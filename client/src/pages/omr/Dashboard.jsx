import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function Dashboard() {
  const [target, setTarget] = useState(null);
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsError, setGpsError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, sRes, aRes] = await Promise.all([
        api.get('/targets/me'),
        api.get('/credits/summary'),
        api.get('/attendance/today'),
      ]);
      setTarget(tRes.data);
      setSummary(sRes.data);
      setAttendance(aRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCheckIn = () => {
    setGpsError('');
    setCheckingIn(true);

    if (!navigator.geolocation) {
      setGpsError('GPS is not supported on this device. Turn on location or you will be marked absent.');
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post('/attendance/check-in', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          await load();
        } catch (err) {
          setGpsError(err.response?.data?.message || 'Failed to check in');
        } finally {
          setCheckingIn(false);
        }
      },
      (err) => {
        setGpsError(
          'Location is switched off or denied. Please turn on GPS to record attendance, or you will be marked as absent from work.'
        );
        setCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  }

  const pct = target?.percentage || 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Dashboard</h2>

      {/* Attendance */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700">Today's Attendance</div>
            {attendance?.checkedIn ? (
              <div className="text-xs text-green-600 mt-0.5">
                ✓ Checked in
                {attendance.attendance?.checkedInAt &&
                  ` at ${new Date(attendance.attendance.checkedInAt).toLocaleTimeString()}`}
              </div>
            ) : (
              <div className="text-xs text-amber-600 mt-0.5">Not checked in yet</div>
            )}
          </div>
          {!attendance?.checkedIn && (
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="bg-navy text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {checkingIn ? 'Getting GPS...' : 'Check In'}
            </button>
          )}
        </div>
        {gpsError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {gpsError}
          </div>
        )}
      </div>

      {/* Monthly Target */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium text-slate-700">Monthly Target</div>
          <div className="text-xs text-slate-400">{target?.month || '—'}</div>
        </div>
        {target?.hasTarget ? (
          <>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">
                GHS {(target.achievedAmount || 0).toLocaleString()} /{' '}
                {(target.targetAmount || 0).toLocaleString()}
              </span>
              <span className="font-bold text-navy">{pct}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400">No target set for this month yet</p>
        )}
      </div>

      {/* Sales / Received / Owings */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500">Total Sales</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5">
            {summary ? `GHS ${(summary.totalSales || 0).toLocaleString()}` : '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500">Received</div>
          <div className="text-sm font-bold text-emerald-600 mt-0.5">
            {summary ? `GHS ${(summary.received || 0).toLocaleString()}` : '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500">Owings</div>
          <div className="text-sm font-bold text-amber-600 mt-0.5">
            {summary ? `GHS ${(summary.owings || 0).toLocaleString()}` : '—'}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/omr/owings"
          className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center text-sm font-medium text-amber-800"
        >
          View Owings ({summary?.pendingCredits || 0})
        </Link>
        <Link
          to="/omr/beats"
          className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center text-sm font-medium text-blue-800"
        >
          Today's Beat
        </Link>
        <Link
          to="/omr/outlets"
          className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-sm font-medium text-slate-700"
        >
          My Outlets
        </Link>
        <Link
          to="/omr/log-shop"
          className="bg-navy text-white rounded-xl p-3 text-center text-sm font-medium"
        >
          Log Shop
        </Link>
      </div>
    </div>
  );
}
