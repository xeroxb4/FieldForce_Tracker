import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { isOnline } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const DAY_ORDER = [1, 2, 3, 4, 5]; // OMR Mon-Fri

export default function Beats() {
  const { dark } = useTheme();
  const [week, setWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const [gpsMsg, setGpsMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/beats/week');
        setWeek(data);
        setSelectedDay(data.today >= 1 && data.today <= 5 ? data.today : 1);
      } catch {
        setError('Failed to load beats. Ask admin to assign outlets to your days.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startOutletVisit = (outlet) => {
    setGpsMsg('');
    setStartingId(outlet._id);

    if (!navigator.geolocation) {
      setGpsMsg('GPS not supported. Turn on location to start a visit.');
      setStartingId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const agentLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };

        if (isOnline()) {
          try {
            const { data } = await api.post('/omr/visits/start', {
              outletId: outlet._id,
              ...agentLocation,
            });
            navigate('/omr/log-shop', {
              state: {
                outletId: data.outlet._id,
                shopName: data.outlet.displayName || data.outlet.name,
                contactName: data.outlet.contactName,
                contactPhone: data.outlet.contactPhone,
                outletLocation: data.outlet.location,
                agentLocation: data.agentLocation,
                distanceMeters: data.distanceMeters,
              },
            });
          } catch (err) {
            setGpsMsg(err.response?.data?.message || 'Could not start visit. Move closer to the outlet.');
            setStartingId(null);
          }
        } else {
          navigate('/omr/log-shop', {
            state: {
              outletId: outlet._id,
              shopName: outlet.displayName || outlet.name,
              contactName: outlet.contactName,
              contactPhone: outlet.contactPhone,
              outletLocation: outlet.location,
              agentLocation,
              offline: true,
            },
          });
        }
      },
      () => {
        setGpsMsg('Location is off. Turn on GPS to start a visit.');
        setStartingId(null);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  if (loading) {
    return <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Loading beats…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  const dayData = week?.days?.[selectedDay];
  const outlets = dayData?.outlets || [];

  return (
    <div>
      <h2 className={`text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>
        Daily Beats
      </h2>
      <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        Outlets by day of the week (Mon–Fri). Tap a day, then start a visit.
      </p>

      {/* Day tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {DAY_ORDER.map((d) => {
          const count = week?.days?.[d]?.outlets?.length || 0;
          const isToday = week?.today === d;
          const active = selectedDay === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`flex-1 min-w-[3.5rem] py-2 px-1 rounded-xl text-center transition ${
                active
                  ? 'bg-[#2596be] text-white shadow-lg'
                  : dark
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <div className="text-[10px] font-semibold uppercase">
                {week?.days?.[d]?.dayName?.slice(0, 3)}
              </div>
              <div className="text-sm font-bold">{count}</div>
              {isToday && <div className="text-[9px] opacity-80">Today</div>}
            </button>
          );
        })}
      </div>

      <div className={`mb-3 text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
        {dayData?.dayName || ''} · {outlets.length} outlet{outlets.length !== 1 ? 's' : ''}
      </div>

      {gpsMsg && (
        <div className="mb-3 text-sm px-3 py-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
          {gpsMsg}
        </div>
      )}

      {outlets.length === 0 ? (
        <div
          className={`rounded-2xl border p-6 text-center text-sm ${
            dark ? 'border-slate-700 text-slate-400' : 'border-[#2596be]/60 text-slate-600 bg-white/80'
          }`}
        >
          No outlets assigned for {dayData?.dayName}.
          <br />
          Admin must assign beat days to your outlets.
        </div>
      ) : (
        <div className="space-y-2">
          {outlets.map((o) => (
            <button
              key={o._id}
              type="button"
              onClick={() => startOutletVisit(o)}
              disabled={startingId === o._id}
              className={`w-full text-left rounded-2xl border p-4 transition ${
                dark
                  ? 'bg-slate-800 border-slate-700 hover:border-[#2596be]'
                  : 'bg-white border-[#2596be]/50 hover:border-[#2596be]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`font-semibold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {o.displayName || o.name}
                  </div>
                  {(o.address || o.territory) && (
                    <div className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {o.address || o.territory}
                    </div>
                  )}
                  {o.avcEnrolled && (
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium">
                      AVC {o.avcTier}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-[#2596be] shrink-0">
                  {startingId === o._id ? 'Starting…' : 'Start visit →'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
