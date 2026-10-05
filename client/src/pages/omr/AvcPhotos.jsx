import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  isOnline,
  enqueue,
  syncQueue,
  queueCount,
  getQueue,
} from '../../services/offline';
import { usePremium, PremiumHero } from '../../lib/premium';

export default function AvcPhotos() {
  const { dark } = useTheme();
  const p = usePremium(dark);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [pendingLocal, setPendingLocal] = useState(0);
  const fileRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

  const refreshPending = () => {
    const q = getQueue().filter((i) => i.type === 'avc-photo');
    setPendingLocal(q.length);
  };

  const load = () => {
    setLoading(true);
    api
      .get('/omr/avc-photos/tasks')
      .then((r) => setData(r.data))
      .catch((e) => {
        if (!isOnline()) {
          setError(
            'You are offline. Open AVC when online to see the list, or use queued uploads after sync.'
          );
        } else {
          setError(e.response?.data?.message || 'Failed to load');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    refreshPending();
    const onQ = () => refreshPending();
    const onNet = async () => {
      if (isOnline()) {
        setInfo('Back online — syncing saved photos…');
        await syncQueue(api);
        refreshPending();
        load();
        setInfo('');
      } else {
        setInfo(
          'Offline mode — photos will be saved on this phone and uploaded when network returns.'
        );
      }
    };
    window.addEventListener('ff-queue-change', onQ);
    window.addEventListener('online', onNet);
    window.addEventListener('offline', onNet);
    return () => {
      window.removeEventListener('ff-queue-change', onQ);
      window.removeEventListener('online', onNet);
      window.removeEventListener('offline', onNet);
    };
  }, []);

  const pickPhoto = (outletId) => {
    setActiveId(outletId);
    fileRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeId) return;
    setUploading(activeId);
    setError('');
    setInfo('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      let photo = await compressImage(dataUrl, 0.65, 1280);
      if (typeof photo === 'string' && photo.length > 1_200_000) {
        photo = await compressImage(photo, 0.5, 1024);
      }
      if (typeof photo === 'string' && photo.length > 1_800_000) {
        photo = await compressImage(photo, 0.4, 900);
      }

      let lat;
      let lng;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            timeout: 8000,
            maximumAge: 60000,
          })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        /* optional */
      }

      const payload = { outletId: activeId, photo, lat, lng };

      if (!isOnline()) {
        enqueue({ type: 'avc-photo', payload });
        refreshPending();
        setInfo(
          'Shelf photo saved offline. When network returns it will upload. You can add more shelves after sync or while offline (each queues separately).'
        );
        return;
      }

      try {
        const { data: res } = await api.post('/omr/avc-photos', payload, {
          timeout: 60000,
        });
        setInfo(
          `Shelf photo added (${res.photoCount || '?'}/${res.maxShelves || 8}). Add another shelf if Nivea is on more shelves.`
        );
        load();
      } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.message;
        if (
          !err.response ||
          status >= 500 ||
          err.code === 'ECONNABORTED' ||
          err.message?.includes('Network')
        ) {
          enqueue({ type: 'avc-photo', payload });
          refreshPending();
          setInfo(
            'Upload could not finish. Photo saved on this phone and will sync when connection is stable.'
          );
        } else {
          setError(msg || 'Upload failed');
        }
      }
    } catch (err) {
      setError(err.message || 'Could not read photo');
    } finally {
      setUploading(null);
      setActiveId(null);
    }
  };

  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const maxShelves = data?.maxShelves || 8;
  const progressPct = data?.required
    ? Math.min(100, Math.round((data.done / data.required) * 100))
    : 0;

  if (loading) {
    return (
      <div className={`-mx-4 -mt-2 px-4 pb-12 min-h-[50vh] ${p.shell}`}>
        <div className={`rounded-[1.5rem] p-8 text-center mt-6 ${p.glass}`}>
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#3F258B] border-t-transparent animate-spin" />
          <p className={`text-sm mt-3 font-medium ${p.muted}`}>Loading AVC tasks…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`-mx-4 -mt-2 px-4 pb-12 min-h-[70vh] ${p.shell}`}>
      <PremiumHero
        dark={dark}
        eyebrow="Visibility program"
        title="AVC Shelf Photos"
        subtitle={`Twice a month · up to ${maxShelves} shelves per outlet`}
      >
        {data && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-violet-200/90">
                {data.periodLabel} · {data.month}/{data.year}
              </span>
              <span className="text-white">
                {data.done}/{data.required} done
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-300 via-white to-emerald-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </PremiumHero>

      {!online && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          Offline mode — take photos now; they upload when you are back online.
        </div>
      )}
      {pendingLocal > 0 && (
        <div
          className="mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{
            borderColor: 'rgba(63,37,139,0.35)',
            background: dark ? 'rgba(63,37,139,0.2)' : 'rgba(63,37,139,0.08)',
            color: dark ? '#c4b5fd' : '#3F258B',
          }}
        >
          {pendingLocal} photo(s) waiting to sync
        </div>
      )}
      {error && (
        <div className="mb-4 text-sm px-4 py-3 rounded-2xl border font-semibold bg-red-50 text-red-700 border-red-200">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 text-sm px-4 py-3 rounded-2xl border font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
          {info}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      <div className="space-y-3">
        {(data?.outlets || []).map((o) => {
          const count = o.photoCount || o.photos?.length || 0;
          const canAdd = count < maxShelves;
          return (
            <div key={o._id} className={`rounded-[1.35rem] p-5 ${p.glass}`}>
              <div className="flex justify-between gap-2 mb-1">
                <div className={`font-bold text-sm ${p.title}`}>{o.name}</div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg shrink-0 ${
                    o.done
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-500'
                  }`}
                >
                  {o.done ? `${count} shelf(s)` : 'Due'}
                </span>
              </div>
              <div className={`text-xs mb-3 ${p.soft}`}>
                AVC {o.avcTier || '—'} · {o.distributor || '—'}
              </div>

              {(o.photos || []).length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto pb-2 mb-3">
                  {o.photos.map((ph, i) => (
                    <div key={ph._id || i} className="shrink-0 w-24">
                      <img
                        src={ph.photo}
                        alt={ph.label || `Shelf ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-2xl border border-white/10 shadow-md"
                      />
                      <div className={`text-[10px] mt-1 font-semibold truncate ${p.soft}`}>
                        {ph.label || `Shelf ${i + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={uploading === o._id || !canAdd}
                onClick={() => pickPhoto(o._id)}
                className={`w-full ${p.btnPrimary} disabled:opacity-55`}
                style={p.btnPrimaryStyle}
              >
                {uploading === o._id
                  ? 'Saving…'
                  : !canAdd
                  ? `Max ${maxShelves} shelves reached`
                  : count === 0
                  ? 'Take / upload shelf photo'
                  : `Add another shelf (${count}/${maxShelves})`}
              </button>
            </div>
          );
        })}
        {!data?.outlets?.length && (
          <div className={`rounded-[1.5rem] p-8 text-center ${p.glass}`}>
            <p className="text-3xl mb-2">📸</p>
            <p className={`text-sm font-semibold ${p.title}`}>No AVC outlets assigned</p>
            <p className={`text-xs mt-1 ${p.soft}`}>Contact admin if you expect outlets here</p>
          </div>
        )}
      </div>
    </div>
  );
}

function compressImage(dataUrl, quality = 0.65, maxSide = 1280) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        const r = Math.min(maxSide / width, maxSide / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
