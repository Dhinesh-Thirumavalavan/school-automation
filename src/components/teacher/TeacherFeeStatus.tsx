import { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface FeeItem {
  id: string;
  amount_due: number;
  status: string;
  due_date: string;
  students: { name: string };
}

export default function TeacherFeeStatus({ activeClass }: { activeClass: string }) {
  const [fees, setFees] = useState<FeeItem[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/fees/by-class/${activeClass}`)
      .then((res) => res.json())
      .then(setFees)
      .catch(console.error);
  }, [activeClass]);

  const statusColor: Record<string, string> = {
    paid: 'text-emerald-600 bg-emerald-50',
    unpaid: 'text-amber-600 bg-amber-50',
    overdue: 'text-red-600 bg-red-50',
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Fee Status — {activeClass} (view only)</h3>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Student</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fees.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-2 font-medium text-slate-800">{f.students.name}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColor[f.status]}`}>{f.status}</span>
                </td>
              </tr>
            ))}
            {fees.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400">No fee records for this class.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}