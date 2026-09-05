import { useTheme } from '../../context/ThemeContext';

export default function AdminPromotions() {
  const { dark } = useTheme();
  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#2596be]/40 shadow-sm';

  return (
    <div className="space-y-4">
      <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>Promotions</h1>
      <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Trade promotions by channel
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        <div className={`rounded-2xl border-2 p-4 ${card}`}>
          <div className="text-xs font-bold text-[#2596be] uppercase">1. General Trade</div>
          <h3 className={`font-bold mt-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
            Open market / traditional outlets
          </h3>
          <ul className={`mt-3 text-sm space-y-2 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            <li>• Bundle offers on Roll-on / Spray packs</li>
            <li>• Credit windows (1–2 weeks) tracked in Owings</li>
            <li>• Top-10 SKU push on beat days</li>
          </ul>
          <p className={`text-xs mt-3 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            Configure live promo calendars in a future update — structure is ready.
          </p>
        </div>

        <div className={`rounded-2xl border-2 p-4 ${card}`}>
          <div className="text-xs font-bold text-[#2596be] uppercase">2. Modern Trade</div>
          <h3 className={`font-bold mt-1 ${dark ? 'text-white' : 'text-slate-900'}`}>
            Melcom, Shoprite, China Mall, etc.
          </h3>
          <ul className={`mt-3 text-sm space-y-2 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            <li>• Share of Shelf targets (merchandiser visits)</li>
            <li>• Display / end-cap compliance photos</li>
            <li>• Secondary display activations</li>
          </ul>
          <p className={`text-xs mt-3 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            Linked to merchandiser SOS and photo evidence.
          </p>
        </div>
      </div>
    </div>
  );
}
