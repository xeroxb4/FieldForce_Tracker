import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getCallStatus,
  getVoiceToken,
  voiceWebhook,
  logCall,
  listCallLogs,
  getCallDirectory,
} from '../controllers/callController.js';

const router = express.Router();

// Twilio webhook — no JWT (Twilio servers call this). Validate optionally later with signature.
router.post('/voice', voiceWebhook);
router.post('/voice/', voiceWebhook);

router.use(protect);

router.get('/status', getCallStatus);
router.get('/token', getVoiceToken);
router.get('/directory', getCallDirectory);
router.get('/logs', listCallLogs);
router.post('/log', logCall);

export default router;
