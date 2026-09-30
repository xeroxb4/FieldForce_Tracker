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

export default function AvcPhotos() {
  const { dark } = useTheme();
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

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const maxShelves = data?.maxShelves || 8;

  if (loading) {
    return <p className="text-sm text-slate-500 p-4">Loading AVC tasks…</p>;
  }

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className={`text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          AVC shelf photos
        </h1>
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Twice a month. If Nivea is on more than one shelf, add a photo for each shelf (up to{' '}
          {maxShelves}).
        </p>
      </div>

      {!online && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
          Offline mode — take photos now; they upload when you are back online.
        </div>
      )}
      {pendingLocal > 0 && (
        <div className="rounded-xl border border-[#2596be]/40 bg-[#2596be]/10 px-3 py-2 text-sm font-semibold text-[#117ea6]">
          {pendingLocal} photo(s) waiting to sync
        </div>
      )}
      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
      {info && (
        <p className={`text-sm font-medium ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>
          {info}
        </p>
      )}

      {data && (
        <div className={`rounded-2xl border-2 p-3 ${card}`}>
          <div className="flex justify-between text-sm font-bold">
            <span>
              {data.periodLabel} · {data.month}/{data.year}
            </span>
            <span className="text-[#2596be]">
              {data.done}/{data.required} outlets done
            </span>
          </div>
          <div
            className={`mt-2 h-2 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}
          >
            <div
              className="h-full bg-[#2596be] rounded-full"
              style={{
                width: `${data.required ? Math.min(100, (data.done / data.required) * 100) : 0}%`,
              }}
            />
          </div>
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
            <div key={o._id} className={`rounded-2xl border-2 p-3 ${card}`}>
              <div className="flex justify-between gap-2 mb-1">
                <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {o.name}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    o.done
                      ? 'bg-emerald-500/20 text-emerald-600'
                      : 'bg-amber-500/20 text-amber-700'
                  }`}
                >
                  {o.done ? `${count} shelf photo(s)` : 'Due'}
                </span>
              </div>
              <div className={`text-xs mb-2 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                AVC {o.avcTier || '—'} · {o.distributor || '—'}
              </div>

              {(o.photos || []).length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                  {o.photos.map((ph, i) => (
                    <div key={ph._id || i} className="shrink-0 w-24">
                      <img
                        src={ph.photo}
                        alt={ph.label || `Shelf ${i + 1}`}
                        className="w-24 h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-600"
                      />
                      <div className={`text-[10px] mt-0.5 font-semibold truncate ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                className="w-full py-2.5 rounded-xl bg-[#117ea6] text-white text-sm font-bold disabled:opacity-60"
              >
                {uploading === o._id
                  ? 'Saving…'
                  : !canAdd
                  ? `Max ${maxShelves} shelves reached`
                  : count === 0
                  ? 'Take / upload shelf photo'
                  : `Add another shelf photo (${count}/${maxShelves})`}
              </button>
            </div>
          );
        })}
        {!data?.outlets?.length && (
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            No AVC outlets assigned to you.
          </p>
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
