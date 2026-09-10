import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { AnnouncementItem, AttendanceSummary, FeeRecord, ParentStudent } from '../types';
import { BookIcon, ChevronRightIcon, ClockIcon, FlagIcon } from '../icons';

interface HomeProps {
  student: ParentStudent;
  onOpenAttendance: () => void;
  onOpenFees: () => void;
  onOpenHomework: () => void;
  onOpenEvents: () => void;
  onOpenInbox: () => void;
}

export default function Home({ student, onOpenAttendance, onOpenFees, onOpenHomework, onOpenEvents, onOpenInbox }: HomeProps) {
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<AnnouncementItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      parentApi.attendance(student.id).catch(() => null),
      parentApi.fees(student.id).catch(() => []),
      parentApi.announcements().catch(() => []),
    ]).then(([att, feeList, announcements]) => {
      setAttendance(att);
      setFees(feeList);
      setLatestAnnouncement(announcements[0] || null);
      setLoading(false);
    });
  }, [student.id]);

  const totalDue = fees.reduce((sum, f) => sum + Number(f.amount_due || 0), 0);
  const nextDue = fees[0];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Good morning, {student.parent_name || student.name}</h1>
        <p className="text-sm text-slate-500">{student.name} · Class {student.class}{student.section ? `-${student.section}` : ''}</p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onOpenAttendance} className="text-left bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{attendance?.percentage ?? 0}%</p>
              <p className="text-xs text-slate-500 mt-0.5">{attendance?.present ?? 0}/{attendance?.total ?? 0} days present</p>
            </button>
            <button onClick={onOpenFees} className="text-left bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fee Due</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">₹{totalDue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{nextDue ? `Due ${new Date(nextDue.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : 'No dues'}</p>
            </button>
          </div>

          {latestAnnouncement && (
            <button onClick={onOpenInbox} className="w-full text-left rounded-xl p-4 border" style={{ backgroundColor: '#eafaf4', borderColor: '#bfe8d6' }}>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">📢 Announcement</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{latestAnnouncement.english_text}</p>
              {latestAnnouncement.tamil_text && <p className="text-xs text-slate-500 mt-0.5">{latestAnnouncement.tamil_text}</p>}
            </button>
          )}

          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onOpenHomework} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700"><BookIcon /></div>
                <span className="text-sm font-medium text-slate-800">Homework</span>
                <ChevronRightIcon className="w-4 h-4 ml-auto text-slate-300" />
              </button>
              <button onClick={onOpenEvents} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700"><FlagIcon /></div>
                <span className="text-sm font-medium text-slate-800">Events</span>
                <ChevronRightIcon className="w-4 h-4 ml-auto text-slate-300" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-slate-400">
            <ClockIcon />
            <span className="text-sm">Timetable — coming soon</span>
          </div>
        </>
      )}
    </div>
  );
}
