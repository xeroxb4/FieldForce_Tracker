import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { getCachedBeat, cacheBeat } from '../../services/offline';
import { usePremium, PremiumHero } from '../../lib/premium';

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

function openDirections(lat, lng, name) {
  const dest = `${Number(lat)},${Number(lng)}`;
  const label = encodeURIComponent(name || 'Outlet');
  const google = `https://www.google.com/maps/dir/?api=1&destination=${dest}&destination_place_id=&travelmode=driving`;
  const apple = `https://maps.apple.com/?daddr=${dest}&dirflg=d&q=${label}`;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.open(isIOS ? apple : google, '_blank');
}

export default function BeatMap() {
  const { dark } = useTheme();
  const p = usePremium(dark);
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const [outlets, setOutlets] = useState([]);
  const [dayName, setDayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [myPos, setMyPos] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/beats/today');
        if (cancelled) return;
        cacheBeat(data);
        setOutlets(data?.outlets || data?.items || []);
        setDayName(data?.dayName || 'Today');
      } catch {
        const cached = getCachedBeat();
        if (cached) {
          setOutlets(cached.outlets || cached.items || []);
          setDayName(cached.dayName || 'Today (cached)');
        } else setError('Could not load today’s beat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 12000 }
      );
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    let destroyed = false;
    (async () => {
      try {
        const L = await loadLeaflet();
        if (destroyed || !mapRef.current) return;
        if (mapInst.current) {
          mapInst.current.remove();
          mapInst.current = null;
        }
        const withGps = outlets.filter((o) => o.location?.lat && o.location?.lng);
        const center = myPos
          ? [myPos.lat, myPos.lng]
          : withGps.length
          ? [withGps[0].location.lat, withGps[0].location.lng]
          : [5.6037, -0.187];
        const map = L.map(mapRef.current).setView(center, 13);
        mapInst.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        const bounds = [];
        if (myPos) {
          const m = L.circleMarker([myPos.lat, myPos.lng], {
            radius: 9,
            color: '#fff',
            weight: 2,
            fillColor: '#3F258B',
            fillOpacity: 1,
          }).addTo(map);
          m.bindPopup('<strong>You are here</strong>');
          bounds.push([myPos.lat, myPos.lng]);
        }

        withGps.forEach((o, i) => {
          const name = o.displayName || o.name || 'Outlet';
          const lat = o.location.lat;
          const lng = o.location.lng;
          const marker = L.marker([lat, lng]).addTo(map);
          const popupId = `nav-${o._id || i}`;
          marker.bindPopup(
            `<div style="min-width:140px">
              <strong>${name}</strong><br/>
              <span style="font-size:11px;color:#64748b">${o.address || ''}</span><br/>
              <em style="font-size:11px">#${i + 1} on beat</em><br/><br/>
              <button id="${popupId}" type="button"
                style="width:100%;padding:8px 10px;border:none;border-radius:10px;background:#3F258B;color:#fff;font-weight:700;font-size:12px;cursor:pointer">
                Navigate here
              </button>
            </div>`
          );
          marker.on('popupopen', () => {
            const btn = document.getElementById(popupId);
            if (btn) {
              btn.onclick = (e) => {
                e.preventDefault();
                openDirections(lat, lng, name);
              };
            }
          });
          bounds.push([lat, lng]);
        });
        if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
      } catch {
        setError('Map failed to load. Check network.');
      }
    })();
    return () => {
      destroyed = true;
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, [loading, outlets, myPos]);

  const withGps = outlets.filter((o) => o.location?.lat && o.location?.lng).length;

  return (
    <div className={`-mx-4 -mt-2 px-4 pb-12 min-h-[70vh] ${p.shell}`}>
      <PremiumHero
        dark={dark}
        eyebrow="Navigation"
        title="Beat Map"
        subtitle={`${dayName} · ${outlets.length} outlet${outlets.length === 1 ? '' : 's'} · ${withGps} with GPS`}
      />

      {error && (
        <div className="mb-4 text-sm px-4 py-3 rounded-2xl border font-semibold bg-red-50 text-red-700 border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className={`rounded-[1.5rem] p-8 text-center ${p.glass}`}>
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#3F258B] border-t-transparent animate-spin" />
          <p className={`text-sm mt-3 font-medium ${p.muted}`}>Loading map…</p>
        </div>
      ) : (
        <div
          className={`rounded-[1.5rem] overflow-hidden mb-5 border ${
            dark ? 'border-white/10' : 'border-slate-200'
          }`}
          style={{ boxShadow: '0 24px 56px rgba(63,37,139,0.12)' }}
        >
          <div ref={mapRef} className="w-full h-[400px]" />
        </div>
      )}

      <div className={`rounded-[1.5rem] p-5 ${p.glass}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-black tracking-tight ${p.title}`}>Route list</h3>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${p.chip}`}>
            {outlets.length}
          </span>
        </div>
        {outlets.length === 0 && (
          <p className={`text-sm ${p.soft}`}>No outlets on today’s beat.</p>
        )}
        <div className="space-y-2">
          {outlets.map((o, i) => {
            const hasGps = o.location?.lat && o.location?.lng;
            return (
              <div
                key={o._id || i}
                className={`flex items-center justify-between gap-3 rounded-2xl p-3.5 border ${
                  dark
                    ? 'bg-slate-950/60 border-white/8'
                    : 'bg-white border-slate-100 shadow-sm'
                }`}
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span
                    className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #5b3aad, #3F258B)' }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${p.title}`}>
                      {o.displayName || o.name}
                    </p>
                    {!hasGps && (
                      <p className="text-[10px] font-semibold text-amber-500 mt-0.5">
                        No GPS — pin at shop first
                      </p>
                    )}
                    {o.address && (
                      <p className={`text-[11px] truncate mt-0.5 ${p.soft}`}>{o.address}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!hasGps}
                  onClick={() =>
                    openDirections(o.location.lat, o.location.lng, o.displayName || o.name)
                  }
                  className="shrink-0 text-[11px] font-black px-3.5 py-2 rounded-xl text-white disabled:opacity-35"
                  style={{
                    background: hasGps
                      ? 'linear-gradient(135deg, #5b3aad, #3F258B)'
                      : '#94a3b8',
                    boxShadow: hasGps ? '0 8px 20px rgba(63,37,139,0.3)' : 'none',
                  }}
                >
                  Navigate
                </button>
              </div>
            );
          })}
        </div>
        <p className={`text-[11px] mt-4 leading-relaxed ${p.soft}`}>
          Navigate opens Google Maps or Apple Maps with turn-by-turn directions to that shop.
        </p>
      </div>
    </div>
  );
}
