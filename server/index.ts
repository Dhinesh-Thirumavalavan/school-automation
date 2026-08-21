import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

let waReady = false;
let currentQR: string | null = null;

const waClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

waClient.on('qr', (qr) => {
  currentQR = qr;
  qrcode.generate(qr, { small: true });
  console.log('QR code received - visit /qr to scan it as an image');
});

waClient.on('ready', () => {
  waReady = true;
  currentQR = null;
  console.log('✅ WhatsApp client is ready!');
});

waClient.on('disconnected', () => {
  waReady = false;
  console.log('⚠️ WhatsApp client disconnected');
});

waClient.initialize();

app.get('/qr', async (req, res) => {
  if (waReady) {
    return res.send('<h2>✅ WhatsApp is already connected!</h2>');
  }
  if (!currentQR) {
    return res.send('<h2>⏳ Waiting for QR code to generate... refresh in a few seconds.</h2><script>setTimeout(() => location.reload(), 3000);</script>');
  }
  const qrImage = await QRCode.toDataURL(currentQR);
  res.send(`
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
        <h2>Scan this with WhatsApp → Linked Devices</h2>
        <img src="${qrImage}" style="width:300px;height:300px;" />
        <p>This page auto-refreshes every 5 seconds</p>
        <script>setTimeout(() => location.reload(), 5000);</script>
      </body>
    </html>
  `);
});

async function translateText(text: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-20b',
    messages: [
      {
        role: 'user',
        content: `Translate this school announcement into natural, everyday Tamil suitable for parents. Keep it warm and friendly, similar to how Indian school WhatsApp groups communicate — feel free to naturally include relevant emojis (like 🙏, 🎉, 📢, 💐) where appropriate, matching the tone of the English text. Only return the Tamil translation, nothing else:\n\n"${text}"`,
      },
    ],
  });
  return completion.choices[0].message.content || '';
}

async function sendToPhone(phone: string, message: string) {
  if (!waReady) {
    console.log('⚠️ WhatsApp not ready yet, skipping send to', phone);
    return;
  }
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  try {
    const numberId = await waClient.getNumberId(cleanPhone);
    if (!numberId) {
      console.log(`⚠️ ${cleanPhone} is not a valid WhatsApp number`);
      return;
    }
    await waClient.sendMessage(numberId._serialized, message);
  } catch (err) {
    console.error(`Failed to send to ${cleanPhone}:`, err);
  }
}

async function logMessage(
  englishText: string,
  tamilText: string,
  audience: string,
  totalRecipients: number
) {
  await supabase.from('message_history').insert([
    {
      english_text: englishText,
      tamil_text: tamilText,
      audience,
      sent_by: 'Admin',
      total_recipients: totalRecipients,
      delivered: totalRecipients,
      read: 0,
    },
  ]);
}

app.post('/api/translate', async (req, res) => {
  try {
    const { text } = req.body;
    const tamilText = await translateText(text);
    res.json({ tamilText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    const ext = req.file.originalname.split('.').pop() || 'mp3';
    const newPath = `${req.file.path}.${ext}`;
    fs.renameSync(req.file.path, newPath);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: 'whisper-large-v3',
    });

    fs.unlinkSync(newPath);
    res.json({ text: transcription.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

app.post('/api/send-whatsapp', async (req, res) => {
  try {
    const { phones, message, audience } = req.body;
    const results = [];
    for (const phone of phones) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      try {
        await sendToPhone(cleanPhone, message);
        results.push({ phone: cleanPhone, status: 'sent' });
      } catch (err) {
        results.push({ phone: cleanPhone, status: 'failed' });
      }
    }

    const [englishPart, tamilPart] = message.split('\n\n');
    await logMessage(englishPart, tamilPart || '', audience || 'Custom', phones.length);

    res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send WhatsApp messages' });
  }
});

app.post('/api/send-whatsapp-media', upload.array('media', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No media files provided' });
    }

    const { phones, caption, audience } = req.body;
    const phoneList = JSON.parse(phones);

    const mediaObjects = files.map((file) => {
      const fileData = fs.readFileSync(file.path);
      return new MessageMedia(file.mimetype, fileData.toString('base64'), file.originalname);
    });

    for (const phone of phoneList) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (!waReady) continue;
      const numberId = await waClient.getNumberId(cleanPhone);
      if (!numberId) continue;

      for (let i = 0; i < mediaObjects.length; i++) {
        const options = i === 0 ? { caption } : {};
        await waClient.sendMessage(numberId._serialized, mediaObjects[i], options);
      }
    }

    files.forEach((file) => fs.unlinkSync(file.path));
    await logMessage(caption || `[${files.length} media files]`, '', audience || 'Custom', phoneList.length);

    res.json({ success: true, count: files.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send media' });
  }
});

app.get('/api/message-history', async (req, res) => {
  const { data, error } = await supabase
    .from('message_history')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/students', async (req, res) => {
  const { data, error } = await supabase.from('students').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/students/search', async (req, res) => {
  const q = (req.query.q as string) || '';
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .or(`name.ilike.%${q}%,class.ilike.%${q}%`)
    .limit(10);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/students/:id/fees', async (req, res) => {
  const { data, error } = await supabase
    .from('fee_records')
    .select('*')
    .eq('student_id', req.params.id)
    .neq('status', 'paid');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/students', async (req, res) => {
  const {
    name, class: studentClass, section, roll_no, parent_phone, parent_name,
    alternate_phone, gender, address, blood_group, admission_date, birthday,
  } = req.body;
  const { data, error } = await supabase
    .from('students')
    .insert([{
      name, class: studentClass, section, roll_no, parent_phone, parent_name,
      alternate_phone, gender, address, blood_group, admission_date, birthday,
    }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.put('/api/students/:id', async (req, res) => {
  const {
    name, class: studentClass, section, roll_no, parent_phone, parent_name,
    alternate_phone, gender, address, blood_group, admission_date, birthday,
  } = req.body;
  const { data, error } = await supabase
    .from('students')
    .update({
      name, class: studentClass, section, roll_no, parent_phone, parent_name,
      alternate_phone, gender, address, blood_group, admission_date, birthday,
    })
    .eq('id', req.params.id)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.get('/api/fees', async (req, res) => {
  const { data, error } = await supabase
    .from('fee_records')
    .select('*, students(name, class, parent_phone)')
    .order('due_date');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/fees', async (req, res) => {
  const { student_id, amount_due, due_date, status } = req.body;
  const { data, error } = await supabase
    .from('fee_records')
    .insert([{ student_id, amount_due, due_date, status: status || 'unpaid' }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.put('/api/fees/:id/paid', async (req, res) => {
  const { data, error } = await supabase
    .from('fee_records')
    .update({ status: 'paid' })
    .eq('id', req.params.id)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.post('/api/payments', async (req, res) => {
  try {
    const { fee_record_id, student_id, amount_paid, payment_mode } = req.body;
    const receiptNo = `RCT-${Date.now().toString().slice(-8)}`;

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert([{ fee_record_id, student_id, amount_paid, payment_mode, receipt_no: receiptNo }])
      .select();
    if (payError) throw payError;

    await supabase.from('fee_records').update({ status: 'paid' }).eq('id', fee_record_id);

    const { data: student } = await supabase.from('students').select('*').eq('id', student_id).single();
    if (student) {
      const english = `Payment received! ₹${amount_paid} (${payment_mode.toUpperCase()}). Receipt No: ${receiptNo}. Thank you!`;
      const tamil = await translateText(english);
      await sendToPhone(student.parent_phone, `${english}\n\n${tamil}`);
      await logMessage(english, tamil, `Payment Receipt — ${student.name}`, 1);
    }

    res.json(payment[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events', async (req, res) => {
  const { data, error } = await supabase.from('events').select('*').order('event_date');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/events', async (req, res) => {
  const { title, event_date, notes } = req.body;
  const { data, error } = await supabase
    .from('events')
    .insert([{ title, event_date, notes }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/events/:id', async (req, res) => {
  const { error } = await supabase.from('events').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

cron.schedule('0 8 * * *', async () => {
  console.log('Running daily birthday check...');
  const today = new Date();
  const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { data: students } = await supabase.from('students').select('*').eq('birthday', mmdd);

  for (const student of students || []) {
    const english = `Today's birthday: ${student.name}! God bless you, have a fantastic year ahead.`;
    const tamil = await translateText(english);
    await sendToPhone(student.parent_phone, `${english}\n\n${tamil}`);
    await logMessage(english, tamil, `Birthday — ${student.name}`, 1);
    console.log(`Sent birthday wish for ${student.name}`);
  }
});

cron.schedule('0 9 * * *', async () => {
  console.log('Running overdue status check...');
  const today = new Date().toISOString().split('T')[0];

  const { data: overdue } = await supabase
    .from('fee_records')
    .select('id')
    .eq('status', 'unpaid')
    .lt('due_date', today);

  for (const record of overdue || []) {
    await supabase.from('fee_records').update({ status: 'overdue' }).eq('id', record.id);
  }
  console.log(`Marked ${overdue?.length || 0} fee record(s) as overdue`);
});

cron.schedule('0 10 * * *', async () => {
  console.log('Running daily fee reminder check...');

  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  const upcomingDate = twoDaysFromNow.toISOString().split('T')[0];

  const { data: upcoming } = await supabase
    .from('fee_records')
    .select('*, students(name, parent_phone)')
    .eq('due_date', upcomingDate)
    .eq('status', 'unpaid');

  for (const fee of upcoming || []) {
    const english = `Gentle reminder: Fee of ₹${fee.amount_due} for ${fee.students.name} is due in 2 days. Please pay at the earliest.`;
    const tamil = await translateText(english);
    await sendToPhone(fee.students.parent_phone, `${english}\n\n${tamil}`);
    await logMessage(english, tamil, `Fee Reminder — ${fee.students.name}`, 1);
    console.log(`Sent gentle reminder for ${fee.students.name}`);
  }

  const { data: overdue } = await supabase
    .from('fee_records')
    .select('*, students(name, parent_phone)')
    .eq('status', 'overdue');

  for (const fee of overdue || []) {
    const english = `URGENT: Fee of ₹${fee.amount_due} for ${fee.students.name} is now OVERDUE. Please clear this immediately to avoid further action.`;
    const tamil = await translateText(english);
    await sendToPhone(fee.students.parent_phone, `${english}\n\n${tamil}`);
    await logMessage(english, tamil, `Overdue Notice — ${fee.students.name}`, 1);
    console.log(`Sent overdue notice for ${fee.students.name}`);
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on port ${process.env.PORT || 4000}`);
});