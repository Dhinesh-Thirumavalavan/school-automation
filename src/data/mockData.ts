import type { Student, FeeRecord } from '../types';
import type { MessageHistoryItem } from '../types';

export const mockStudents: Student[] = [
  { id: '1', name: 'Navishka', class: 'UKG', parentPhone: '+91 98765 43210', birthday: '08-10' },
  { id: '2', name: 'Mugiliniyan', class: 'LKG', parentPhone: '+91 98765 43211', birthday: '08-15' },
  { id: '3', name: 'Rifca Sashmi', class: '3', parentPhone: '+91 98765 43212', birthday: '07-28' },
  { id: '4', name: 'Nafisa', class: 'LKG', parentPhone: '+91 98765 43213', birthday: '06-08' },
  { id: '5', name: 'Ashika', class: '1', parentPhone: '+91 98765 43214', birthday: '09-02' },
];

export const mockFeeRecords: FeeRecord[] = [
  { studentId: '1', studentName: 'Navishka', class: 'UKG', amountDue: 5000, status: 'unpaid', dueDate: '2026-08-20' },
  { studentId: '2', studentName: 'Mugiliniyan', class: 'LKG', amountDue: 5000, status: 'paid', dueDate: '2026-08-20' },
  { studentId: '3', studentName: 'Rifca Sashmi', class: '3', amountDue: 6000, status: 'overdue', dueDate: '2026-08-01' },
  { studentId: '4', studentName: 'Nafisa', class: 'LKG', amountDue: 5000, status: 'unpaid', dueDate: '2026-08-20' },
  { studentId: '5', studentName: 'Ashika', class: '1', amountDue: 6000, status: 'paid', dueDate: '2026-08-01' },
];






export const mockMessageHistory: MessageHistoryItem[] = [
  {
    id: '1',
    englishText: 'Tomorrow is a holiday for all classes.',
    tamilText: 'நாளை அனைத்து வகுப்புகளுக்கும் விடுமுறை.',
    sentAt: '2026-08-17 2:10 PM',
    sentBy: 'Admin',
    audience: 'All Parents (312)',
    totalRecipients: 312,
    delivered: 308,
    read: 276,
  },
  {
    id: '2',
    englishText: 'You are requested to pay the pending fees at the earliest.',
    tamilText: 'நிலுவைக் கட்டணத்தை விரைவில் செலுத்துமாறு கேட்டுக்கொள்கிறோம்.',
    sentAt: '2026-08-16 11:00 AM',
    sentBy: 'Admin',
    audience: 'Unpaid Parents (18)',
    totalRecipients: 18,
    delivered: 18,
    read: 14,
  },
  {
    id: '3',
    englishText: 'Tomorrow is a half working day, timing 9.00am to 12.00 noon.',
    tamilText: 'நாளை அரை நாள் வேலை நாள், நேரம் காலை 9.00 முதல் 12.00 வரை.',
    sentAt: '2026-08-14 3:45 PM',
    sentBy: 'Admin',
    audience: 'All Parents (312)',
    totalRecipients: 312,
    delivered: 310,
    read: 298,
  },
];