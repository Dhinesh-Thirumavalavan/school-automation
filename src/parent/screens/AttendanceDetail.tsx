import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { AttendanceSummary, ParentStudent } from '../types';
import { Card, SectionLabel, Skeleton } from '../ui';

interface AttendanceDetailProps {
  student: ParentStudent;
}

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const toDateKey = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function AttendanceCalendar({ days }: { days: { date: string; status: string }[] }) {
  const statusByDate = new Map(days.map((d) => [d.date, d.status]));
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const todayKey = toDateKey(year, month, today.getDate());

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <p className="text-sm font-semibold text-slate-800 mb-2">
        {today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekdayLabels.map((w, i) => (
          <span key={i} className="text-[10px] font-semibold text-slate-400">{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = toDateKey(year, month, day);
          const status = statusByDate.get(key);
          const isToday = key === todayKey;
          const bg = status === 'present' ? 'bg-emerald-500 text-white' : status === 'absent' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500';
          return (
            <div
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${bg} ${isToday ? 'ring-2 ring-offset-1 ring-emerald-700' : ''}`}
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Absent</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200" /> No record</span>
      </div>
    </div>
  );
}

export default function AttendanceDetail({ student }: AttendanceDetailProps) {
  const [data, setData] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    parentApi.attendance(student.id, 60).then(setData).catch(() => setData(null));
  }, [student.id]);

  if (!data) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-36 w-36 rounded-full mx-auto" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    );
  }

  const pct = data.percentage;
  const ringStyle = {
    background: `conic-gradient(#059669 ${pct * 3.6}deg, #e2e8f0 0deg)`,
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex flex-col items-center py-2">
        <div className="w-36 h-36 rounded-full flex items-center justify-center shadow-inner" style={ringStyle}>
          <div className="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center shadow-sm">
            <span className="text-3xl font-extrabold text-slate-900">{pct}%</span>
            <span className="text-xs text-slate-500">present</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{data.present}</p>
          <p className="text-xs text-slate-500">Present</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-red-600">{data.absent}</p>
          <p className="text-xs text-slate-500">Absent</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-slate-800">{data.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </Card>
      </div>

      <div>
        <SectionLabel>Calendar</SectionLabel>
        <Card className="p-4">
          <AttendanceCalendar days={data.days} />
        </Card>
      </div>
    </div>
  );
}
