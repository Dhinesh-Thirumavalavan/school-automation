import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { AnnouncementItem, AttendanceSummary, FeeRecord, ParentStudent } from '../types';
import { BookIcon, BusIcon, ChevronRightIcon, ClockIcon, FlagIcon, LeaveIcon } from '../icons';
import { Card, SectionLabel, Skeleton } from '../ui';

interface HomeProps {
  student: ParentStudent;
  onOpenAttendance: () => void;
  onOpenFees: () => void;
  onOpenHomework: () => void;
  onOpenEvents: () => void;
  onOpenBus: () => void;
  onOpenLeave: () => void;
  onOpenInbox: () => void;
}

export default function Home({ student, onOpenAttendance, onOpenFees, onOpenHomework, onOpenEvents, onOpenBus, onOpenLeave, onOpenInbox }: HomeProps) {
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<AnnouncementItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      parentApi.attendance(student.id).catch(() => null),
      parentApi.fees(student.id).catch(() => []),
      parentApi.announcements().catch(() => []),
    ]).then(([att, feeList, announcements]) => {
      if (cancelled) return;
      setAttendance(att);
      setFees(feeList);
      setLatestAnnouncement(announcements[0] || null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [student.id]);

  const totalDue = fees.reduce((sum, f) => sum + Number(f.amount_due || 0), 0);
  const nextDue = fees[0];

  return (
    <div className="p-4 space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Good morning, {student.parent_name || student.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{student.name} · Class {student.class}{student.section ? `-${student.section}` : ''}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card onClick={onOpenAttendance} className="p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Attendance</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{attendance?.percentage ?? 0}%</p>
              <p className="text-xs text-slate-500 mt-0.5">{attendance?.present ?? 0}/{attendance?.total ?? 0} days present</p>
            </Card>
            <Card onClick={onOpenFees} className="p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Fee Due</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">₹{totalDue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{nextDue ? `Due ${new Date(nextDue.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : 'No dues'}</p>
            </Card>
          </div>

          {latestAnnouncement && (
            <Card
              onClick={onOpenInbox}
              className="p-4"
            >
              <div className="rounded-xl -m-4 p-4" style={{ backgroundColor: '#eafaf4' }}>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">📢 Announcement</p>
                <p className="text-sm font-semibold text-slate-900 mt-1.5">{latestAnnouncement.english_text}</p>
                {latestAnnouncement.tamil_text && <p className="text-xs text-slate-500 mt-1">{latestAnnouncement.tamil_text}</p>}
              </div>
            </Card>
          )}

          <div>
            <SectionLabel>Quick Actions</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <Card onClick={onOpenHomework} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0"><BookIcon /></div>
                <span className="text-sm font-medium text-slate-800">Homework</span>
                <ChevronRightIcon className="w-4 h-4 ml-auto text-slate-300 shrink-0" />
              </Card>
              <Card onClick={onOpenEvents} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0"><FlagIcon /></div>
                <span className="text-sm font-medium text-slate-800">Events</span>
                <ChevronRightIcon className="w-4 h-4 ml-auto text-slate-300 shrink-0" />
              </Card>
              <Card onClick={onOpenBus} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0"><BusIcon /></div>
                <span className="text-sm font-medium text-slate-800">Bus</span>
                <ChevronRightIcon className="w-4 h-4 ml-auto text-slate-300 shrink-0" />
              </Card>
              <Card onClick={onOpenLeave} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0"><LeaveIcon /></div>
                <span className="text-sm font-medium text-slate-800">Leave</span>
                <ChevronRightIcon className="w-4 h-4 ml-auto text-slate-300 shrink-0" />
              </Card>
            </div>
          </div>

          <Card className="p-4 flex items-center gap-3 text-slate-400">
            <ClockIcon />
            <span className="text-sm">Timetable — coming soon</span>
          </Card>
        </>
      )}
    </div>
  );
}
