import express from 'express';
import { supabase } from '../services/supabase.service';
import { translateText } from '../services/groq.service';
import { logMessage } from '../services/logMessage.service';
import { sendToPhone } from '../services/whatsapp.service';

const router = express.Router();
export const paymentsRouter = express.Router();
router.get('/', async (req, res) => { const { data, error } = await supabase.from('fee_records').select('*, students(name, class, parent_phone)').order('due_date'); if (error) return res.status(500).json({ error: error.message }); res.json(data); });
router.post('/', async (req, res) => { const { student_id, amount_due, due_date, status } = req.body; const { data, error } = await supabase.from('fee_records').insert([{ student_id, amount_due, due_date, status: status || 'unpaid' }]).select(); if (error) return res.status(500).json({ error: error.message }); res.json(data[0]); });
router.put('/:id/paid', async (req, res) => { const { data, error } = await supabase.from('fee_records').update({ status: 'paid' }).eq('id', req.params.id).select(); if (error) return res.status(500).json({ error: error.message }); res.json(data[0]); });
const createPayment = async (req: express.Request, res: express.Response) => {
  try {
    const { fee_record_id, student_id, amount_paid, payment_mode } = req.body;
    const receiptNo = `RCT-${Date.now().toString().slice(-8)}`;
    const { data: payment, error: payError } = await supabase.from('payments').insert([{ fee_record_id, student_id, amount_paid, payment_mode, receipt_no: receiptNo }]).select();
    if (payError) throw payError;
    await supabase.from('fee_records').update({ status: 'paid' }).eq('id', fee_record_id);
    const { data: student } = await supabase.from('students').select('*').eq('id', student_id).single();
    if (student) { const english = `Payment received! ₹${amount_paid} (${payment_mode.toUpperCase()}). Receipt No: ${receiptNo}. Thank you!`; const tamil = await translateText(english); await sendToPhone(student.parent_phone, `${english}\n\n${tamil}`); await logMessage(english, tamil, `Payment Receipt — ${student.name}`, 1); }
    res.json(payment[0]);
  } catch (err: any) { console.error(err); res.status(500).json({ error: err.message }); }
};
paymentsRouter.post('/', createPayment);
export default router;
