import twilio from 'twilio';
import User from '../models/User.js';
import Outlet from '../models/Outlet.js';
import CallLog from '../models/CallLog.js';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

function twilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_API_KEY_SID &&
    process.env.TWILIO_API_KEY_SECRET &&
    process.env.TWILIO_TWIML_APP_SID
  );
}

/** Ghana-friendly E.164: 024... → +23324... */
export function toE164(raw, defaultCountry = 'GH') {
  if (!raw) return '';
  let n = String(raw).replace(/[^\d+]/g, '');
  if (n.startsWith('+')) return n;
  if (n.startsWith('00')) n = n.slice(2);
  if (defaultCountry === 'GH') {
    if (n.startsWith('233')) return `+${n}`;
    if (n.startsWith('0')) return `+233${n.slice(1)}`;
    if (n.length === 9) return `+233${n}`;
  }
  return n.startsWith('+') ? n : `+${n}`;
}

export const getCallStatus = async (req, res) => {
  try {
    res.json({
      voipReady: twilioConfigured(),
      hasCallerId: !!process.env.TWILIO_CALLER_ID,
      provider: 'twilio',
      message: twilioConfigured()
        ? 'VoIP gateway ready — browser can place calls over data'
        : 'VoIP not configured. Set TWILIO_* env vars on Render. tel: and WhatsApp still work.',
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** Access token for Twilio Voice JS SDK (WebRTC in browser → Twilio gateway) */
export const getVoiceToken = async (req, res) => {
  try {
    if (!twilioConfigured()) {
      return res.status(503).json({
        message:
          'Twilio VoIP is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_TWIML_APP_SID on the server.',
        voipReady: false,
      });
    }

    const identity = `${req.user.role}_${req.user.username}`.replace(/[^\w.-]/g, '_');

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
      { identity, ttl: 3600 }
    );

    const grant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true,
    });
    token.addGrant(grant);

    res.json({
      token: token.toJwt(),
      identity,
      callerId: process.env.TWILIO_CALLER_ID || '',
      voipReady: true,
    });
  } catch (error) {
    console.error('Voice token error:', error);
    res.status(500).json({ message: 'Failed to create voice token' });
  }
};

/**
 * TwiML webhook — Twilio asks what to do when browser places a call.
 * Public URL must be set in TwiML App: https://YOUR-API/api/calls/voice
 */
export const voiceWebhook = async (req, res) => {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    const to = req.body.To || req.query.To || '';
    const callerId = process.env.TWILIO_CALLER_ID;

    if (to) {
      const dial = twiml.dial({
        callerId: callerId || undefined,
        answerOnBridge: true,
        timeout: 30,
      });
      // PSTN number
      if (to.startsWith('+') || /^\d+$/.test(to.replace(/\s/g, ''))) {
        dial.number(toE164(to));
      } else {
        // Call another Twilio client identity (team WebRTC)
        dial.client(to);
      }
    } else {
      twiml.say({ voice: 'alice' }, 'No destination provided. Goodbye.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Voice webhook error:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
};

export const logCall = async (req, res) => {
  try {
    const {
      toNumber,
      toName,
      toUserId,
      outletId,
      channel,
      status,
      durationSec,
      twilioCallSid,
      notes,
    } = req.body;

    const log = await CallLog.create({
      initiatedBy: req.user._id,
      initiatorName: req.user.fullName,
      direction: 'outbound',
      channel: channel || 'voip',
      toNumber: toNumber ? toE164(toNumber) : '',
      toName: toName || '',
      toUserId: toUserId || undefined,
      outletId: outletId || undefined,
      status: status || 'initiated',
      durationSec: Number(durationSec) || 0,
      twilioCallSid: twilioCallSid || '',
      notes: notes || '',
    });

    res.status(201).json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to log call' });
  }
};

export const listCallLogs = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.initiatedBy = req.user._id;
    } else if (req.query.userId) {
      filter.initiatedBy = req.query.userId;
    }
    const logs = await CallLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 50, 200))
      .lean();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load call logs' });
  }
};

/** Directory: team phones + recent outlets with phone */
export const getCallDirectory = async (req, res) => {
  try {
    const users = await User.find({
      isActive: { $ne: false },
      isTraining: { $ne: true },
      phone: { $exists: true, $nin: ['', null] },
    })
      .select('fullName username role phone distributor territory')
      .sort({ role: 1, fullName: 1 })
      .lean();

    const outletFilter = {
      isActive: { $ne: false },
      status: 'approved',
      contactPhone: { $exists: true, $nin: ['', null] },
    };
    if (req.user.role === 'omr') {
      outletFilter.$or = [{ assignedTo: req.user._id }, { userId: req.user._id }];
    }

    const outlets = await Outlet.find(outletFilter)
      .select('name displayName contactName contactPhone assignedTo territory distributor')
      .sort({ name: 1 })
      .limit(req.user.role === 'admin' ? 300 : 150)
      .lean();

    res.json({
      voipReady: twilioConfigured(),
      team: users.map((u) => ({
        id: u._id,
        name: u.fullName,
        username: u.username,
        role: u.role,
        phone: u.phone,
        e164: toE164(u.phone),
        distributor: u.distributor || '',
        territory: u.territory || '',
        clientIdentity: `${u.role}_${u.username}`.replace(/[^\w.-]/g, '_'),
      })),
      outlets: outlets.map((o) => ({
        id: o._id,
        name: o.displayName || o.name,
        contactName: o.contactName || '',
        phone: o.contactPhone,
        e164: toE164(o.contactPhone),
        territory: o.territory || '',
        distributor: o.distributor || '',
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load directory' });
  }
};
