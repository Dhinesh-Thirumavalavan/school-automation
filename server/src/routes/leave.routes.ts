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

// Admin: approve/reject — notifies the parent on both WhatsApp and push
router.put('/:id', async (req, res) => {
  try {
    const { status, reviewed_by } = req.body as { status: 'approved' | 'rejected'; reviewed_by?: string };
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    }

    const { data: leave, error } = await supabase
      .from('leave_requests')
      .update({ status, reviewed_by: reviewed_by || 'Admin', reviewed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, students(name, parent_phone, alternate_phone)')
      .single();
    if (error) throw error;

    const student = leave.students as any;
    if (student) {
      const verb = status === 'approved' ? 'approved' : 'not approved';
      const english = `${student.name}'s leave request (${leave.leave_type}, ${leave.start_date}${leave.end_date !== leave.start_date ? ` to ${leave.end_date}` : ''}) has been ${verb}.`;
      const tamil = await translateText(english);
      const phones = [student.parent_phone, student.alternate_phone].filter(Boolean);
      for (const phone of phones) await sendToPhone(phone, `${english}\n\n${tamil}`);
      await sendPushToPhones(phones, { title: 'Leave Request Update', body: english, url: '/parent' });
    }

    res.json(leave);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
