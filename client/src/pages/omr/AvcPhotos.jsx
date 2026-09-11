import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function AvcPhotos() {
  const { dark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/omr/avc-photos/tasks')
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
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
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // compress roughly via canvas if huge
      let photo = dataUrl;
      if (typeof dataUrl === 'string' && dataUrl.length > 900_000) {
        photo = await compressImage(dataUrl, 0.7);
      }
      let lat, lng;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        /* optional */
      }
      await api.post('/omr/avc-photos', { outletId: activeId, photo, lat, lng });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(null);
      setActiveId(null);
    }
  };

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';

  if (loading) return <p className="text-sm text-slate-500 p-4">Loading AVC tasks…</p>;

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className={`text-lg font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          AVC shelf photos
        </h1>
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Twice a month: capture Nivea shelf / planogram at every AVC outlet.
        </p>
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <div className="flex justify-between text-sm">
          <span className={dark ? 'text-slate-300' : 'text-slate-700'}>
            {data?.periodLabel} · {data?.month}/{data?.year}
          </span>
          <span className="font-bold text-[#2596be]">
            {data?.done || 0}/{data?.required || 0} done
          </span>
        </div>
        <div className={`h-2 mt-2 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div
            className="h-full bg-[#2596be]"
            style={{
              width: `${data?.required ? Math.min(100, (100 * data.done) / data.required) : 0}%`,
            }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      <div className="space-y-3">
        {(data?.outlets || []).map((o) => (
          <div key={o._id} className={`rounded-2xl border p-3 ${card}`}>
            <div className="flex justify-between gap-2">
              <div>
                <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {o.name}
                </div>
                <div className="text-[11px] text-[#2596be] font-semibold">
                  AVC {o.avcTier || '—'} · {o.distributor || '—'}
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-lg h-fit ${
                  o.done
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-500'
                }`}
              >
                {o.done ? 'Captured' : 'Due'}
              </span>
            </div>
            {o.photo?.photo && (
              <img
                src={o.photo.photo}
                alt=""
                className="mt-2 w-full max-h-40 object-cover rounded-xl"
              />
            )}
            <button
              type="button"
              disabled={uploading === o._id}
              onClick={() => pickPhoto(o._id)}
              className="mt-2 w-full py-2.5 rounded-xl bg-[#2596be] text-white text-sm font-bold disabled:opacity-60"
            >
              {uploading === o._id
                ? 'Uploading…'
                : o.done
                ? 'Retake photo'
                : 'Take / upload shelf photo'}
            </button>
          </div>
        ))}
        {!data?.outlets?.length && (
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            No AVC outlets assigned to you.
          </p>
        )}
      </div>
    </div>
  );
}

function compressImage(dataUrl, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      let { width, height } = img;
      if (width > max || height > max) {
        const r = Math.min(max / width, max / height);
        width *= r;
        height *= r;
      }
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}
