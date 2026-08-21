import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import FeeStatusBadge from './FeeStatusBadge';
import FeeFormModal from './FeeFormModal';
import RecordPaymentModal from './RecordPaymentModal';

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

  const filtered = classFilter === 'All' ? records : records.filter((r) => r.students.class === classFilter);

  const paidCount = filtered.filter((r) => r.status === 'paid').length;
  const percentPaid = filtered.length ? Math.round((paidCount / filtered.length) * 100) : 0;

  const markAsPaid = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/fees/${id}/paid`, { method: 'PUT' });
      await fetchFees();
    } catch (err) {
      console.error('Failed to mark as paid', err);
    }
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
        body: JSON.stringify({
          phones: [record.students.parent_phone],
          message: `${englishMsg}\n\n${tamilText}`,
        }),
      });
    } catch (err) {
      console.error('Failed to send reminder', err);
    }
    setTimeout(() => setReminderSent(null), 2500);
  };

  return (
    <div className="max-w-4xl">
    <div className="grid grid-cols-3 gap-2 md:flex md:gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1">
          <p className="text-sm text-slate-500">Fees Collected</p>
          <p className="text-2xl font-semibold text-emerald-600">{percentPaid}%</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1">
          <p className="text-sm text-slate-500">Students</p>
          <p className="text-2xl font-semibold text-slate-800">{filtered.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="text-2xl font-semibold text-red-600">
            {filtered.filter((r) => r.status === 'overdue').length}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Class:</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {classOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="text-xs font-medium bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
          >
            💰 Record Payment
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
          >
            + Add Fee Record
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-400">Loading fee records...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.students.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.students.class}</td>
                  <td className="px-4 py-3 text-slate-600">₹{r.amount_due.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <FeeStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.due_date}</td>
                  <td className="px-4 py-3">
                    {r.status !== 'paid' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => sendReminder(r.id, r)}
                          className="text-xs text-emerald-700 font-medium hover:underline"
                        >
                          {reminderSent === r.id ? 'Sent ✅' : 'Send Reminder'}
                        </button>
                        <button
                          onClick={() => markAsPaid(r.id)}
                          className="text-xs text-slate-500 font-medium hover:underline"
                        >
                          Mark Paid
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No fee records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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