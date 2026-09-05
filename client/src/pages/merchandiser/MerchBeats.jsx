import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { isOnline } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { cacheBeat, getCachedBeat } from '../../services/offline';

const DAYS = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
];

function dateForWeekday(dayNum) {
  // Find date in current week (Mon-Sat) matching dayNum
  const now = new Date();
  const jsDay = now.getDay() || 7; // 1-7 Mon-Sun
  const diff = dayNum - jsDay;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function MerchBeats() {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const todayNum = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();
  const [selectedDay, setSelectedDay] = useState(todayNum === 7 ? 1 : Math.min(todayNum, 6));
  const [beat, setBeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      const date = dateForWeekday(selectedDay);
      try {
        if (isOnline()) {
          const { data } =
            selectedDay === todayNum
              ? await api.get('/beats/today')
              : await api.get(`/beats?date=${date}`);
          setBeat(data);
          if (selectedDay === todayNum) cacheBeat(data);
        } else {
          const cached = getCachedBeat();
          if (cached && selectedDay === todayNum) setBeat(cached);
          else setError('Offline — only today\'s cached beat is available');
        }
      } catch {
        const cached = getCachedBeat();
        if (cached && selectedDay === todayNum) setBeat(cached);
        else setError('Failed to load beat');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDay, todayNum]);

  const startVisit = (outlet) => {
    navigate('/merch/visit', {
      state: {
        shopName: outlet.name,
        outletId: outlet._id,
        fromBeat: true,
      },
    });
  };

  const card = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm';

  return (
    <div>
      <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>
        Weekly Beat
      </h2>
      <p className={`text-sm mb-3 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        Mon–Sat outlet plan
      </p>

      {/* Day tabs like reference */}
      <div
        className={`flex gap-0.5 mb-4 p-1 rounded-xl overflow-x-auto ${
          dark ? 'bg-slate-800' : 'bg-slate-100'
        }`}
      >
        {DAYS.map((d) => (
          <button
            key={d.n}
            type="button"
            onClick={() => setSelectedDay(d.n)}
            className={`flex-1 min-w-[2.5rem] py-2 rounded-lg text-xs font-semibold ${
              selectedDay === d.n
                ? 'bg-teal-600 text-white'
                : dark
                ? 'text-slate-400'
                : 'text-slate-500'
            }`}
          >
            {d.label}
            {d.n === todayNum && <span className="block text-[8px] opacity-80">Today</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Loading...</p>
      ) : error ? (
        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : !beat?.isWorkingDay && selectedDay === todayNum ? (
        <div className={`rounded-xl p-4 text-sm ${dark ? 'bg-slate-800 text-slate-300' : 'bg-amber-50 text-amber-800'}`}>
          {beat?.message || 'Not a working day'}
        </div>
      ) : !beat?.outlets?.length ? (
        <div className={`rounded-xl p-4 text-sm ${dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
          No outlets assigned for this day. Admin can assign outlets to your Mon–Sat beat.
        </div>
      ) : (
        <div className="space-y-2">
          {beat.outlets.map((o) => (
            <div key={o._id} className={`rounded-2xl border p-3 ${card}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className={`font-semibold text-sm truncate ${dark ? 'text-white' : 'text-slate-800'}`}>
                    {o.name}
                  </div>
                  {o.address && (
                    <div className={`text-xs truncate ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {o.address}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-teal-600">
                    <span>📍</span> Outlet
                  </div>
                </div>
                {o.visited ? (
                  <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                    Done
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => startVisit(o)}
                    className="text-xs font-semibold bg-teal-600 text-white px-3 py-1.5 rounded-full whitespace-nowrap"
                  >
                    Start Visit
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
