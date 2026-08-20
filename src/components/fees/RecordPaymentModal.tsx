import { useState, useEffect } from 'react';

interface StudentResult {
  id: string;
  name: string;
  class: string;
}

interface FeeRecord {
  id: string;
  amount_due: number;
  due_date: string;
  status: string;
}

interface RecordPaymentModalProps {
  onSaved: () => void;
  onClose: () => void;
}

export default function RecordPaymentModal({ onSaved, onClose }: RecordPaymentModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<{ receipt_no: string; amount_paid: number } | null>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`http://localhost:4000/api/students/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then(setResults)
        .catch((err) => console.error(err));
    }, 250); // debounce so it doesn't fire on every keystroke
    return () => clearTimeout(timeout);
  }, [query]);

  const selectStudent = async (student: StudentResult) => {
    setSelectedStudent(student);
    setResults([]);
    setQuery(student.name);
    const res = await fetch(`http://localhost:4000/api/students/${student.id}/fees`);
    const data = await res.json();
    setFeeRecords(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee || !selectedStudent) return;
    setSaving(true);
    try {
      const res = await fetch('http://localhost:4000/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fee_record_id: selectedFee.id,
          student_id: selectedStudent.id,
          amount_paid: Number(amountPaid),
          payment_mode: paymentMode,
        }),
      });
      const data = await res.json();
      setReceipt(data);
    } catch (err) {
      console.error('Failed to record payment', err);
    } finally {
      setSaving(false);
    }
  };

  if (receipt) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Payment Recorded</h3>
          <p className="text-xs text-slate-500 mb-4">Receipt generated successfully</p>
          <div className="border border-dashed border-slate-300 rounded-lg p-4 text-left text-sm space-y-1">
            <p><span className="text-slate-500">Receipt No:</span> <span className="font-medium">{receipt.receipt_no}</span></p>
            <p><span className="text-slate-500">Student:</span> <span className="font-medium">{selectedStudent?.name}</span></p>
            <p><span className="text-slate-500">Amount:</span> <span className="font-medium">₹{receipt.amount_paid.toLocaleString()}</span></p>
            <p><span className="text-slate-500">Mode:</span> <span className="font-medium capitalize">{paymentMode}</span></p>
          </div>
          <button
            onClick={onSaved}
            className="mt-4 w-full bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Record Payment</h3>

        <label className="block text-sm font-medium text-slate-700 mb-1">Search Student</label>
        <div className="relative mb-4">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedStudent(null);
              setFeeRecords([]);
              setSelectedFee(null);
            }}
            placeholder="Type name or class..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {results.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
              {results.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectStudent(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between"
                >
                  <span className="font-medium text-slate-800">{s.name}</span>
                  <span className="text-slate-400">{s.class}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pending Fee Record</label>
              {feeRecords.length === 0 ? (
                <p className="text-xs text-slate-400">No pending fee records for this student.</p>
              ) : (
                <select
                  value={selectedFee?.id || ''}
                  onChange={(e) => {
                    const fee = feeRecords.find((f) => f.id === e.target.value) || null;
                    setSelectedFee(fee);
                    if (fee) setAmountPaid(String(fee.amount_due));
                  }}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select fee record</option>
                  {feeRecords.map((f) => (
                    <option key={f.id} value={f.id}>
                      ₹{f.amount_due.toLocaleString()} — due {f.due_date} ({f.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedFee && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? 'Recording...' : 'Record Payment'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-slate-100 text-slate-700 text-sm font-medium py-2 rounded-lg hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}