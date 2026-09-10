import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { EventItem } from '../types';

export default function EventsDetail() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi.events().then(setEvents).catch(() => setEvents([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-slate-900 mb-3">Events</h1>
      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-400">No upcoming events.</p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const date = new Date(e.event_date);
            return (
              <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold uppercase">{date.toLocaleDateString('en-IN', { month: 'short' })}</span>
                  <span className="text-sm font-bold">{date.getDate()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{e.title}</p>
                  {e.notes && <p className="text-xs text-slate-500 mt-0.5">{e.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
