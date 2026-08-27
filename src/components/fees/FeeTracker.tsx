import { useState, useEffect } from 'react';
import FeeFormModal from './FeeFormModal';
import RecordPaymentModal from './RecordPaymentModal';
import { API_URL } from '../../config';

interface FeeRecordFromDB {
  id: string;
  student_id: string;
  amount_due: number;
  status: 'paid' | 'unpaid' | 'overdue';
  due_date: string;
  students: { name: string; class: string; parent_phone: string };
}

const classOptions = ['All', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];

export default function FeeTracker() {
  const [records, setRecords] = useState<FeeRecordFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderSent, setReminderSent] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/fees`);
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load fees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const filtered = records
    .filter((r) => classFilter === 'All' || r.students.class === classFilter)
    .filter((r) => statusFilter === 'all' || r.status === statusFilter)
    .filter((r) => r.students.name.toLowerCase().includes(search.toLowerCase()));

  const totalDue = filtered.reduce((sum, r) => sum + r.amount_due, 0);
  const totalCollected = filtered.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.amount_due, 0);
  const collectionPercent = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0;

  const paidCount = filtered.filter((r) => r.status === 'paid').length;
  const unpaidCount = filtered.filter((r) => r.status === 'unpaid').length;
  const overdueCount = filtered.filter((r) => r.status === 'overdue').length;

  const markAsPaid = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/fees/${id}/paid`, { method: 'PUT' });
      await fetchFees();
    } catch (err) {
      console.error('Failed to mark as paid', err);
    }
  };

  const exportToCSV = () => {
  const headers = ['Student', 'Class', 'Amount Due', 'Status', 'Due Date'];
  const rows = filtered.map((r) => [r.students.name, r.students.class, r.amount_due, r.status, r.due_date]);
  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fee-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

  const sendReminder = async (id: string, record: FeeRecordFromDB) => {
    setReminderSent(id);
    try {
      const englishMsg = `Reminder: Fee of ₹${record.amount_due} for ${record.students.name} is pending. Please pay at the earliest.`;
      const translateRes = await fetch(`${API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: englishMsg }),
      });
      const { tamilText } = await translateRes.json();
      await fetch(`${API_URL}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones: [record.students.parent_phone], message: `${englishMsg}\n\n${tamilText}` }),
      });
    } catch (err) {
      console.error('Failed to send reminder', err);
    }
    setTimeout(() => setReminderSent(null), 2500);
  };

  const statusStyles: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    unpaid: 'bg-amber-100 text-amber-700 border-amber-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="max-w-5xl space-y-5">
      {/* Collection progress hero card */}
      <div className="bg-linear-to-r from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-emerald-100 text-xs font-medium">Fee Collection Progress</p>
            <p className="text-3xl font-bold">{collectionPercent}%</p>
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-xs">Collected / Total</p>
            <p className="text-lg font-semibold">₹{totalCollected.toLocaleString()} / ₹{totalDue.toLocaleString()}</p>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2.5">
          <div className="bg-white h-2.5 rounded-full transition-all duration-500" style={{ width: `${collectionPercent}%` }} />
        </div>
      </div>

      {/* Status breakdown cards */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
          className={`text-left bg-white border rounded-xl p-4 hover:shadow-md transition-shadow ${statusFilter === 'paid' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'}`}
        >
          <p className="text-2xl font-bold text-emerald-600">{paidCount}</p>
          <p className="text-xs text-slate-500 mt-1">✅ Paid</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'unpaid' ? 'all' : 'unpaid')}
          className={`text-left bg-white border rounded-xl p-4 hover:shadow-md transition-shadow ${statusFilter === 'unpaid' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}
        >
          <p className="text-2xl font-bold text-amber-600">{unpaidCount}</p>
          <p className="text-xs text-slate-500 mt-1">⏳ Unpaid</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
          className={`text-left bg-white border rounded-xl p-4 hover:shadow-md transition-shadow ${statusFilter === 'overdue' ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'}`}
        >
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-xs text-slate-500 mt-1">🚨 Overdue</p>
        </button>
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student..."
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-35 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {classOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={() => setShowPaymentModal(true)} className="text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800">
          💰 Record Payment
        </button>
        <button onClick={() => setShowForm(true)} className="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700">
          + Add Fee Record
        </button>
        <button onClick={exportToCSV} className="text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200">
  📥 Export CSV
</button>
      </div>

      {/* Fee record cards */}
      {loading ? (
        <div className="p-6 text-center text-sm text-slate-400">Loading fee records...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400 bg-white border border-slate-200 rounded-xl">No fee records match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.students.name}</p>
                  <p className="text-xs text-slate-500">{r.students.class}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusStyles[r.status]}`}>
                  {r.status === 'paid' ? '✅ Paid' : r.status === 'overdue' ? '🚨 Overdue' : '⏳ Unpaid'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-lg font-bold text-slate-800">₹{r.amount_due.toLocaleString()}</span>
                <span className="text-xs text-slate-500">Due {r.due_date}</span>
              </div>

              {r.status !== 'paid' && (
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => sendReminder(r.id, r)}
                    className="flex-1 text-xs font-medium text-emerald-700 bg-emerald-50 py-1.5 rounded-lg hover:bg-emerald-100"
                  >
                    {reminderSent === r.id ? '✅ Sent' : '📩 Send Reminder'}
                  </button>
                  <button
                    onClick={() => markAsPaid(r.id)}
                    className="flex-1 text-xs font-medium text-slate-600 bg-slate-50 py-1.5 rounded-lg hover:bg-slate-100"
                  >
                    Mark Paid
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <FeeFormModal
          onSave={() => {
            setShowForm(false);
            fetchFees();
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {showPaymentModal && (
        <RecordPaymentModal
          onSaved={() => {
            setShowPaymentModal(false);
            fetchFees();
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}