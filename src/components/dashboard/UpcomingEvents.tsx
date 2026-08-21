import { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface EventItem {
  id: string;
  title: string;
  event_date: string;
  notes?: string;
}

export default function UpcomingEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchEvents = async () => {
    const res = await fetch(`${API_URL}/api/events`);
    const data = await res.json();
    setEvents(data);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const daysUntil = (dateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const upcoming = events
    .map((e) => ({ ...e, days: daysUntil(e.event_date) }))
    .filter((e) => e.days >= 0 && e.days <= 60)
    .sort((a, b) => a.days - b.days);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, event_date: eventDate, notes }),
    });
    setTitle('');
    setEventDate('');
    setNotes('');
    setShowForm(false);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API_URL}/api/events/${id}`, { method: 'DELETE' });
    fetchEvents();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Upcoming Notable Days</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium text-emerald-700 hover:underline"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 bg-slate-50 rounded-lg p-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Independence Day, PTA Meeting, Sports Day"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-emerald-700"
          >
            Save Event
          </button>
        </form>
      )}

      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-400">No notable days in the next 60 days.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{e.title}</p>
                {e.notes && <p className="text-xs text-slate-500">{e.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                  {e.days === 0 ? 'Today' : `${e.days}d`}
                </span>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-xs text-slate-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}