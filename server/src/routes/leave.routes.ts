import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { supabase } from '../services/supabase.service';
import { sendToPhone } from '../services/whatsapp.service';
import { sendPushToPhones } from '../services/push.service';
import { translateText } from '../services/groq.service';

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 16 * 1024 * 1024 } });

router.post('/', upload.single('attachment'), async (req, res) => {
  try {
    const { student_id, leave_type, start_date, end_date, reason } = req.body;
    if (!student_id || !leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'student_id, leave_type, start_date, end_date are required' });
    }

    let attachment_url: string | null = null;
    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${student_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const fileData = fs.readFileSync(req.file.path);
      const { error: uploadError } = await supabase.storage
        .from('leave-attachments')
        .upload(fileName, fileData, { contentType: req.file.mimetype });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('leave-attachments').getPublicUrl(fileName);
      attachment_url = publicUrlData.publicUrl;
      fs.unlinkSync(req.file.path);
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert([{ student_id, leave_type, start_date, end_date, reason, attachment_url }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/student/:studentId', async (req, res) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('student_id', req.params.studentId)
    .order('submitted_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Admin: all leave requests, most recently submitted first, with student info
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, students(name, class, section, parent_phone, alternate_phone)')
    .order('submitted_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

async function notifyParent(leave: any, english: string) {
  const student = leave.students as any;
  if (!student) return;
  const tamil = await translateText(english);
  const phones = [student.parent_phone, student.alternate_phone].filter(Boolean);
  for (const phone of phones) await sendToPhone(phone, `${english}\n\n${tamil}`);
  await sendPushToPhones(phones, { title: 'Leave Request Update', body: english, url: '/parent' });
}

function leavePeriod(leave: any) {
  return `${leave.leave_type}, ${leave.start_date}${leave.end_date !== leave.start_date ? ` to ${leave.end_date}` : ''}`;
}

// Class teacher: first-stage decision. A rejection is final; an approval is forwarded to the principal.
router.put('/:id/teacher-decision', async (req, res) => {
  try {
    const { status, reviewed_by } = req.body as { status: 'approved' | 'rejected'; reviewed_by?: string };
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('leave_requests')
      .select('teacher_status')
      .eq('id', req.params.id)
      .single();
    if (fetchError) throw fetchError;
    if (existing.teacher_status !== 'pending') {
      return res.status(409).json({ error: 'This request has already been reviewed by the class teacher.' });
    }

    const now = new Date().toISOString();
    const update: Record<string, any> = {
      teacher_status: status,
      teacher_reviewed_by: reviewed_by || 'Class Teacher',
      teacher_reviewed_at: now,
    };
    // A teacher rejection is final — no need for the principal to also review it.
    if (status === 'rejected') {
      update.status = 'rejected';
      update.reviewed_by = reviewed_by || 'Class Teacher';
      update.reviewed_at = now;
    }

    const { data: leave, error } = await supabase
      .from('leave_requests')
      .update(update)
      .eq('id', req.params.id)
      .select('*, students(name, parent_phone, alternate_phone)')
      .single();
    if (error) throw error;

    if (status === 'rejected') {
      await notifyParent(leave, `${leave.students?.name}'s leave request (${leavePeriod(leave)}) has been rejected by the class teacher.`);
    } else {
      await notifyParent(leave, `${leave.students?.name}'s leave request (${leavePeriod(leave)}) has been approved by the class teacher and sent to the Principal for final approval.`);
    }

    res.json(leave);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Principal: final decision, only once the class teacher has approved.
router.put('/:id/principal-decision', async (req, res) => {
  try {
    const { status, reviewed_by } = req.body as { status: 'approved' | 'rejected'; reviewed_by?: string };
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('leave_requests')
      .select('teacher_status, status')
      .eq('id', req.params.id)
      .single();
    if (fetchError) throw fetchError;
    if (existing.teacher_status !== 'approved') {
      return res.status(409).json({ error: 'This request is awaiting the class teacher\'s review before the principal can decide.' });
    }
    if (existing.status !== 'pending') {
      return res.status(409).json({ error: 'This request has already received a final decision.' });
    }

    const { data: leave, error } = await supabase
      .from('leave_requests')
      .update({ status, reviewed_by: reviewed_by || 'Principal', reviewed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, students(name, parent_phone, alternate_phone)')
      .single();
    if (error) throw error;

    const verb = status === 'approved' ? 'approved' : 'not approved';
    await notifyParent(leave, `${leave.students?.name}'s leave request (${leavePeriod(leave)}) has been ${verb} by the Principal.`);

    res.json(leave);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
