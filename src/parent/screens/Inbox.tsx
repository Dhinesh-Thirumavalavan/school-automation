import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { AnnouncementItem } from '../types';
import { Card, EmptyState, SkeletonCard } from '../ui';
import { InboxIcon } from '../icons';

export default function Inbox() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi.announcements().then(setAnnouncements).catch(() => setAnnouncements([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-900">Announcements</h1>
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState icon={<InboxIcon className="w-5 h-5" />} title="No announcements yet" />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-500">{a.audience}</span>
                <span className="text-xs text-slate-400">{new Date(a.sent_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{a.english_text}</p>
              {a.tamil_text && <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{a.tamil_text}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
