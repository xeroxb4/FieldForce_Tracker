/**
 * FieldForce VoIP helper — Twilio Voice (WebRTC) when configured.
 * Falls back to tel: / WhatsApp when VoIP is offline.
 */

let device = null;
let activeCall = null;

export function telLink(phone) {
  const n = String(phone || '').replace(/[^\d+]/g, '');
  return n ? `tel:${n}` : null;
}

export function whatsappLink(phone) {
  let n = String(phone || '').replace(/[^\d]/g, '');
  if (!n) return null;
  if (n.startsWith('0') && n.length === 10) n = `233${n.slice(1)}`;
  if (n.startsWith('233')) {
    /* ok */
  } else if (n.length === 9) n = `233${n}`;
  return `https://wa.me/${n}`;
}

export async function fetchVoiceStatus(api) {
  const { data } = await api.get('/calls/status');
  return data;
}

export async function initVoiceDevice(api, onEvent) {
  const status = await fetchVoiceStatus(api);
  if (!status.voipReady) {
    return { ready: false, message: status.message };
  }

  const { data } = await api.get('/calls/token');
  if (!data.token) throw new Error('No voice token');

  // Dynamic import so build works even before npm i @twilio/voice-sdk
  const { Device } = await import('@twilio/voice-sdk');

  if (device) {
    try {
      device.destroy();
    } catch {
      /* ignore */
    }
  }

  device = new Device(data.token, {
    logLevel: 1,
    codecPreferences: ['opus', 'pcmu'],
  });

  device.on('registered', () => onEvent?.({ type: 'registered', identity: data.identity }));
  device.on('error', (err) => onEvent?.({ type: 'error', error: err }));
  device.on('incoming', (call) => {
    activeCall = call;
    onEvent?.({ type: 'incoming', call });
  });

  await device.register();
  return { ready: true, identity: data.identity, callerId: data.callerId };
}

export async function placeVoipCall(params) {
  const { to, params: extra } = typeof params === 'string' ? { to: params, params: {} } : params;
  if (!device) throw new Error('Voice device not ready. Connect VoIP first.');
  activeCall = await device.connect({
    params: { To: to, ...extra },
  });
  return activeCall;
}

export function hangUp() {
  if (activeCall) {
    try {
      activeCall.disconnect();
    } catch {
      /* ignore */
    }
    activeCall = null;
  }
}

export function getActiveCall() {
  return activeCall;
}

export function destroyVoice() {
  hangUp();
  if (device) {
    try {
      device.destroy();
    } catch {
      /* ignore */
    }
    device = null;
  }
}
