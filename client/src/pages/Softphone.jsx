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

export default function Softphone() {
  const { dark } = useTheme();
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [dir, setDir] = useState({ team: [], outlets: [] });
  const [q, setQ] = useState('');
  const [voipState, setVoipState] = useState('idle'); // idle | connecting | ready | in-call | error
  const [msg, setMsg] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('outlets'); // outlets | team | logs

  const card = dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm';

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
    <div className="space-y-4 max-w-3xl mx-auto p-3 sm:p-4">
      <div>
        <h1 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
          Softphone
        </h1>
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          WebRTC in the browser + Twilio gateway to real mobiles. Or use Call / WhatsApp.
        </p>
      </div>

      <div className={`rounded-2xl border-2 p-4 ${card}`}>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div>
            <div className={`text-xs font-bold uppercase ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              VoIP gateway
            </div>
            <div className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>
              {status?.voipReady ? 'Twilio configured on server' : 'Not configured — use Call / WhatsApp'}
            </div>
            {msg && (
              <p className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{msg}</p>
            )}
          </div>
          <div className="flex gap-2">
            {status?.voipReady && voipState !== 'ready' && voipState !== 'in-call' && (
              <button
                type="button"
                onClick={connectVoip}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-600 text-white"
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
                className="text-xs font-bold px-3 py-2 rounded-xl bg-red-600 text-white"
              >
                Hang up
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              Dial number
            </label>
            <input
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              placeholder="024…"
              className="w-full mt-0.5 rounded-xl border px-3 py-2 text-sm text-slate-900"
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

      <div className="flex gap-2">
        {['outlets', 'team', 'logs'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`text-xs font-bold px-3 py-2 rounded-xl capitalize ${
              tab === t
                ? 'bg-[#117ea6] text-white'
                : dark
                ? 'bg-slate-800 text-slate-300'
                : 'bg-slate-100 text-slate-700'
            }`}
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
          className="w-full rounded-xl border px-3 py-2 text-sm text-slate-900"
        />
      )}

      {tab === 'outlets' && (
        <div className="space-y-2">
          {outlets.length === 0 && (
            <p className="text-sm text-slate-500">No outlets with phone numbers.</p>
          )}
          {outlets.map((o) => (
            <div key={o.id} className={`rounded-xl border-2 p-3 flex flex-wrap justify-between gap-2 ${card}`}>
              <div>
                <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {o.name}
                </div>
                <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {o.contactName || '—'} · {o.phone} · {o.territory || ''}
                </div>
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
        <div className="space-y-2">
          {team.length === 0 && (
            <p className="text-sm text-slate-500">
              No team phones yet. Add phone numbers on user profiles in Admin → Users.
            </p>
          )}
          {team.map((u) => (
            <div key={u.id} className={`rounded-xl border-2 p-3 flex flex-wrap justify-between gap-2 ${card}`}>
              <div>
                <div className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {u.name}{' '}
                  <span className="text-[10px] font-bold uppercase opacity-70">{u.role}</span>
                </div>
                <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {u.phone} · {u.distributor || ''} · {u.territory || ''}
                </div>
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
                    className="text-[10px] font-bold text-emerald-600"
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
        <div className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-slate-500">No call logs yet.</p>}
          {logs.map((l) => (
            <div key={l._id} className={`rounded-xl border p-3 text-xs ${card}`}>
              <div className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                {l.toName || l.toNumber || '—'} · {l.channel}
              </div>
              <div className={dark ? 'text-slate-400' : 'text-slate-600'}>
                {l.initiatorName} → {l.toNumber} · {l.status} ·{' '}
                {l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-xl border p-3 text-[11px] leading-relaxed ${card}`}>
        <div className="font-bold mb-1">Setup (admin / developer)</div>
        <ol className="list-decimal pl-4 space-y-1">
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
            Client: <code>npm i @twilio/voice-sdk</code> in the client folder, then redeploy Vercel.
          </li>
          <li>Until Twilio is set, use <b>Call</b> (phone dialer) or <b>WA</b> (WhatsApp).</li>
        </ol>
      </div>
    </div>
  );
}
