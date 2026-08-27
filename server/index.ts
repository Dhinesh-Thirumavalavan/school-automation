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
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB per file, matching WhatsApp's own limit
});

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

let waReady = false;
let currentQR: string | null = null;

// Clean up stale Chrome profile lock files (can persist on volume across container restarts)
const sessionPath = '/app/.wwebjs_auth';
try {
  const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  const findAndRemoveLocks = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        findAndRemoveLocks(fullPath);
      } else if (lockFiles.includes(entry.name)) {
        fs.unlinkSync(fullPath);
        console.log(`Removed stale lock file: ${fullPath}`);
      }
    }
  };
  findAndRemoveLocks(sessionPath);
} catch (err) {
  console.log('Lock cleanup skipped (non-fatal):', err);
}

const waClient = new Client({
  authStrategy: new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
  }),
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 120000,
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
  if (waReady) return res.send('<h2>✅ WhatsApp is already connected!</h2>');
  if (!currentQR) {
    return res.send('<h2>⏳ Waiting for QR code to generate... refresh in a few seconds.</h2><script>setTimeout(() => location.reload(), 3000);</script>');
  }
  const qrImage = await QRCode.toDataURL(currentQR);
  res.send(`
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
        <h2>Scan this with WhatsApp → Linked Devices</h2>
        <img src="${qrImage}" style="width:300px;height:300px;" />
        <p>This page auto-refreshes every 60 seconds</p>
        <script>setTimeout(() => location.reload(), 60000);</script>
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

async function logMessage(englishText: string, tamilText: string, audience: string, totalRecipients: number) {
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

// Grammar/clarity check
app.post('/api/check-clarity', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.json({ hasIssue: false });

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'user',
          content: `Review this school announcement for grammar, clarity, or awkward phrasing issues that a busy admin might have typed quickly:\n\n"${text}"\n\nIf it's clear and fine as-is, respond with exactly: OK\nIf there's a real issue worth fixing, respond with exactly: ISSUE: <a corrected/clearer version of the same message, keeping the same meaning and tone>`,
        },
      ],
    });

    const result = completion.choices[0].message.content || '';
    if (result.trim().toUpperCase().startsWith('OK')) {
      res.json({ hasIssue: false });
    } else {
      const suggestion = result.replace(/^ISSUE:\s*/i, '').trim();
      res.json({ hasIssue: true, suggestion });
    }
  } catch (err: any) {
    console.error('Clarity check error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
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
    if (!files || files.length === 0) return res.status(400).json({ error: 'No media files provided' });
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
  const { data, error } = await supabase.from('message_history').select('*').order('sent_at', { ascending: false }).limit(50);
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
  const { data, error } = await supabase.from('students').select('*').or(`name.ilike.%${q}%,class.ilike.%${q}%`).limit(10);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/students/:id/fees', async (req, res) => {
  const { data, error } = await supabase.from('fee_records').select('*').eq('student_id', req.params.id).neq('status', 'paid');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/students', async (req, res) => {
  const { name, class: studentClass, section, roll_no, parent_phone, parent_name, alternate_phone, gender, address, blood_group, admission_date, birthday } = req.body;
  const { data, error } = await supabase.from('students').insert([{ name, class: studentClass, section, roll_no, parent_phone, parent_name, alternate_phone, gender, address, blood_group, admission_date, birthday }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.put('/api/students/:id', async (req, res) => {
  const { name, class: studentClass, section, roll_no, parent_phone, parent_name, alternate_phone, gender, address, blood_group, admission_date, birthday } = req.body;
  const { data, error } = await supabase.from('students').update({ name, class: studentClass, section, roll_no, parent_phone, parent_name, alternate_phone, gender, address, blood_group, admission_date, birthday }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.post('/api/students/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo provided' });
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${req.params.id}-${Date.now()}.${fileExt}`;
    const fileData = fs.readFileSync(req.file.path);
    const { error: uploadError } = await supabase.storage.from('student-photos').upload(fileName, fileData, { contentType: req.file.mimetype, upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('student-photos').getPublicUrl(fileName);
    await supabase.from('students').update({ photo_url: publicUrlData.publicUrl }).eq('id', req.params.id);
    fs.unlinkSync(req.file.path);
    res.json({ photo_url: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/:id/send-birthday', async (req, res) => {
  try {
    if (!waReady) {
      return res.status(503).json({ error: 'WhatsApp not ready yet, please try again in a few seconds' });
    }

    const { data: student } = await supabase.from('students').select('*').eq('id', req.params.id).single();
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const english = `Today's birthday: ${student.name}! God bless you, have a fantastic year ahead.`;
    const tamil = await translateText(english);
    const fullMessage = `${english}\n\n${tamil}`;

    const cleanPhone = student.parent_phone.replace(/[^0-9]/g, '');
    const numberId = await waClient.getNumberId(cleanPhone);

    if (numberId) {
      if (student.photo_url) {
        const media = await MessageMedia.fromUrl(student.photo_url);
        await waClient.sendMessage(numberId._serialized, media, { caption: fullMessage });
      } else {
        await waClient.sendMessage(numberId._serialized, fullMessage);
      }
    } else {
      return res.status(400).json({ error: 'Invalid WhatsApp number' });
    }

    await logMessage(english, tamil, `Birthday — ${student.name}`, 1);
    res.json({ success: true });
  } catch (err: any) {
    console.error('send-birthday error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fees', async (req, res) => {
  const { data, error } = await supabase.from('fee_records').select('*, students(name, class, parent_phone)').order('due_date');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/fees', async (req, res) => {
  const { student_id, amount_due, due_date, status } = req.body;
  const { data, error } = await supabase.from('fee_records').insert([{ student_id, amount_due, due_date, status: status || 'unpaid' }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.put('/api/fees/:id/paid', async (req, res) => {
  const { data, error } = await supabase.from('fee_records').update({ status: 'paid' }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.post('/api/payments', async (req, res) => {
  try {
    const { fee_record_id, student_id, amount_paid, payment_mode } = req.body;
    const receiptNo = `RCT-${Date.now().toString().slice(-8)}`;
    const { data: payment, error: payError } = await supabase.from('payments').insert([{ fee_record_id, student_id, amount_paid, payment_mode, receipt_no: receiptNo }]).select();
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
  const { data, error } = await supabase.from('events').insert([{ title, event_date, notes }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/events/:id', async (req, res) => {
  const { error } = await supabase.from('events').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/events/:id/media', upload.array('media', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files provided' });
    const { caption } = req.body;
    const uploaded = [];
    for (const file of files) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${req.params.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const fileData = fs.readFileSync(file.path);
      const { error: uploadError } = await supabase.storage.from('event-media').upload(fileName, fileData, { contentType: file.mimetype });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('event-media').getPublicUrl(fileName);
      const { data: mediaRow } = await supabase.from('event_media').insert([{ event_id: req.params.id, media_url: publicUrlData.publicUrl, media_type: file.mimetype.startsWith('video') ? 'video' : 'image', caption }]).select();
      uploaded.push(mediaRow?.[0]);
      fs.unlinkSync(file.path);
    }
    res.json(uploaded);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events/:id/media', async (req, res) => {
  const { data, error } = await supabase.from('event_media').select('*').eq('event_id', req.params.id).order('uploaded_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/events/:id/send', async (req, res) => {
  try {
    const { phones, mediaIds } = req.body;
    const { data: mediaItems } = await supabase.from('event_media').select('*').in('id', mediaIds);
    const { data: event } = await supabase.from('events').select('*').eq('id', req.params.id).single();
    for (const phone of phones) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (!waReady) continue;
      const numberId = await waClient.getNumberId(cleanPhone);
      if (!numberId) continue;
      for (let i = 0; i < (mediaItems || []).length; i++) {
        const item = mediaItems![i];
        const media = await MessageMedia.fromUrl(item.media_url);
        const options = i === 0 ? { caption: item.caption || event?.title } : {};
        await waClient.sendMessage(numberId._serialized, media, options);
      }
    }
    await logMessage(event?.title || 'Event photos', '', 'Event Media', phones.length);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Auto-caption for event photos
app.post('/api/generate-caption', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const imageData = fs.readFileSync(req.file.path);
    const base64Image = imageData.toString('base64');

    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3.6-27b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Write a short, warm caption (under 15 words) for this school event photo, suitable for a parent WhatsApp group. Just the caption, nothing else.' },
            { type: 'image_url', image_url: { url: `data:${req.file.mimetype};base64,${base64Image}` } },
          ] as any,
        },
      ],
    });

    fs.unlinkSync(req.file.path);
    res.json({ caption: completion.choices[0].message.content });
  } catch (err: any) {
    console.error('Caption generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

cron.schedule('0 8 * * *', async () => {
  console.log('Running daily birthday fallback check...');
  const today = new Date();
  const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const { data: students } = await supabase.from('students').select('*').eq('birthday', mmdd);
  for (const student of students || []) {
    const english = `Today's birthday: ${student.name}! God bless you, have a fantastic year ahead.`;
    const tamil = await translateText(english);
    await sendToPhone(student.parent_phone, `${english}\n\n${tamil}`);
    await logMessage(english, tamil, `Birthday (auto) — ${student.name}`, 1);
    console.log(`Sent birthday wish for ${student.name}`);
  }
});

cron.schedule('0 9 * * *', async () => {
  console.log('Running overdue status check...');
  const today = new Date().toISOString().split('T')[0];
  const { data: overdue } = await supabase.from('fee_records').select('id').eq('status', 'unpaid').lt('due_date', today);
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
  const { data: upcoming } = await supabase.from('fee_records').select('*, students(name, parent_phone)').eq('due_date', upcomingDate).eq('status', 'unpaid');
  for (const fee of upcoming || []) {
    const english = `Gentle reminder: Fee of ₹${fee.amount_due} for ${fee.students.name} is due in 2 days. Please pay at the earliest.`;
    const tamil = await translateText(english);
    await sendToPhone(fee.students.parent_phone, `${english}\n\n${tamil}`);
    await logMessage(english, tamil, `Fee Reminder — ${fee.students.name}`, 1);
  }
  const { data: overdue } = await supabase.from('fee_records').select('*, students(name, parent_phone)').eq('status', 'overdue');
  for (const fee of overdue || []) {
    const english = `URGENT: Fee of ₹${fee.amount_due} for ${fee.students.name} is now OVERDUE. Please clear this immediately to avoid further action.`;
    const tamil = await translateText(english);
    await sendToPhone(fee.students.parent_phone, `${english}\n\n${tamil}`);
    await logMessage(english, tamil, `Overdue Notice — ${fee.students.name}`, 1);
  }
});

app.delete('/api/events/:eventId/media/:mediaId', async (req, res) => {
  try {
    const { data: mediaItem } = await supabase
      .from('event_media')
      .select('*')
      .eq('id', req.params.mediaId)
      .single();

    if (mediaItem) {
      // Extract the storage file path from the public URL and remove it from storage too
      const urlParts = mediaItem.media_url.split('/event-media/');
      const filePath = urlParts[1];
      if (filePath) {
        await supabase.storage.from('event-media').remove([filePath]);
      }
    }

    const { error } = await supabase.from('event_media').delete().eq('id', req.params.mediaId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on port ${process.env.PORT || 4000}`);
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large — maximum size is 16MB per photo/video.' });
  }
  next(err);
});

app.get('/api/system-status', async (req, res) => {
  try {
    const { error: dbError } = await supabase.from('students').select('id').limit(1);
    const dbConnected = !dbError;

    res.json({
      backendRunning: true,
      whatsappReady: waReady,
      databaseConnected: dbConnected,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      backendRunning: true,
      whatsappReady: false,
      databaseConnected: false,
      error: 'Status check failed',
    });
  }
});



app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === ADMIN_EMAIL) {
      const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      if (valid) {
        return res.json({ role: 'admin', name: 'Admin', assignedClasses: [] });
      }
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

app.post('/api/teachers', async (req, res) => {
  try {
    const { name, email, password, assigned_classes } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('teachers')
      .insert([{ name, email, password_hash, assigned_classes }])
      .select('id, name, email, assigned_classes');
    if (error) throw error;
    res.json(data[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teachers', async (req, res) => {
  const { data, error } = await supabase.from('teachers').select('id, name, email, assigned_classes');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


// --- Attendance (already defined earlier, included here for completeness) ---
app.get('/api/attendance', async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const classFilter = req.query.class as string | undefined;

  let query = supabase.from('attendance').select('*, students(name, class, parent_phone)').eq('date', date);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const filtered = classFilter ? data.filter((a: any) => a.students.class === classFilter) : data;
  res.json(filtered);
});

app.post('/api/attendance/mark', async (req, res) => {
  try {
    const { student_id, status, date } = req.body;
    const attendanceDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance')
      .upsert([{ student_id, date: attendanceDate, status }], { onConflict: 'student_id,date' })
      .select();
    if (error) throw error;

    if (status === 'absent') {
      const { data: student } = await supabase.from('students').select('*').eq('id', student_id).single();
      if (student) {
        const english = `Your child ${student.name} was marked absent today. Please confirm or inform the school if this is a mistake.`;
        const tamil = await translateText(english);
        await sendToPhone(student.parent_phone, `${english}\n\n${tamil}`);
        await logMessage(english, tamil, `Absence Alert — ${student.name}`, 1);
      }
    }

    res.json(data[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Homework ---
app.get('/api/homework', async (req, res) => {
  const classFilter = req.query.class as string | undefined;
  let query = supabase.from('homework').select('*').order('posted_at', { ascending: false }).limit(20);
  if (classFilter) query = query.eq('class', classFilter);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/homework', async (req, res) => {
  try {
    const { class: studentClass, english_text, posted_by } = req.body;
    const tamil_text = await translateText(english_text);

    const { data: homeworkRow, error } = await supabase
      .from('homework')
      .insert([{ class: studentClass, english_text, tamil_text, posted_by }])
      .select();
    if (error) throw error;

    const { data: students } = await supabase.from('students').select('parent_phone').eq('class', studentClass);
    const phones = (students || []).map((s: any) => s.parent_phone);

    const message = `📚 Homework — ${studentClass}\n\n${english_text}\n\n${tamil_text}`;
    for (const phone of phones) {
      await sendToPhone(phone, message);
    }
    await logMessage(`Homework — ${studentClass}`, '', `Homework — ${studentClass}`, phones.length);

    res.json(homeworkRow[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});