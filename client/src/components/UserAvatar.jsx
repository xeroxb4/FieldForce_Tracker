import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import defaultAvatar from '../assets/default-avatar.png';

export default function UserAvatar({ size = 40, editable = true }) {
  const { user, updateProfilePicture } = useAuth();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);

  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const side = 256;
        canvas.width = side;
        canvas.height = side;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, side, side);
        const scale = Math.max(side / img.width, side / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (side - w) / 2, (side - h) / 2, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setBusy(true);
        try {
          await updateProfilePicture(dataUrl);
          setMenu(false);
        } catch (err) {
          alert(err.response?.data?.message || 'Failed to update photo');
        } finally {
          setBusy(false);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = async () => {
    setBusy(true);
    try {
      await updateProfilePicture('');
      setMenu(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove photo');
    } finally {
      setBusy(false);
    }
  };

  const badge = Math.max(14, Math.round(size * 0.38));

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <button
        type="button"
        title={editable ? 'Profile photo' : user?.fullName}
        onClick={() => editable && !busy && setMenu((m) => !m)}
        className="w-full h-full rounded-full overflow-hidden bg-white shadow-sm border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
      >
        <img
          src={user?.profilePicture || defaultAvatar}
          alt={user?.fullName || 'Profile'}
          className="w-full h-full object-cover"
        />
      </button>

      {editable && (
        <button
          type="button"
          title="Photo options"
          onClick={() => !busy && setMenu((m) => !m)}
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-blue-700 transition"
          style={{ width: badge, height: badge }}
        >
          {busy ? (
            <span className="text-[9px] font-bold">…</span>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: badge * 0.55, height: badge * 0.55 }}>
              <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
            </svg>
          )}
        </button>
      )}

      {menu && editable && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-44 rounded-xl bg-white shadow-xl border border-slate-200 py-1 text-sm text-slate-800">
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
              onClick={() => inputRef.current?.click()}
            >
              Take / upload photo
            </button>
            {user?.profilePicture ? (
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-red-600"
                onClick={removePhoto}
              >
                Remove photo
              </button>
            ) : null}
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-500"
              onClick={() => setMenu(false)}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
