import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { getCachedBeat, cacheBeat } from '../../services/offline';

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

export default function BeatMap() {
  const { dark } = useTheme();
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
        (p) => setMyPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
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
          : [5.6037, -0.187]; // Accra default
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
            fillColor: '#2596be',
            fillOpacity: 1,
          }).addTo(map);
          m.bindPopup('You are here');
          bounds.push([myPos.lat, myPos.lng]);
        }
        withGps.forEach((o, i) => {
          const marker = L.marker([o.location.lat, o.location.lng]).addTo(map);
          marker.bindPopup(
            `<strong>${o.displayName || o.name}</strong><br/>${o.address || ''}<br/><em>#${i + 1} on beat</em>`
          );
          bounds.push([o.location.lat, o.location.lng]);
        });
        if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
      } catch (e) {
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

  const card = dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900';

  return (
    <div className="space-y-3">
      <div>
        <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Today’s beat map</h2>
        <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          {dayName} · {outlets.length} outlet(s) · blue dot = you
        </p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Loading map…</p>
      ) : (
        <div ref={mapRef} className="w-full h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow" />
      )}
      <div className={`rounded-2xl p-3 space-y-2 ${card}`}>
        <div className="text-xs font-bold uppercase tracking-wide opacity-60">List</div>
        {outlets.length === 0 && <p className="text-sm opacity-70">No outlets on today’s beat.</p>}
        {outlets.map((o, i) => (
          <div key={o._id || i} className="text-sm flex justify-between gap-2 border-b border-black/5 pb-2">
            <span>
              <span className="font-bold text-[#2596be] mr-1">{i + 1}.</span>
              {o.displayName || o.name}
            </span>
            <span className="text-[10px] opacity-50">
              {o.location?.lat ? '📍' : 'No GPS'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
