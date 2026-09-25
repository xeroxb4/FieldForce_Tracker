# FieldForce VoIP (WebRTC + Twilio gateway)

## What you get
- **Browser WebRTC** via Twilio Voice SDK
- **Gateway to real mobiles** (Ghana numbers: 024… → +233…)
- **App-to-app** client identity calls (admin ↔ OMR when both connected)
- **Call / WhatsApp** buttons always work without Twilio
- **Call logs** in MongoDB (`calllogs`)

## Twilio setup
1. Sign up at https://www.twilio.com
2. Buy a phone number (use as caller ID)
3. Console → Account → API keys → Create API key (note SID + Secret)
4. Console → Voice → TwiML Apps → Create App
   - Voice Request URL (POST): `https://YOUR-RENDER-HOST/api/calls/voice`
5. On **Render** environment variables:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxx
TWILIO_API_KEY_SECRET=xxxxxxxx
TWILIO_TWIML_APP_SID=APxxxxxxxx
TWILIO_CALLER_ID=+233XXXXXXXXX
```
6. Redeploy Render server (`npm install` picks up `twilio` package)

## Client
```bash
cd client
npm i @twilio/voice-sdk
```
Redeploy Vercel.

## Usage
- Admin → **Softphone**
- OMR → **Call**
- Connect VoIP → dial outlet or team number
- Without Twilio: use **Call** (dialer) or **WA**

## Cost
Twilio charges per minute for PSTN calls. Check Twilio pricing for Ghana.
