import cron from 'node-cron';
import { supabase } from '../services/supabase.service';

export function startOverdueJob() { cron.schedule('0 9 * * *', async () => { console.log('Running overdue status check...'); const today = new Date().toISOString().split('T')[0]; const { data: overdue } = await supabase.from('fee_records').select('id').eq('status', 'unpaid').lt('due_date', today); for (const record of overdue || []) await supabase.from('fee_records').update({ status: 'overdue' }).eq('id', record.id); console.log(`Marked ${overdue?.length || 0} fee record(s) as overdue`); }); }
