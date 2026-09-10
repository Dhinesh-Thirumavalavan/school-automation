import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { FeeRecord, ParentStudent, Payment } from '../types';

interface FeesProps {
  student: ParentStudent;
}

export default function Fees({ student }: FeesProps) {
  const [due, setDue] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      parentApi.fees(student.id).catch(() => []),
      parentApi.payments(student.id).catch(() => []),
    ]).then(([dueList, paymentList]) => {
      setDue(dueList);
      setPayments(paymentList);
      setLoading(false);
    });
  }, [student.id]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-900">Fees</h1>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <>
          {due.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
              No pending dues right now.
            </div>
          ) : (
            <div className="space-y-3">
              {due.map((f) => (
                <div key={f.id} className="bg-emerald-600 text-white rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
                    Due {new Date(f.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-2xl font-extrabold mt-1">₹{Number(f.amount_due).toLocaleString('en-IN')}</p>
                  <button
                    onClick={() => setNotice(true)}
                    className="mt-3 bg-white text-emerald-700 text-sm font-semibold px-4 py-2 rounded-lg"
                  >
                    Pay Now
                  </button>
                </div>
              ))}
            </div>
          )}

          {notice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              Online payment is coming soon. Please pay at the school office for now.
              <button onClick={() => setNotice(false)} className="block text-xs mt-1 underline">Dismiss</button>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Payment History</p>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.receipt_no}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} · {p.payment_mode.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">₹{Number(p.amount_paid).toLocaleString('en-IN')}</p>
                      <span className="text-xs font-semibold text-emerald-700">PAID</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
