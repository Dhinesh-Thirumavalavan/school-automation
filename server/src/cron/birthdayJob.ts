import cron from 'node-cron';
import { supabase } from '../services/supabase.service';
import { translateText } from '../services/groq.service';
import { sendToPhone } from '../services/whatsapp.service';
import { logMessage } from '../services/logMessage.service';

export function startBirthdayJob() { cron.schedule('0 8 * * *', async () => { console.log('Running daily birthday fallback check...'); const today = new Date(); const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; const { data: students } = await supabase.from('students').select('*').eq('birthday', mmdd); for (const student of students || []) { const english = `Today's birthday: ${student.name}! God bless you, have a fantastic year ahead.`; const tamil = await translateText(english); await sendToPhone(student.parent_phone, `${english}\n\n${tamil}`); await logMessage(english, tamil, `Birthday (auto) — ${student.name}`, 1); console.log(`Sent birthday wish for ${student.name}`); } }); }
