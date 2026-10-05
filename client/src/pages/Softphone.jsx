import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  fetchVoiceStatus,
  initVoiceDevice,
  placeVoipCall,
  hangUp,
  destroyVoice,
  telLink,
  whatsappLink,
} from '../services/voice';
import CallActions from '../components/CallActions';
import { usePremium, PremiumHero } from '../lib/premium';

export default function Softphone() {
  const { dark } = useTheme();
  const p = usePremium(dark);
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [dir, setDir] = useState({ team: [], outlets: [] });
  const [q, setQ] = useState('');
  const [voipState, setVoipState] = useState('idle'); // idle | connecting | ready | in-call | error
  const [msg, setMsg] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('outlets'); // outlets | team | logs

  const card = p.glass;

  const load = useCallback(async () => {
    try {
      const [s, d, l] = await Promise.all([
        fetchVoiceStatus(api),
        api.get('/calls/directory'),
        api.get('/calls/logs?limit=30'),
      ]);
      setStatus(s);
      setDir(d.data);
      setLogs(l.data);
    } catch (e) {
      setMsg(e.response?.data?.message || e.message || 'Failed to load');
    }
  }, []);

  useEffect(() => {
    load();
    return () => destroyVoice();
  }, [load]);

  const connectVoip = async () => {
    setVoipState('connecting');
    setMsg('');
    try {
      const r = await initVoiceDevice(api, (ev) => {
        if (ev.type === 'registered') setVoipState('ready');
        if (ev.type === 'error') {
          setVoipState('error');
          setMsg(ev.error?.message || 'VoIP error');
        }
        if (ev.type === 'incoming') setMsg('Incoming call…');
      });
      if (!r.ready) {
        setVoipState('idle');
        setMsg(r.message || 'VoIP not configured on server');
        return;
      }
      setVoipState('ready');
      setMsg(`Connected as ${r.identity}`);
    } catch (e) {
      setVoipState('error');
      setMsg(e.message || 'Could not start VoIP');
    }
  };

  const logCall = async (payload) => {
    try {
      await api.post('/calls/log', payload);
      const { data } = await api.get('/calls/logs?limit=30');
      setLogs(data);
    } catch {
      /* non-blocking */
    }
  };

  const startVoip = async ({ phone, name, toUserId, outletId, clientIdentity }) => {
    const dest = clientIdentity || phone;
    if (!dest) return;
    try {
      setVoipState('in-call');
      setMsg(`Calling ${name || dest}…`);
      await logCall({
        toNumber: phone || '',
        toName: name || '',
        toUserId,
        outletId,
        channel: clientIdentity ? 'webrtc-team' : 'voip',
        status: 'initiated',
      });
      const call = await placeVoipCall(dest);
      call.on('accept', () => setMsg(`Connected — ${name || dest}`));
      call.on('disconnect', () => {
        setVoipState('ready');
        setMsg('Call ended');
        hangUp();
      });
      call.on('error', (err) => {
        setVoipState('ready');
        setMsg(err.message || 'Call failed');
      });
    } catch (e) {
      setVoipState('ready');
      setMsg(e.message || 'Call failed');
    }
  };

  const filterList = (items, keys) => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => keys.some((k) => String(it[k] || '').toLowerCase().includes(qq)));
  };

  const outlets = filterList(dir.outlets || [], ['name', 'contactName', 'phone', 'territory']);
  const team = filterList(dir.team || [], ['name', 'username', 'phone', 'role', 'distributor']);

  return (
    <div className={`-mx-4 -mt-2 px-4 pb-12 min-h-[70vh] ${p.shell}`}>
      <PremiumHero
        dark={dark}
        eyebrow="Communications"
        title="Softphone"
        subtitle="WebRTC + Twilio · or Call / WhatsApp fallback"
      />

      <div className={`rounded-[1.5rem] p-5 mb-5 ${card}`}>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div>
            <p className={p.label}>VoIP gateway</p>
            <p className={`text-sm font-bold ${p.title}`}>
              {status?.voipReady ? 'Twilio configured on server' : 'Not configured — use Call / WhatsApp'}
            </p>
            {msg && <p className={`text-xs mt-1 ${p.soft}`}>{msg}</p>}
          </div>
          <div className="flex gap-2">
            {status?.voipReady && voipState !== 'ready' && voipState !== 'in-call' && (
              <button
                type="button"
                onClick={connectVoip}
                className="text-xs font-black px-4 py-2.5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              >
                {voipState === 'connecting' ? 'Connecting…' : 'Connect VoIP'}
              </button>
            )}
            {voipState === 'in-call' && (
              <button
                type="button"
                onClick={() => {
                  hangUp();
                  setVoipState('ready');
                  setMsg('Call ended');
                }}
                className="text-xs font-black px-4 py-2.5 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30"
              >
                Hang up
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className={p.label}>Dial number</label>
            <input
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              placeholder="024…"
              className={p.input}
            />
          </div>
          <CallActions
            phone={manualNumber}
            name="Manual"
            dark={dark}
            voipReady={voipState === 'ready'}
            onVoip={() => startVoip({ phone: manualNumber, name: 'Manual dial' })}
            size="md"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['outlets', 'team', 'logs'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`text-xs font-black px-4 py-2.5 rounded-2xl capitalize transition ${
              tab === t
                ? 'text-white shadow-lg'
                : dark
                ? 'bg-slate-800/80 text-slate-300 border border-white/10'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
            style={
              tab === t
                ? {
                    background: 'linear-gradient(135deg, #5b3aad, #3F258B)',
                    boxShadow: '0 8px 24px rgba(63,37,139,0.35)',
                  }
                : undefined
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab !== 'logs' && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or phone…"
          className={`${p.input} mb-4`}
        />
      )}

      {tab === 'outlets' && (
        <div className="space-y-2.5">
          {outlets.length === 0 && (
            <p className={`text-sm ${p.soft}`}>No outlets with phone numbers.</p>
          )}
          {outlets.map((o) => (
            <div
              key={o.id}
              className={`rounded-[1.25rem] p-4 flex flex-wrap justify-between gap-3 ${card}`}
            >
              <div className="min-w-0">
                <p className={`font-bold text-sm ${p.title}`}>{o.name}</p>
                <p className={`text-xs mt-0.5 ${p.soft}`}>
                  {o.contactName || '—'} · {o.phone} · {o.territory || ''}
                </p>
              </div>
              <CallActions
                phone={o.phone}
                name={o.name}
                dark={dark}
                voipReady={voipState === 'ready'}
                onVoip={() =>
                  startVoip({ phone: o.e164 || o.phone, name: o.name, outletId: o.id })
                }
              />
            </div>
          ))}
        </div>
      )}

      {tab === 'team' && (
        <div className="space-y-2.5">
          {team.length === 0 && (
            <p className={`text-sm ${p.soft}`}>
              No team phones yet. Add phone numbers on user profiles in Admin → Users.
            </p>
          )}
          {team.map((u) => (
            <div
              key={u.id}
              className={`rounded-[1.25rem] p-4 flex flex-wrap justify-between gap-3 ${card}`}
            >
              <div className="min-w-0">
                <p className={`font-bold text-sm ${p.title}`}>
                  {u.name}{' '}
                  <span className={`text-[10px] font-black uppercase ${p.soft}`}>{u.role}</span>
                </p>
                <p className={`text-xs mt-0.5 ${p.soft}`}>
                  {u.phone} · {u.distributor || ''} · {u.territory || ''}
                </p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <CallActions
                  phone={u.phone}
                  name={u.name}
                  dark={dark}
                  voipReady={voipState === 'ready'}
                  onVoip={() =>
                    startVoip({
                      phone: u.e164 || u.phone,
                      name: u.name,
                      toUserId: u.id,
                    })
                  }
                />
                {voipState === 'ready' && u.username !== user?.username && (
                  <button
                    type="button"
                    className="text-[10px] font-black text-emerald-500"
                    onClick={() =>
                      startVoip({
                        clientIdentity: u.clientIdentity,
                        name: u.name,
                        toUserId: u.id,
                        phone: u.phone,
                      })
                    }
                  >
                    App-to-app (WebRTC)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-2.5">
          {logs.length === 0 && <p className={`text-sm ${p.soft}`}>No call logs yet.</p>}
          {logs.map((l) => (
            <div key={l._id} className={`rounded-[1.25rem] p-4 text-xs ${card}`}>
              <p className={`font-bold ${p.title}`}>
                {l.toName || l.toNumber || '—'} · {l.channel}
              </p>
              <p className={`mt-0.5 ${p.soft}`}>
                {l.initiatorName} → {l.toNumber} · {l.status} ·{' '}
                {l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-[1.35rem] p-4 mt-5 text-[11px] leading-relaxed ${card}`}>
        <p className={`font-black mb-2 ${p.title}`}>Setup (admin / developer)</p>
        <ol className={`list-decimal pl-4 space-y-1 ${p.soft}`}>
          <li>Create a Twilio account and buy a number (caller ID).</li>
          <li>
            Create API Key + TwiML App. Voice request URL:{' '}
            <code className="text-[10px]">https://YOUR-RENDER-URL/api/calls/voice</code>
          </li>
          <li>
            On Render set: TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET,
            TWILIO_TWIML_APP_SID, TWILIO_CALLER_ID
          </li>
          <li>
            Client: <code>npm i @twilio/voice-sdk</code> in the client folder, then redeploy.
          </li>
          <li>
            Until Twilio is set, use <b>Call</b> (phone dialer) or <b>WA</b> (WhatsApp).
          </li>
        </ol>
      </div>
    </div>
  );
}
