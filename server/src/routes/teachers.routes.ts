import express from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../services/supabase.service';

const router = express.Router();
export const authRouter = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL) {
      const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      if (valid) return res.json({ role: 'admin', name: 'Admin', assignedClasses: [] });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { data: teacher } = await supabase.from('teachers').select('*').eq('email', email).maybeSingle();
    if (!teacher) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, teacher.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ role: 'teacher', name: teacher.name, assignedClasses: teacher.assigned_classes });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, password, assigned_classes } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('teachers').insert([{ name, email, password_hash, assigned_classes }]).select('id, name, email, assigned_classes');
    if (error) throw error;
    res.json(data[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('teachers').select('id, name, email, assigned_classes');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Admin-triggered password reset (no email server, so admin sets a new password directly)
router.put('/:id/reset-password', async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const password_hash = await bcrypt.hash(new_password, 10);
    const { data, error } = await supabase
      .from('teachers')
      .update({ password_hash })
      .eq('id', req.params.id)
      .select('id, name, email');
    if (error) throw error;
    res.json(data[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;