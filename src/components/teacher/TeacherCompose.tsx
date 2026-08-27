import { useState } from 'react';
import { API_URL } from '../../config';

interface TeacherComposeProps {
  activeClass: string;
}

export default function TeacherCompose({ activeClass }: TeacherComposeProps) {
  const [englishText, setEnglishText] = useState('');
  const [tamilText, setTamilText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const handleTranslate = async () => {
    if (!englishText.trim()) return;
    setLoading(true);
    setSent(false);
    try {
      const res = await fetch(`${API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: englishText }),
      });
      const data = await res.json();
      setTamilText(data.tamilText || 'Translation failed');
    } catch (err) {
      setTamilText('Error connecting to translation server');
    } finally {
      setLoading(false);
    }
  };

  const getClassPhones = async (): Promise<string[]> => {
    const res = await fetch(`${API_URL}/api/students`);
    const students = await res.json();
    return students.filter((s: any) => s.class === activeClass).map((s: any) => s.parent_phone);
  };

  const handleSend = async () => {
    if (!englishText.trim()) return;
    setSending(true);
    try {
      const message = tamilText ? `${englishText}\n\n${tamilText}` : englishText;
      const phones = await getClassPhones();

      const res = await fetch(`${API_URL}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones, message, audience: `Class ${activeClass} Parents` }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setEnglishText('');
        setTamilText('');
        setTimeout(() => setSent(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const oversized = files.filter((f) => f.size > 16 * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`${oversized.map((f) => f.name).join(', ')} exceeds the 16MB limit.`);
      return;
    }
    setMediaFiles(files);
  };

  const handleSendMedia = async () => {
    if (mediaFiles.length === 0) return;
    setSending(true);
    try {
      const phones = await getClassPhones();
      const formData = new FormData();
      mediaFiles.forEach((file) => formData.append('media', file));
      formData.append('phones', JSON.stringify(phones));
      formData.append('caption', englishText);
      formData.append('audience', `Class ${activeClass} Parents`);

      const res = await fetch(`${API_URL}/api/send-whatsapp-media`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setMediaFiles([]);
        setEnglishText('');
        setTimeout(() => setSent(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Send Message to {activeClass} Parents</h3>

      <div className="mb-4">
        <label className="border border-dashed border-slate-300 rounded-lg p-3 text-center block cursor-pointer hover:bg-slate-50">
          <input type="file" accept="image/*,video/*" multiple onChange={handleMediaSelect} className="hidden" />
          {mediaFiles.length > 0 ? (
            <span className="text-sm text-emerald-600 font-medium">✅ {mediaFiles.length} file(s) selected</span>
          ) : (
            <span className="text-sm text-slate-500">📷 Attach class photos/videos (max 16MB each)</span>
          )}
        </label>
      </div>

      <textarea
        value={englishText}
        onChange={(e) => setEnglishText(e.target.value)}
        rows={4}
        placeholder="Type your message..."
        className="w-full border border-slate-300 rounded-lg p-3 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {tamilText && (
        <div className="bg-slate-50 rounded-lg p-3 mb-3 text-sm text-slate-700">{tamilText}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleTranslate}
          disabled={loading || !englishText.trim()}
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Translating...' : 'Translate to Tamil'}
        </button>

        {mediaFiles.length === 0 ? (
          <button
            onClick={handleSend}
            disabled={sending || !englishText.trim()}
            className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        ) : (
          <button
            onClick={handleSendMedia}
            disabled={sending}
            className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? 'Sending...' : `Send ${mediaFiles.length} File(s)`}
          </button>
        )}
      </div>

      {sent && <p className="mt-3 text-sm text-emerald-600 font-medium">✅ Sent to {activeClass} parents</p>}
    </div>
  );
}