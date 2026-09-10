import express from 'express';
import { supabase } from '../services/supabase.service';
import { sendToPhone } from '../services/whatsapp.service';

const router = express.Router();

// MVP OTP store — in-memory, single-process. Fine for a pilot; move to a
// persisted store (Redis/Supabase table) before running more than one
// server instance or relying on OTPs surviving a restart.
interface OtpEntry {
  otp: string;
  expiresAt: number;
}
const otpStore = new Map<string, OtpEntry>();
const OTP_TTL_MS = 5 * 60 * 1000;

const cleanPhone = (phone: string) => (phone || '').replace(/[^0-9]/g, '');

router.post('/request-otp', async (req, res) => {
  try {
    const phone = cleanPhone(req.body.phone);
    if (phone.length < 10) return res.status(400).json({ error: 'Enter a valid phone number' });

    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, parent_phone, alternate_phone')
      .or(`parent_phone.eq.${phone},alternate_phone.eq.${phone}`);
    if (error) throw error;
    if (!students || students.length === 0) {
      return res.status(404).json({ error: 'No student found for this phone number. Please contact the school office.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_MS });

    const sent = await sendToPhone(phone, `Your Kalvi parent portal OTP is ${otp}. Valid for 5 minutes.`);
    if (!sent) {
      otpStore.delete(phone);
      return res.status(503).json({ error: 'Could not send the OTP right now — WhatsApp service is temporarily unavailable. Please try again shortly or contact the school office.' });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const phone = cleanPhone(req.body.phone);
    const otp = (req.body.otp || '').toString().trim();

    const entry = otpStore.get(phone);
    if (!entry || entry.otp !== otp || Date.now() > entry.expiresAt) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    otpStore.delete(phone);

    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, class, section, roll_no, parent_name')
      .or(`parent_phone.eq.${phone},alternate_phone.eq.${phone}`);
    if (error) throw error;

    res.json({ phone, students: students || [] });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
