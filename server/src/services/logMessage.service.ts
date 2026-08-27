import { supabase } from './supabase.service';

export async function logMessage(
  englishText: string,
  tamilText: string,
  audience: string,
  totalRecipients: number,
  failedRecipients: string[] = []
) {
  await supabase.from('message_history').insert([{
    english_text: englishText,
    tamil_text: tamilText,
    audience,
    sent_by: 'Admin',
    total_recipients: totalRecipients,
    delivered: totalRecipients - failedRecipients.length,
    read: 0,
    failed_recipients: failedRecipients,
  }]);
}