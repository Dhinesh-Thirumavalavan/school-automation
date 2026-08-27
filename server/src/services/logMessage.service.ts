import { supabase } from './supabase.service';

export async function logMessage(englishText: string, tamilText: string, audience: string, totalRecipients: number) {
  await supabase.from('message_history').insert([{
    english_text: englishText,
    tamil_text: tamilText,
    audience,
    sent_by: 'Admin',
    total_recipients: totalRecipients,
    delivered: totalRecipients,
    read: 0,
  }]);
}
