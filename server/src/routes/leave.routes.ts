import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { supabase } from '../services/supabase.service';

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

export default router;
