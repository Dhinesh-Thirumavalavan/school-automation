import { API_URL } from '../config';
import type { AnnouncementItem, AttendanceSummary, EventItem, FeeRecord, HomeworkItem, ParentStudent, Payment } from './types';

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const parentApi = {
  requestOtp: (phone: string) =>
    fetch(`${API_URL}/api/parent-auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    }).then((r) => handle<{ success: true }>(r)),

  verifyOtp: (phone: string, otp: string) =>
    fetch(`${API_URL}/api/parent-auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    }).then((r) => handle<{ phone: string; students: ParentStudent[] }>(r)),

  fees: (studentId: string, all = false) =>
    fetch(`${API_URL}/api/students/${studentId}/fees${all ? '?all=true' : ''}`).then((r) => handle<FeeRecord[]>(r)),

  payments: (studentId: string) =>
    fetch(`${API_URL}/api/students/${studentId}/payments`).then((r) => handle<Payment[]>(r)),

  attendance: (studentId: string) =>
    fetch(`${API_URL}/api/attendance/student/${studentId}`).then((r) => handle<AttendanceSummary>(r)),

  homework: (studentClass: string) =>
    fetch(`${API_URL}/api/homework?class=${encodeURIComponent(studentClass)}`).then((r) => handle<HomeworkItem[]>(r)),

  events: () => fetch(`${API_URL}/api/events`).then((r) => handle<EventItem[]>(r)),

  announcements: () => fetch(`${API_URL}/api/message-history`).then((r) => handle<AnnouncementItem[]>(r)),
};
