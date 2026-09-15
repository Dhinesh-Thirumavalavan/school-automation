import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { LeaveRequest, ParentStudent } from '../types';
import { Card, EmptyState, SectionLabel, SkeletonCard } from '../ui';
import { LeaveIcon } from '../icons';

interface LeaveManagementProps {
  student: ParentStudent;
}

const statusStyles: Record<LeaveRequest['status'], string> = {
  pending: 'text-amber-700 bg-amber-50',
  approved: 'text-emerald-700 bg-emerald-50',
  rejected: 'text-red-700 bg-red-50',
};

export default function LeaveManagement({ student }: LeaveManagementProps) {
  const [history, setHistory] = useState<LeaveRequest[] | null>(null);
  const [leaveType, setLeaveType] = useState<'Full Day' | 'Half Day'>('Full Day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const loadHistory = () => {
    parentApi.leaveHistory(student.id).then(setHistory).catch(() => setHistory([]));
  };

  useEffect(loadHistory, [student.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || (leaveType === 'Full Day' && !endDate) || !reason.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('student_id', student.id);
      formData.append('leave_type', leaveType);
      formData.append('start_date', startDate);
      formData.append('end_date', leaveType === 'Half Day' ? startDate : endDate);
      formData.append('reason', reason);
      if (attachment) formData.append('attachment', attachment);

      await parentApi.submitLeave(formData);
      setSuccess(true);
      setStartDate('');
      setEndDate('');
      setReason('');
      setAttachment(null);
      loadHistory();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Could not submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <Card className="p-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">Apply for Leave</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Leave Type</label>
            <div className="flex gap-2">
              {(['Full Day', 'Half Day'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLeaveType(type)}
                  className={`flex-1 text-sm font-medium py-2 rounded-lg border ${
                    leaveType === type ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{leaveType === 'Half Day' ? 'Date' : 'From'}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            {leaveType === 'Full Day' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Fever, family function..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Attachment (optional)</label>
            <label className="border border-dashed border-slate-300 rounded-lg p-3 text-center block cursor-pointer hover:bg-slate-50">
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                className="hidden"
              />
              <span className="text-xs text-slate-500">
                {attachment ? `📎 ${attachment.name}` : '📎 Attach a photo or document'}
              </span>
            </label>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-emerald-600 font-medium">✅ Leave request submitted</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </Card>

      <div>
        <SectionLabel>Past requests</SectionLabel>
        {history === null ? (
          <SkeletonCard />
        ) : history.length === 0 ? (
          <EmptyState icon={<LeaveIcon className="w-5 h-5" />} title="No leave requests yet" />
        ) : (
          <div className="space-y-2">
            {history.map((req) => (
              <Card key={req.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-800">{req.leave_type}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[req.status]}`}>
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(req.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  {req.end_date !== req.start_date && ` – ${new Date(req.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                </p>
                {req.reason && <p className="text-xs text-slate-600 mt-1">{req.reason}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
