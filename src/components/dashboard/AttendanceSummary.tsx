import { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface ClassSummary {
  class: string;
  total: number;
  present: number;
  absent: number;
  unmarked: number;
}

export default function AttendanceSummary() {
  const [summary, setSummary] = useState<ClassSummary[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/attendance/summary?date=${date}`);
      const data = await res.json();
      setSummary(data.summary || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [date]);

  const totals = summary.reduce(
    (acc, c) => ({
      total: acc.total + c.total,
      present: acc.present + c.present,
      absent: acc.absent + c.absent,
      unmarked: acc.unmarked + c.unmarked,
    }),
    { total: 0, present: 0, absent: 0, unmarked: 0 }
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Attendance Overview</h3>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : summary.length === 0 ? (
        <p className="text-sm text-slate-400">No student data available.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-emerald-50 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-emerald-700">{totals.present}</p>
              <p className="text-[10px] text-emerald-600">Present</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-red-700">{totals.absent}</p>
              <p className="text-[10px] text-red-600">Absent</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-slate-600">{totals.unmarked}</p>
              <p className="text-[10px] text-slate-500">Not marked</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {summary.map((c) => (
              <div key={c.class} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                <span className="font-medium text-slate-700">Class {c.class}</span>
                <div className="flex gap-3">
                  <span className="text-emerald-600">✓ {c.present}</span>
                  <span className="text-red-600">✕ {c.absent}</span>
                  {c.unmarked > 0 && <span className="text-slate-400">— {c.unmarked}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}