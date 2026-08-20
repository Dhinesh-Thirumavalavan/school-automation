export interface Student {
  id: string;
  name: string;
  class: string;
  section?: string;
  rollNo?: string;
  parentPhone: string;
  parentName?: string;
  alternatePhone?: string;
  gender?: string;
  address?: string;
  bloodGroup?: string;
  admissionDate?: string;
  birthday: string;
}

export interface FeeRecord {
  studentId: string;
  studentName: string;
  class: string;
  amountDue: number;
  status: 'paid' | 'unpaid' | 'overdue';
  dueDate: string;
}

export interface BroadcastMessage {
  id: string;
  englishText: string;
  tamilText: string;
  sentAt: string;
  status: 'draft' | 'sent';
}

export interface MessageHistoryItem {
  id: string;
  englishText: string;
  tamilText: string;
  sentAt: string;
  sentBy: string;
  audience: string;
  totalRecipients: number;
  delivered: number;
  read: number;
}