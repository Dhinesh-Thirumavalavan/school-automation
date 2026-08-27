import cron from 'node-cron';
import { supabase } from '../services/supabase.service';
import { translateText } from '../services/groq.service';
import { sendToPhone } from '../services/whatsapp.service';
import { logMessage } from '../services/logMessage.service';

export function startBirthdayJob() {
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily birthday fallback check...');
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data: birthdayStudents } = await supabase.from('students').select('*').eq('birthday', mmdd);

    for (const student of birthdayStudents || []) {
      const english = `🎉 Today's Birthday: ${student.name}! God bless you dear, have a fantastic year ahead. 🎂`;
      const tamil = await translateText(english);
      const fullMessage = `${english}\n\n${tamil}`;

      // Send to all parents in the same class
      const { data: classmates } = await supabase.from('students').select('parent_phone').eq('class', student.class);
      for (const classmate of classmates || []) {
        await sendToPhone(classmate.parent_phone, fullMessage);
      }

      await logMessage(english, tamil, `Birthday (auto) — ${student.name} (Class ${student.class})`, classmates?.length || 0);
      console.log(`Sent birthday wish for ${student.name} to ${classmates?.length || 0} classmates' parents`);
    }
  });
}