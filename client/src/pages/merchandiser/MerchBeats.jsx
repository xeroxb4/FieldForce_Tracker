import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const DAYS = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
];

export default function MerchBeats() {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const todayNum = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();
  const [selectedDay, setSelectedDay] = useState(
    todayNum === 7 ? 1 : Math.min(todayNum, 6)
  );
  const [week, setWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/beats/week');
        setWeek(data);
        if (data?.today && data.today >= 1 && data.today <= 6) {
          setSelectedDay(data.today);
        }
      } catch {
        setError('Failed to load beats. Ask admin to assign outlets to your days.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startVisit = (outlet) => {
    navigate('/merch/visit', {
      state: {
        shopName: outlet.displayName || outlet.name,
        outletId: outlet._id,
        fromBeat: true,
      },
    });
  };

  const outlets = week?.days?.[selectedDay]?.outlets || [];
  const dayName = week?.days?.[selectedDay]?.dayName || '';

  return (
    <div>
      <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
        Weekly Beats
      </h2>
      <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Outlets by day (Mon–Sat). Tap a day, then open a store visit.
      </p>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {DAYS.map((d) => {
          const count = week?.days?.[d.n]?.outlets?.length || 0;
          const active = selectedDay === d.n;
          const isToday = week?.today === d.n;
          return (
            <button
              key={d.n}
              type="button"
              onClick={() => setSelectedDay(d.n)}
              className={`flex-1 min-w-[3.2rem] py-2 rounded-xl text-center transition ${
                active
                  ? 'bg-[#2596be] text-white shadow-md font-bold'
                  : dark
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-white text-slate-700 border-2 border-[#2596be]/40 font-semibold'
              }`}
            >
              <div className="text-[10px] uppercase">{d.label}</div>
              <div className="text-sm font-bold">{count}</div>
              {isToday && <div className="text-[9px] opacity-80">Today</div>}
            </button>
          );
        })}
      </div>

      {loading && (
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Loading…</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <>
          <div className={`mb-3 text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
            {dayName} · {outlets.length} outlet{outlets.length !== 1 ? 's' : ''}
          </div>
          {outlets.length === 0 ? (
            <div
              className={`rounded-2xl border-2 p-6 text-center text-sm font-medium ${
                dark
                  ? 'border-slate-700 text-slate-400'
                  : 'border-[#2596be]/40 text-slate-700 bg-white'
              }`}
            >
              No outlets assigned for {dayName}.
            </div>
          ) : (
            <div className="space-y-2">
              {outlets.map((o) => (
                <button
                  key={o._id}
                  type="button"
                  onClick={() => startVisit(o)}
                  className={`w-full text-left rounded-2xl p-4 transition ${
                    dark
                      ? 'bg-slate-800 border border-slate-700 hover:border-[#2596be]'
                      : 'ff-card-accent hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {o.displayName || o.name}
                      </div>
                      {(o.address || o.territory) && (
                        <div className={`text-xs mt-0.5 font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {o.address || o.territory}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#2596be] shrink-0">Visit →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
