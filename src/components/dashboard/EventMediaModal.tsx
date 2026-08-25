import { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface EventMediaItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string;
}

interface EventMediaModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

export default function EventMediaModal({ eventId, eventTitle, onClose }: EventMediaModalProps) {
  const [media, setMedia] = useState<EventMediaItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const fetchMedia = async () => {
    const res = await fetch(`${API_URL}/api/events/${eventId}/media`);
    const data = await res.json();
    setMedia(data);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('media', f));
      formData.append('caption', caption);
      await fetch(`${API_URL}/api/events/${eventId}/media`, { method: 'POST', body: formData });
      setFiles([]);
      setCaption('');
      await fetchMedia();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSending(true);
    try {
      const studentsRes = await fetch(`${API_URL}/api/students`);
      const students = await studentsRes.json();
      const phones = students.map((s: any) => s.parent_phone);

      await fetch(`${API_URL}/api/events/${eventId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones, mediaIds: Array.from(selected) }),
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">{eventTitle} — Photos & Videos</h3>

        <label className="border border-dashed border-slate-300 rounded-lg p-3 text-center block cursor-pointer hover:bg-slate-50 mb-2">
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="hidden"
          />
          <span className="text-sm text-slate-500">
            {files.length > 0 ? `${files.length} file(s) selected` : '📷 Add photos/videos'}
          </span>
        </label>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full bg-slate-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 mb-4"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>

        {media.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-500 mb-2">Select photos/videos to send:</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {media.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleSelect(m.id)}
                  className={`relative rounded-lg overflow-hidden border-2 ${
                    selected.has(m.id) ? 'border-emerald-500' : 'border-transparent'
                  }`}
                >
                  {m.media_type === 'video' ? (
                    <video src={m.media_url} className="w-full h-20 object-cover" />
                  ) : (
                    <img src={m.media_url} className="w-full h-20 object-cover" />
                  )}
                  {selected.has(m.id) && (
                    <span className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              className="w-full bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : `Send ${selected.size} Selected to All Parents`}
            </button>
            {sent && <p className="text-sm text-emerald-600 font-medium text-center mt-2">✅ Sent!</p>}
          </>
        )}

        <button onClick={onClose} className="w-full mt-3 text-xs text-slate-500 hover:underline">
          Close
        </button>
      </div>
    </div>
  );
}