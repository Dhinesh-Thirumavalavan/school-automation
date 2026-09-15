import express from 'express';
import { supabase } from '../services/supabase.service';
import { sendToPhone } from '../services/whatsapp.service';
import { sendPushToPhones } from '../services/push.service';
import { translateText } from '../services/groq.service';

const router = express.Router();

router.get('/', async (req, res) => {
  const classFilter = req.query.class as string | undefined;
  let query = supabase.from('exams').select('*').order('exam_date');
  if (classFilter) query = query.eq('class', classFilter);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  try {
    const { class: examClass, subject, exam_date, exam_day, exam_time, portion, term } = req.body;
    if (!examClass || !subject || !exam_date) {
      return res.status(400).json({ error: 'class, subject, and exam_date are required' });
    }
    const { data, error } = await supabase
      .from('exams')
      .insert([{ class: examClass, subject, exam_date, exam_day, exam_time, portion, term }])
      .select()
      .single();
    if (error) throw error;

    const { data: students } = await supabase.from('students').select('parent_phone, alternate_phone').eq('class', examClass);
    const phones = (students || []).flatMap((s) => [s.parent_phone, s.alternate_phone].filter(Boolean));
    if (phones.length > 0) {
      const english = `New exam scheduled for Class ${examClass}: ${subject} on ${new Date(exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${term ? ` (${term})` : ''}.`;
      const tamil = await translateText(english);
      for (const phone of phones) await sendToPhone(phone, `${english}\n\n${tamil}`);
      await sendPushToPhones(phones, { title: 'Exam Scheduled', body: english, url: '/parent' });
    }

    res.json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { class: examClass, subject, exam_date, exam_day, exam_time, portion, term } = req.body;
  const { data, error } = await supabase
    .from('exams')
    .update({ class: examClass, subject, exam_date, exam_day, exam_time, portion, term })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('exams').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
