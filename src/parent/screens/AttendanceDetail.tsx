import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { AttendanceSummary, ParentStudent } from '../types';

interface AttendanceDetailProps {
  student: ParentStudent;
}

export default function AttendanceDetail({ student }: AttendanceDetailProps) {
  const [data, setData] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    parentApi.attendance(student.id).then(setData).catch(() => setData(null));
  }, [student.id]);

  if (!data) return <div className="p-4 text-sm text-slate-400">Loading...</div>;

  const pct = data.percentage;
  const ringStyle = {
    background: `conic-gradient(#059669 ${pct * 3.6}deg, #e2e8f0 0deg)`,
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col items-center py-4">
        <div className="w-36 h-36 rounded-full flex items-center justify-center" style={ringStyle}>
          <div className="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-slate-900">{pct}%</span>
            <span className="text-xs text-slate-500">present</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{data.present}</p>
          <p className="text-xs text-slate-500">Present</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-red-600">{data.absent}</p>
          <p className="text-xs text-slate-500">Absent</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-slate-800">{data.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-600 mb-2">Recent days</p>
        {data.days.length === 0 ? (
          <p className="text-sm text-slate-400">No attendance recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.days.map((d) => (
              <div key={d.date} className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className={`text-xs font-semibold ${d.status === 'present' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
