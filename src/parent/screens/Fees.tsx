import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { FeeRecord, ParentStudent, Payment } from '../types';
import { Card, EmptyState, SectionLabel, Skeleton } from '../ui';
import { WalletIcon } from '../icons';

interface FeesProps {
  student: ParentStudent;
}

export default function Fees({ student }: FeesProps) {
  const [due, setDue] = useState<FeeRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      parentApi.fees(student.id).catch(() => []),
      parentApi.payments(student.id).catch(() => []),
    ]).then(([dueList, paymentList]) => {
      if (cancelled) return;
      setDue(dueList);
      setPayments(paymentList);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [student.id]);

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-lg font-bold text-slate-900">Fees</h1>

      {loading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <>
          {due.length === 0 ? (
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <p className="text-sm text-emerald-800">No pending dues right now.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {due.map((f) => (
                <div key={f.id} className="bg-emerald-600 text-white rounded-2xl p-4 shadow-sm shadow-emerald-900/10">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">
                    Due {new Date(f.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-2xl font-extrabold mt-1">₹{Number(f.amount_due).toLocaleString('en-IN')}</p>
                  <button
                    onClick={() => setNotice(true)}
                    className="mt-3 bg-white text-emerald-700 text-sm font-semibold px-4 py-2 rounded-lg active:scale-[0.98] transition-transform"
                  >
                    Pay Now
                  </button>
                </div>
              ))}
            </div>
          )}

          {notice && (
            <Card className="p-3 bg-amber-50 border-amber-200">
              <p className="text-sm text-amber-800">Online payment is coming soon. Please pay at the school office for now.</p>
              <button onClick={() => setNotice(false)} className="text-xs mt-1 underline text-amber-700">Dismiss</button>
            </Card>
          )}

          <div>
            <SectionLabel>Payment History</SectionLabel>
            {payments.length === 0 ? (
              <EmptyState icon={<WalletIcon className="w-5 h-5" />} title="No payments recorded yet" />
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <Card key={p.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.receipt_no}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} · {p.payment_mode.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">₹{Number(p.amount_paid).toLocaleString('en-IN')}</p>
                      <span className="text-[11px] font-bold text-emerald-700">PAID</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
