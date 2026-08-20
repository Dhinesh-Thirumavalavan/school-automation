import { useState, useEffect } from 'react';
import { notableDays } from '../../data/notableDays';   

interface CustomEvent {
  id: string;
  title: string;
  event_date: string;
  notes?: string;
}

interface MergedItem {
  title: string;
  emoji: string;
  days: number;
  isCustom: boolean;
}

function daysUntilFromMMDD(mmdd: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [month, day] = mmdd.split('-').map(Number);
  let target = new Date(today.getFullYear(), month - 1, day);
  if (target < today) target = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntilFromDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function NotableDaysTicker() {
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/events')
      .then((res) => res.json())
      .then(setCustomEvents)
      .catch((err) => console.error('Failed to load events', err));
  }, []);

  const systemItems: MergedItem[] = notableDays
    .map((d: { title: any; emoji: any; date: string; }) => ({ title: d.title, emoji: d.emoji, days: daysUntilFromMMDD(d.date), isCustom: false }))
    .filter((d: { days: number; }) => d.days >= 0 && d.days <= 30);

  const customItems: MergedItem[] = customEvents
    .map((e) => ({ title: e.title, emoji: '📌', days: daysUntilFromDate(e.event_date), isCustom: true }))
    .filter((d) => d.days >= 0 && d.days <= 60);

  const merged = [...customItems, ...systemItems].sort((a, b) => a.days - b.days);

  if (merged.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm text-slate-400 text-center">No upcoming notable days right now.</p>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-r from-emerald-50 to-blue-50 border border-slate-200 rounded-xl p-3 overflow-hidden">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Coming Up</p>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-1">
          {merged.map((item, i) => (
            <div
              key={i}
              className="shrink-0 bg-white rounded-lg px-3 py-2 shadow-sm border border-slate-100 min-w-35"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.emoji}</span>
                <div>
                  <p className="text-xs font-medium text-slate-800 leading-tight">{item.title}</p>
                  <p className="text-[10px] text-blue-600 font-semibold">
                    {item.days === 0 ? 'Today 🎉' : `in ${item.days}d`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}