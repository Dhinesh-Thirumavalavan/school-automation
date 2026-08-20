import { useState, useEffect } from 'react';

export default function AnalyticsSummary() {
  const [studentCount, setStudentCount] = useState(0);
  const [percentPaid, setPercentPaid] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [messagesThisMonth, setMessagesThisMonth] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [studentsRes, feesRes, historyRes] = await Promise.all([
        fetch('http://localhost:4000/api/students'),
        fetch('http://localhost:4000/api/fees'),
        fetch('http://localhost:4000/api/message-history'),
      ]);
      const students = await studentsRes.json();
      const fees = await feesRes.json();
      const history = await historyRes.json();

      setStudentCount(students.length);

      const paidCount = fees.filter((f: any) => f.status === 'paid').length;
      setPercentPaid(fees.length ? Math.round((paidCount / fees.length) * 100) : 0);
      setOverdueCount(fees.filter((f: any) => f.status === 'overdue').length);

      const now = new Date();
      const thisMonthCount = history.filter((m: any) => {
        const sentDate = new Date(m.sent_at);
        return sentDate.getMonth() === now.getMonth() && sentDate.getFullYear() === now.getFullYear();
      }).length;
      setMessagesThisMonth(thisMonthCount);
    };
    fetchData().catch((err) => console.error('Failed to load analytics', err));
  }, []);

  const stats = [
    { label: 'Total Students', value: studentCount, icon: '🎓', color: 'bg-slate-100 text-slate-700' },
    { label: 'Fees Collected', value: `${percentPaid}%`, icon: '💰', color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Overdue Payments', value: overdueCount, icon: '⚠️', color: 'bg-red-100 text-red-700' },
    { label: 'Messages Sent (Month)', value: messagesThisMonth, icon: '📢', color: 'bg-blue-100 text-blue-700' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm mb-3 ${s.color}`}>
            {s.icon}
          </div>
          <p className="text-2xl font-semibold text-slate-800">{s.value}</p>
          <p className="text-xs text-slate-500 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}