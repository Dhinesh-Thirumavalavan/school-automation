import { useState, useEffect } from 'react';

interface MessageHistoryItem {
  id: string;
  english_text: string;
  tamil_text: string;
  audience: string;
  sent_at: string;
  total_recipients: number;
  delivered: number;
  read: number;
}

export default function MessageHistory() {
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<MessageHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:4000/api/message-history')
      .then((res) => res.json())
      .then(setMessages)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = messages.filter(
    (m) =>
      m.english_text?.toLowerCase().includes(search.toLowerCase()) ||
      m.tamil_text?.includes(search)
  );

  return (
    <div className="max-w-3xl">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search messages..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">{m.audience}</span>
                <span className="text-xs text-slate-400">
                  {new Date(m.sent_at).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-sm text-slate-800 mb-1">{m.english_text}</p>
              <p className="text-sm text-slate-500">{m.tamil_text}</p>
              <div className="flex items-center gap-4 pt-3 mt-2 border-t border-slate-100">
                <span className="text-xs text-slate-600">
                  Sent to: <span className="font-medium">{m.total_recipients}</span>
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No messages found.</p>
          )}
        </div>
      )}
    </div>
  );
}