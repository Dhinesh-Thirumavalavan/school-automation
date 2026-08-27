import { useState } from 'react';
import { API_URL } from '../../config';

interface TeacherComposeProps {
  activeClass: string;
}

const quickTemplates = [
  'Tomorrow is a holiday for all classes.',
  'Please send your child in uniform tomorrow.',
  'Parent-teacher meeting scheduled this Friday.',
  'Bring notebooks for tomorrow\'s test.',
  'Field trip permission slip due tomorrow.',
];

export default function TeacherCompose({ activeClass }: TeacherComposeProps) {
  const [englishText, setEnglishText] = useState('');
  const [tamilText, setTamilText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [clarityIssue, setClarityIssue] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!englishText.trim()) return;
    setLoading(true);
    setSent(false);
    setClarityIssue(null);
    try {
      const [translateRes, clarityRes] = await Promise.all([
        fetch(`${API_URL}/api/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: englishText }),
        }),
        fetch(`${API_URL}/api/check-clarity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: englishText }),
        }),
      ]);
      const translateData = await translateRes.json();
      setTamilText(translateData.tamilText || 'Translation failed');
      const clarityData = await clarityRes.json();
      if (clarityData.hasIssue) setClarityIssue(clarityData.suggestion);
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

  const now = new Date();
  const timeLabel = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className="mb-3">
          <p className="text-xs font-medium text-slate-600 mb-2">Quick templates</p>
          <div className="flex flex-wrap gap-2">
            {quickTemplates.map((t, i) => (
              <button key={i} onClick={() => setEnglishText(t)} className="text-xs px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100">
                {t.length > 30 ? t.slice(0, 30) + '...' : t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
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

        {clarityIssue && (
          <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-800 mb-1">💡 Suggestion for clarity:</p>
            <p className="text-sm text-amber-900 mb-2">{clarityIssue}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEnglishText(clarityIssue);
                  setClarityIssue(null);
                }}
                className="text-xs bg-amber-600 text-white px-2.5 py-1 rounded hover:bg-amber-700"
              >
                Use this instead
              </button>
              <button onClick={() => setClarityIssue(null)} className="text-xs text-amber-700 hover:underline">
                Keep my version
              </button>
            </div>
          </div>
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

      <div>
        <p className="text-xs font-medium text-slate-600 mb-2">Parent Preview (WhatsApp)</p>
        <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <div className="bg-emerald-700 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">🏫</div>
            <div>
              <p className="text-white text-sm font-medium">E.A.S. Academy Parents</p>
              <p className="text-emerald-100 text-xs">Class {activeClass}</p>
            </div>
          </div>
          <div
            className="p-4 min-h-55"
            style={{
              backgroundColor: '#e5ddd5',
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)',
              backgroundSize: '16px 16px',
            }}
          >
            {englishText && (
              <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 mb-2 max-w-[85%] shadow-sm">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{englishText}</p>
                <p className="text-[10px] text-slate-400 text-right mt-1">{timeLabel}</p>
              </div>
            )}
            {tamilText && (
              <div className="bg-[#dcf8c6] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{tamilText}</p>
                <p className="text-[10px] text-slate-500 text-right mt-1">{timeLabel} ✓✓</p>
              </div>
            )}
            {!englishText && (
              <p className="text-xs text-slate-500 text-center mt-16">Message preview appears here</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}