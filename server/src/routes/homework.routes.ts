import express from 'express';
import { supabase } from '../services/supabase.service';
import { translateText } from '../services/groq.service';
import { logMessage } from '../services/logMessage.service';
import { sendToPhone } from '../services/whatsapp.service';

const router = express.Router();
router.get('/', async (req, res) => { const classFilter = req.query.class as string | undefined; let query = supabase.from('homework').select('*').order('posted_at', { ascending: false }).limit(20); if (classFilter) query = query.eq('class', classFilter); const { data, error } = await query; if (error) return res.status(500).json({ error: error.message }); res.json(data); });
router.post('/', async (req, res) => { try { const { class: studentClass, english_text, posted_by } = req.body; const tamil_text = await translateText(english_text); const { data: homeworkRow, error } = await supabase.from('homework').insert([{ class: studentClass, english_text, tamil_text, posted_by }]).select(); if (error) throw error; const { data: students } = await supabase.from('students').select('parent_phone').eq('class', studentClass); const phones = (students || []).map((s: any) => s.parent_phone); const message = `📚 Homework — ${studentClass}\n\n${english_text}\n\n${tamil_text}`; for (const phone of phones) await sendToPhone(phone, message); await logMessage(`Homework — ${studentClass}`, '', `Homework — ${studentClass}`, phones.length); res.json(homeworkRow[0]); } catch (err: any) { console.error(err); res.status(500).json({ error: err.message }); } });
export default router;
