import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import defaultAvatar from '../assets/default-avatar.png';

export default function UserAvatar({ size = 40, editable = true }) {
  const { user, updateProfilePicture } = useAuth();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);

  const processFile = (file) => {
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
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
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
        className="w-full h-full rounded-full overflow-hidden bg-white shadow-sm border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#2596be] focus:ring-offset-1"
      >
        <img
          src={user?.profilePicture || defaultAvatar}
          alt={user?.fullName || 'Profile'}
          className="w-full h-full object-cover"
        />
      </button>

      {editable && (
        <span
          className="absolute rounded-full bg-[#2596be] text-white flex items-center justify-center shadow border-2 border-white pointer-events-none"
          style={{
            width: badge,
            height: badge,
            right: -2,
            bottom: -2,
            fontSize: Math.max(10, badge * 0.55),
            fontWeight: 700,
          }}
        >
          +
        </span>
      )}

      {menu && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30"
            aria-label="Close"
            onClick={() => setMenu(false)}
          />
          <div className="absolute z-50 left-0 top-full mt-2 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1 text-sm text-slate-800">
            <button
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 font-medium"
              onClick={() => cameraRef.current?.click()}
            >
              Take photo (camera)
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 font-medium"
              onClick={() => galleryRef.current?.click()}
            >
              Upload from device
            </button>
            {user?.profilePicture ? (
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-red-600 font-medium"
                onClick={removePhoto}
              >
                Remove photo
              </button>
            ) : null}
            <button
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-slate-500"
              onClick={() => setMenu(false)}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Camera — capture attribute encourages camera on phones */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
      {/* Gallery — no capture, so gallery / files open */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
