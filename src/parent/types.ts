export interface ParentStudent {
  id: string;
  name: string;
  class: string;
  section?: string;
  roll_no?: string;
  parent_name?: string;
}

export interface ParentSession {
  phone: string;
  students: ParentStudent[];
}

export interface FeeRecord {
  id: string;
  amount_due: number;
  due_date: string;
  status: 'paid' | 'unpaid' | 'overdue';
}

export interface Payment {
  id: string;
  amount_paid: number;
  payment_mode: string;
  receipt_no: string;
  created_at: string;
}

export interface AttendanceSummary {
  percentage: number;
  present: number;
  absent: number;
  total: number;
  days: { date: string; status: string }[];
}

export interface HomeworkItem {
  id: string;
  class: string;
  english_text: string;
  tamil_text: string;
  posted_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  event_date: string;
  notes?: string;
}

export interface AnnouncementItem {
  id: string;
  english_text: string;
  tamil_text: string;
  audience: string;
  sent_at: string;
}

export interface ExamItem {
  id: string;
  subject: string;
  exam_date: string;
  exam_day: string | null;
  exam_time: string | null;
  portion: string | null;
  term: string | null;
}

export interface ResultItem {
  id: string;
  subject: string;
  term: string;
  marks: number;
  max_marks: number;
  grade: string | null;
}

export interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
}
