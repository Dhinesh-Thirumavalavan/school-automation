import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { AttendanceSummary, ParentStudent } from '../types';
import { Card, SectionLabel, Skeleton } from '../ui';

interface AttendanceDetailProps {
  student: ParentStudent;
}

export default function AttendanceDetail({ student }: AttendanceDetailProps) {
  const [data, setData] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    parentApi.attendance(student.id).then(setData).catch(() => setData(null));
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
        <SectionLabel>Recent days</SectionLabel>
        {data.days.length === 0 ? (
          <p className="text-sm text-slate-400">No attendance recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.days.map((d) => (
              <Card key={d.date} className="px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className={`text-xs font-semibold ${d.status === 'present' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
