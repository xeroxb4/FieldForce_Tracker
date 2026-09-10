import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { isOnline } from '../../services/api';
import { getCachedWeek, cacheWeek } from '../../services/offline';
import { useTheme } from '../../context/ThemeContext';

const DAY_ORDER = [1, 2, 3, 4, 5]; // OMR Mon-Fri

export default function Beats() {
  const { dark } = useTheme();
  const [week, setWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(null);
  const [gpsMsg, setGpsMsg] = useState('');
  const navigate = useNavigate();

  const uploadOutletPhoto = (outlet, file) => {
    if (!file) return;
    setPhotoBusy(outlet._id);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        let dataUrl = reader.result;
        if (typeof dataUrl === 'string' && dataUrl.length > 400000) {
          dataUrl = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const c = document.createElement('canvas');
              const max = 640;
              let w = img.width;
              let h = img.height;
              if (w > max) {
                h = (h * max) / w;
                w = max;
              }
              c.width = w;
              c.height = h;
              c.getContext('2d').drawImage(img, 0, 0, w, h);
              resolve(c.toDataURL('image/jpeg', 0.7));
            };
            img.src = dataUrl;
          });
        }
        await api.put(`/outlets/${outlet._id}`, { photo: dataUrl });
        const { data } = await api.get('/beats/week');
        setWeek(data);
      } catch (err) {
        setGpsMsg(err.response?.data?.message || 'Could not save shop photo');
      } finally {
        setPhotoBusy(null);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/beats/week');
        cacheWeek(data);
        setWeek(data);
        setSelectedDay(data.today >= 1 && data.today <= 5 ? data.today : 1);
      } catch {
        const cached = getCachedWeek();
        if (cached) {
          setWeek(cached);
          setSelectedDay(cached.today >= 1 && cached.today <= 5 ? cached.today : 1);
          setError('Offline — showing last saved beat');
        } else {
          setError('Failed to load beats. Need network once to download your beat.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const goToLogShop = (data, agentLocation, outlet) => {
    navigate('/omr/log-shop', {
      state: {
        outletId: data.outlet?._id || outlet._id,
        shopName: data.outlet?.displayName || data.outlet?.name || outlet.displayName || outlet.name,
        contactName: data.outlet?.contactName || outlet.contactName,
        contactPhone: data.outlet?.contactPhone || outlet.contactPhone,
        outletLocation: data.outlet?.location || outlet.location,
        agentLocation: data.agentLocation || agentLocation,
        distanceMeters: data.distanceMeters,
      },
    });
  };

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
            goToLogShop(data, agentLocation, outlet);
          } catch (err) {
            const body = err.response?.data;
            // Standing at shop but pin is wrong → offer exact GPS update
            if (body?.code === 'TOO_FAR' && body?.canUpdateLocation) {
              const ok = window.confirm(
                `${body.message}\n\nAre you standing at "${outlet.displayName || outlet.name}" right now?\n\nTap OK to save THIS exact GPS as the shop location, then start the visit.\nTap Cancel if you are not at the shop yet.`
              );
              if (ok) {
                try {
                  await api.patch(`/omr/outlets/${outlet._id}/location`, agentLocation);
                  const { data } = await api.post('/omr/visits/start', {
                    outletId: outlet._id,
                    ...agentLocation,
                  });
                  goToLogShop(data, agentLocation, outlet);
                  return;
                } catch (e2) {
                  setGpsMsg(e2.response?.data?.message || 'Could not update shop location.');
                  setStartingId(null);
                  return;
                }
              }
            }
            setGpsMsg(body?.message || 'Could not start visit. Move closer to the outlet.');
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
      { enableHighAccuracy: true, timeout: 20000 }
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
  const isTodayBeat = Number(week?.today) === Number(selectedDay);

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

      {!isTodayBeat && selectedDay && (
        <div className="mb-3 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
          Planning view only — start a visit on today&apos;s beat. Other days are for review.
        </div>
      )}

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
            <div
              key={o._id}
              className={`w-full rounded-2xl border p-3 ${
                dark
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-gradient-to-r from-violet-50 to-fuchsia-50 border-violet-200 shadow-md'
              } ${!isTodayBeat ? 'opacity-80' : ''}`}
            >
              <div className="flex items-center gap-3">
                <label className="relative shrink-0 cursor-pointer">
                  <div
                    className={`w-12 h-12 rounded-xl overflow-hidden border flex items-center justify-center ${
                      dark ? 'bg-slate-900 border-slate-600' : 'bg-white border-slate-200'
                    }`}
                  >
                    {o.photo ? (
                      <img src={o.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className={`text-lg ${dark ? 'text-slate-500' : 'text-slate-400'}`}>📷</span>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-800">
                    +
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={photoBusy === o._id}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadOutletPhoto(o, f);
                      e.target.value = '';
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {o.displayName || o.name}
                  </div>
                  <div className={`text-xs mt-0.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {o.address || o.territory || '—'}
                    {!o.photo && (
                      <span className={dark ? 'text-emerald-400' : 'text-emerald-600'}> · No photo yet</span>
                    )}
                    {photoBusy === o._id && ' · Saving…'}
                  </div>
                  {o.avcEnrolled && (
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium">
                      AVC {o.avcTier}
                    </span>
                  )}
                </div>
                {isTodayBeat ? (
                  o.visitedToday ? (
                    <span className="text-xs font-bold shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      ✓ Visited
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startOutletVisit(o)}
                      disabled={startingId === o._id}
                      className="text-xs font-bold shrink-0 px-2.5 py-1.5 rounded-lg bg-[#d9f99d] text-lime-900 border border-lime-300 disabled:opacity-60"
                    >
                      {startingId === o._id ? 'Starting…' : 'Start visit →'}
                    </button>
                  )
                ) : (
                  <span className="text-[10px] font-bold shrink-0 px-2 py-1 rounded-lg bg-slate-200 text-slate-600">
                    Not today
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
