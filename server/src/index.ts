import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeWhatsApp } from './services/whatsapp.service';
import translateRouter from './routes/translate.routes';
import transcribeRouter from './routes/transcribe.routes';
import whatsappRouter from './routes/whatsapp.routes';
import studentsRouter from './routes/students.routes';
import feesRouter, { paymentsRouter } from './routes/fees.routes';
import eventsRouter from './routes/events.routes';
import attendanceRouter from './routes/attendance.routes';
import homeworkRouter from './routes/homework.routes';
import teachersRouter, { authRouter } from './routes/teachers.routes';
import systemRouter from './routes/system.routes';
import historyRouter from './routes/history.routes';
import { startBirthdayJob } from './cron/birthdayJob';
import { startOverdueJob } from './cron/overdueJob';
import { startFeeReminderJob } from './cron/feeReminderJob';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/translate', translateRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/send-whatsapp', whatsappRouter);
app.use('/api/message-history', historyRouter);
app.use('/api/students', studentsRouter);
app.use('/api/fees', feesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/homework', homeworkRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/auth', authRouter);
app.use('/', systemRouter);

initializeWhatsApp();
startBirthdayJob();
startOverdueJob();
startFeeReminderJob();

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on port ${process.env.PORT || 4000}`);
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large — maximum size is 16MB per photo/video.' });
  next(err);
});
