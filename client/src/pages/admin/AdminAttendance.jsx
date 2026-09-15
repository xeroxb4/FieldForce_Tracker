
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export default function AdminAttendance() {
  const { dark } = useTheme();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [role, setRole] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ date });
      if (role !== 'all') q.set('role', role);
      const { data: res } = await api.get(`/admin/attendance?${q}`);
      setData(res);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date, role]);

  const card = dark
    ? 'rounded-2xl border border-slate-700 bg-slate-900 p-4'
    : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
  const label = dark ? 'text-white' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-600';
  const input = dark
    ? 'rounded-xl border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm'
    : 'rounded-xl border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm';

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className={`text-xl font-extrabold ${label}`}>Check-in by day</h1>
        <p className={`text-sm ${muted}`}>
          See who checked in (active on the app) and who is still absent for the selected day.
        </p>
      </div>

      <div className={`flex flex-wrap gap-3 items-end ${card}`}>
        <div>
          <label className={`text-xs font-bold ${muted}`}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`block mt-1 ${input}`} />
        </div>
        <div>
          <label className={`text-xs font-bold ${muted}`}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={`block mt-1 ${input}`}>
            <option value="all">All reps</option>
            <option value="omr">OMR only</option>
            <option value="merchandiser">Merchandiser only</option>
          </select>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-xl bg-[#117ea6] text-white text-sm font-bold"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      {loading && <p className={`text-sm ${muted}`}>Loading…</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className={card}>
              <div className={`text-xs font-bold uppercase ${muted}`}>Present / checked in</div>
              <div className={`text-3xl font-extrabold text-emerald-500`}>{data.presentCount}</div>
            </div>
            <div className={card}>
              <div className={`text-xs font-bold uppercase ${muted}`}>Not checked in</div>
              <div className={`text-3xl font-extrabold text-amber-500`}>{data.absentCount}</div>
            </div>
          </div>

          <div className={card}>
            <h2 className={`font-bold mb-3 ${label}`}>
              Checked in · {data.date}
            </h2>
            {!data.present?.length ? (
              <p className={`text-sm ${muted}`}>No check-ins for this day yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.present.map((r) => (
                  <li
                    key={r._id}
                    className={`rounded-xl border px-3 py-2.5 ${
                      dark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between gap-2 items-start">
                      <div>
                        <div className={`font-bold text-sm ${label}`}>{r.fullName}</div>
                        <div className={`text-xs ${muted}`}>
                          {r.role === 'omr' ? 'OMR' : 'Merchandiser'}
                          {r.distributor ? ` · ${r.distributor}` : ''}
                          {r.territory ? ` · ${r.territory}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-emerald-500">
                          In {fmtTime(r.checkedInAt)}
                        </div>
                        {r.checkedOutAt ? (
                          <div className={`text-xs ${muted}`}>Out {fmtTime(r.checkedOutAt)}</div>
                        ) : (
                          <div className="text-xs font-semibold text-[#117ea6]">Still active</div>
                        )}
                      </div>
                    </div>
                    {r.location?.lat != null && (
                      <a
                        className="text-[11px] text-[#117ea6] font-medium mt-1 inline-block"
                        href={`https://www.google.com/maps?q=${r.location.lat},${r.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View check-in map
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={card}>
            <h2 className={`font-bold mb-3 ${label}`}>Not checked in</h2>
            {!data.absent?.length ? (
              <p className={`text-sm text-emerald-500 font-medium`}>Everyone has checked in.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.absent.map((r) => (
                  <li
                    key={String(r.userId)}
                    className={`rounded-xl border px-3 py-2 flex justify-between ${
                      dark ? 'border-slate-700' : 'border-slate-100'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold text-sm ${label}`}>{r.fullName}</div>
                      <div className={`text-xs ${muted}`}>
                        {r.role === 'omr' ? 'OMR' : 'Merchandiser'}
                        {r.distributor ? ` · ${r.distributor}` : ''}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-500 self-center">Absent</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
