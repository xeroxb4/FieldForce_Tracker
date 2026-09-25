import { telLink, whatsappLink } from '../services/voice';

/** Compact call / WhatsApp actions for a phone number */
export default function CallActions({
  phone,
  name = '',
  dark,
  onVoip,
  voipReady = false,
  size = 'sm',
}) {
  if (!phone) return null;
  const tel = telLink(phone);
  const wa = whatsappLink(phone);
  const btn =
    size === 'sm'
      ? 'text-[11px] px-2 py-1 rounded-lg font-bold'
      : 'text-xs px-3 py-2 rounded-xl font-bold';

  return (
    <div className="flex flex-wrap gap-1.5">
      {voipReady && onVoip && (
        <button
          type="button"
          onClick={() => onVoip({ phone, name })}
          className={`${btn} bg-emerald-600 text-white`}
          title="In-app VoIP (data)"
        >
          VoIP
        </button>
      )}
      {tel && (
        <a
          href={tel}
          className={`${btn} ${dark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'}`}
          title="Phone dialer"
        >
          Call
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className={`${btn} bg-[#25D366] text-white`}
          title="WhatsApp"
        >
          WA
        </a>
      )}
    </div>
  );
}
