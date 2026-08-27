import express from 'express';
import { supabase } from '../services/supabase.service';

const router = express.Router();
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('message_history').select('*').order('sent_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
export default router;
