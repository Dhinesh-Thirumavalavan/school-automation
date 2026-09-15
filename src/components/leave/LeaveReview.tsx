import { useEffect, useState } from 'react';
import { API_URL } from '../../config';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  students: { name: string; class: string; section: string | null } | null;
}

const filters = ['pending', 'approved', 'rejected', 'all'] as const;
type Filter = (typeof filters)[number];

const statusStyles: Record<LeaveRequest['status'], string> = {
  pending: 'text-amber-700 bg-amber-50',
  approved: 'text-emerald-700 bg-emerald-50',
  rejected: 'text-red-700 bg-red-50',
};

export default function LeaveReview() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`${API_URL}/api/leave`)
      .then((r) => r.json())
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setActingOn(id);
    try {
      await fetch(`${API_URL}/api/leave/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewed_by: 'Admin' }),
      });
      load();
    } finally {
      setActingOn(null);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Leave Requests</h2>
        <p className="text-sm text-slate-500">{pendingCount} pending review</p>
      </div>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize ${
              filter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
          No {filter !== 'all' ? filter : ''} leave requests.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {req.students?.name || 'Unknown student'}
                    {req.students && <span className="text-slate-400 font-normal"> · Class {req.students.class}{req.students.section ? `-${req.students.section}` : ''}</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {req.leave_type} · {new Date(req.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    {req.end_date !== req.start_date && ` – ${new Date(req.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyles[req.status]}`}>{req.status}</span>
              </div>

              {req.reason && <p className="text-sm text-slate-700 mb-2">{req.reason}</p>}

              {req.attachment_url && (
                <a href={req.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 underline">
                  📎 View attachment
                </a>
              )}

              {req.status === 'pending' ? (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => decide(req.id, 'approved')}
                    disabled={actingOn === req.id}
                    className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide(req.id, 'rejected')}
                    disabled={actingOn === req.id}
                    className="flex-1 border border-red-300 text-red-600 text-sm font-medium py-2 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                req.reviewed_by && (
                  <p className="text-xs text-slate-400 mt-2">
                    Reviewed by {req.reviewed_by}{req.reviewed_at ? ` on ${new Date(req.reviewed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : ''}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
