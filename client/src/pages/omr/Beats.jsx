import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { isOnline } from '../../services/api';
import { cacheBeat, getCachedBeat } from '../../services/offline';

export default function Beats() {
  const [beat, setBeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState(null);
  const [gpsMsg, setGpsMsg] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        if (isOnline()) {
          const { data } = await api.get('/beats/today');
          setBeat(data);
          cacheBeat(data);
          setFromCache(false);
        } else {
          const cached = getCachedBeat();
          if (cached) {
            setBeat(cached);
            setFromCache(true);
          } else {
            setError('Offline and no cached beat. Connect once to load today\'s outlets.');
          }
        }
      } catch {
        const cached = getCachedBeat();
        if (cached) {
          setBeat(cached);
          setFromCache(true);
        } else {
          setError('Failed to load beat');
        }
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

        // Online: verify distance with server
        if (isOnline()) {
          try {
            const { data } = await api.post('/omr/visits/start', {
              outletId: outlet._id,
              ...agentLocation,
            });
            navigate('/omr/log-shop', {
              state: {
                outletId: data.outlet._id,
                shopName: data.outlet.name,
                contactName: data.outlet.contactName,
                contactPhone: data.outlet.contactPhone,
                outletLocation: data.outlet.location,
                agentLocation: data.agentLocation,
                distanceMeters: data.distanceMeters,
                fromBeat: true,
              },
            });
          } catch (err) {
            setGpsMsg(err.response?.data?.message || 'Could not start visit');
            setStartingId(null);
          }
        } else {
          // Offline: allow start with local GPS only (server will re-check on sync if needed)
          navigate('/omr/log-shop', {
            state: {
              outletId: outlet._id,
              shopName: outlet.name,
              contactName: outlet.contactName,
              contactPhone: outlet.contactPhone,
              outletLocation: outlet.location,
              agentLocation,
              fromBeat: true,
              offlineStart: true,
            },
          });
        }
      },
      () => {
        setGpsMsg(
          'Location is off or denied. Turn on GPS and stand at the outlet to start the visit.'
        );
        setStartingId(null);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  if (loading) return <p className="text-sm text-slate-500">Loading today's beat...</p>;
  if (error)
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
        {error}
      </div>
    );
  if (!beat) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-slate-800">Today's Beat</h2>
        {!isOnline() && (
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
            Offline{fromCache ? ' · cached' : ''}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-4">
        {beat.dayName} · {beat.date}
        {beat.isWorkingDay && beat.total > 0 && (
          <span className="ml-2 text-navy font-medium">
            {beat.visitedCount}/{beat.total} visited
          </span>
        )}
      </p>

      {gpsMsg && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
          {gpsMsg}
        </div>
      )}

      {!beat.isWorkingDay ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          {beat.message || 'Not a working day'}
        </div>
      ) : beat.outlets.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
          No outlets assigned for {beat.dayName}. Create outlets and wait for admin to approve &amp;
          assign days.
        </div>
      ) : (
        <div className="space-y-2">
          {beat.outlets.map((o) => (
            <button
              key={o._id}
              type="button"
              disabled={o.visited || startingId === o._id}
              onClick={() => startOutletVisit(o)}
              className={`w-full text-left bg-white border rounded-xl p-3 transition ${
                o.visited
                  ? 'border-green-200 bg-green-50/50 opacity-80'
                  : 'border-slate-200 hover:border-navy active:bg-slate-50'
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
                ) : startingId === o._id ? (
                  <span className="text-xs text-navy">Checking GPS...</span>
                ) : (
                  <span className="text-xs bg-navy text-white px-3 py-1.5 rounded-lg font-medium">
                    Start Visit
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4 text-center">
        Tap an outlet to start. GPS must confirm you are at the shop.
      </p>
    </div>
  );
}
