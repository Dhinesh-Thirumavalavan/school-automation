import { useState } from 'react';
import VoiceNoteInput from './VoiceNoteInput';
import SendConfirmModal from './SendConfirmModal';
import { API_URL } from '../../config';

export default function ComposeBroadcast() {
  const [englishText, setEnglishText] = useState('');
  const [tamilText, setTamilText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [clarityIssue, setClarityIssue] = useState<string | null>(null);
  const [messageStatus, setMessageStatus] = useState<'idle' | 'sending' | 'sent' | 'delivered' | 'read'>('idle');
  const [showConfirm, setShowConfirm] = useState(false);

  const classListOptions = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [audienceMode, setAudienceMode] = useState<'all' | 'class' | 'unpaid'>('all');

  const quickTemplates = [
    'Tomorrow is a holiday for all classes.',
    'Tomorrow is a half working day, timing 9.00am to 12.00 noon.',
    'You are requested to pay the pending fees at the earliest.',
  ];

  const quickEmojis = ['🎉', '📢', '🙏', '💰', '🎂', '✅', '⏰', '📌'];

  const insertEmoji = (emoji: string) => {
    setEnglishText((prev) => prev + emoji);
  };

  const toggleClass = (cls: string) => {
    setSelectedClasses((prev) => (prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]));
  };

  const getRecipientPhones = async (): Promise<string[]> => {
    const studentsRes = await fetch(`${API_URL}/api/students`);
    const students = await studentsRes.json();

    if (audienceMode === 'all') return students.map((s: any) => s.parent_phone);
    if (audienceMode === 'class') return students.filter((s: any) => selectedClasses.includes(s.class)).map((s: any) => s.parent_phone);
    if (audienceMode === 'unpaid') {
      const feesRes = await fetch(`${API_URL}/api/fees`);
      const fees = await feesRes.json();
      const unpaidPhones = fees.filter((f: any) => f.status !== 'paid').map((f: any) => f.students.parent_phone);
      return [...new Set(unpaidPhones)] as string[];
    }
    return [];
  };

  const getAudienceLabel = (): string => {
    if (audienceMode === 'all') return 'All Parents';
    if (audienceMode === 'unpaid') return 'Unpaid Fees only';
    if (audienceMode === 'class') return `Class ${selectedClasses.join(', ')} Parents`;
    return 'Custom';
  };

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
      if (clarityData.hasIssue) {
        setClarityIssue(clarityData.suggestion);
      }
    } catch (err) {
      setTamilText('Error connecting to translation server');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!englishText.trim()) return;
    setSending(true);
    setMessageStatus('sending');
    try {
      const message = tamilText ? `${englishText}\n\n${tamilText}` : englishText;
      const phones = await getRecipientPhones();

      const res = await fetch(`${API_URL}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones, message, audience: getAudienceLabel() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessageStatus('sent');
        setTimeout(() => setMessageStatus('delivered'), 800);
        setTimeout(() => setMessageStatus('read'), 2200);
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setMessageStatus('idle');
        }, 5000);
      } else {
        setMessageStatus('idle');
      }
    } catch (err) {
      console.error(err);
      setMessageStatus('idle');
    } finally {
      setSending(false);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const oversized = files.filter((f) => f.size > 16 * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`${oversized.map((f) => f.name).join(', ')} exceeds the 16MB limit. Please choose smaller files.`);
      return;
    }

    setMediaFiles(files);
    setMediaPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSendMedia = async () => {
    if (mediaFiles.length === 0) return;
    setSending(true);
    try {
      const phones = await getRecipientPhones();
      const formData = new FormData();
      mediaFiles.forEach((file) => formData.append('media', file));
      formData.append('phones', JSON.stringify(phones));
      formData.append('caption', englishText);
      formData.append('audience', getAudienceLabel());

      const res = await fetch(`${API_URL}/api/send-whatsapp-media`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setMediaFiles([]);
        setMediaPreviewUrls([]);
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl">
      <div>
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-600 mb-2">Quick templates</p>
          <div className="flex flex-wrap gap-2">
            {quickTemplates.map((t, i) => (
              <button key={i} onClick={() => setEnglishText(t)} className="text-xs px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100">
                {t.length > 40 ? t.slice(0, 40) + '...' : t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-slate-600 mb-2">Or send a voice note instead</p>
          <VoiceNoteInput
            onTranscribed={(text, audioUrl) => {
              setEnglishText(text);
              setVoiceAudioUrl(audioUrl);
            }}
          />
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-slate-600 mb-2">Or attach photo(s)/video(s)</p>
          <label className="border border-dashed border-slate-300 rounded-lg p-4 text-center block cursor-pointer hover:bg-slate-50">
            <input type="file" accept="image/*,video/*" multiple onChange={handleMediaSelect} className="hidden" />
            {mediaFiles.length > 0 ? (
              <span className="text-sm text-emerald-600 font-medium">✅ {mediaFiles.length} file{mediaFiles.length > 1 ? 's' : ''} selected</span>
            ) : (
              <span className="text-sm text-slate-500">
                📷 Click to attach photo(s) or video(s) <span className="text-slate-400">(max 16MB each)</span>
              </span>
            )}
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Send to</label>
          <div className="flex gap-2 mb-2">
            {(['all', 'class', 'unpaid'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAudienceMode(mode)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  audienceMode === mode ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {mode === 'all' ? 'All Parents' : mode === 'class' ? 'Specific Class(es)' : 'Unpaid Fees'}
              </button>
            ))}
          </div>

          {audienceMode === 'class' && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {classListOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleClass(c)}
                  className={`text-xs px-2.5 py-1 rounded-md border ${
                    selectedClasses.includes(c) ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1">Announcement (English)</label>

        <div className="flex gap-1.5 mb-2">
          {quickEmojis.map((e) => (
            <button key={e} type="button" onClick={() => insertEmoji(e)} className="text-lg hover:scale-110 transition-transform">
              {e}
            </button>
          ))}
        </div>

        <textarea
          value={englishText}
          onChange={(e) => setEnglishText(e.target.value)}
          rows={4}
          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Type your announcement here..."
        />

        {clarityIssue && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
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

        <button
          onClick={handleTranslate}
          disabled={loading || !englishText.trim()}
          className="mt-3 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Translating...' : 'Translate to Tamil'}
        </button>

        {englishText && mediaFiles.length === 0 && (
          <button onClick={() => setShowConfirm(true)} disabled={sending} className="mt-3 ml-3 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
            Review & Send
          </button>
        )}

        {mediaFiles.length > 0 && (
          <button onClick={() => setShowConfirm(true)} disabled={sending} className="mt-3 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
            Review & Send {mediaFiles.length} File{mediaFiles.length > 1 ? 's' : ''}
          </button>
        )}

        {sent && <p className="mt-3 text-sm text-emerald-600 font-medium">✅ Message sent to {getAudienceLabel()}</p>}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-600 mb-2">Parent Preview (WhatsApp)</p>
        <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <div className="bg-emerald-700 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm">
              🏫
            </div>
            <div>
              <p className="text-white text-sm font-medium">E.A.S. Academy Parents</p>
              <p className="text-emerald-100 text-xs">{getAudienceLabel()}</p>
            </div>
          </div>

          <div
            className="p-4 min-h-70"
            style={{
              backgroundColor: '#e5ddd5',
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)',
              backgroundSize: '16px 16px',
            }}
          >
            {mediaPreviewUrls.length > 0 && (
              <div className="bg-white rounded-lg rounded-tl-none px-2 py-2 mb-2 max-w-[85%] shadow-sm">
                <div className="grid grid-cols-2 gap-1">
                  {mediaPreviewUrls.slice(0, 4).map((url, i) => {
                    const isVideo = mediaFiles[i]?.type.startsWith('video');
                    return isVideo ? (
                      <video key={i} src={url} className="rounded-lg w-full h-20 object-cover" />
                    ) : (
                      <img key={i} src={url} className="rounded-lg w-full h-20 object-cover" />
                    );
                  })}
                </div>
                {mediaPreviewUrls.length > 4 && <p className="text-xs text-slate-400 mt-1">+{mediaPreviewUrls.length - 4} more</p>}
                {englishText && <p className="text-sm text-slate-800 mt-1">{englishText}</p>}
              </div>
            )}

            {voiceAudioUrl && (
              <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 mb-2 max-w-[85%] shadow-sm flex items-center gap-2">
                <span className="text-emerald-600 text-lg">▶️</span>
                <audio controls src={voiceAudioUrl} className="h-8 max-w-45" />
                <p className="text-[10px] text-slate-400">{timeLabel}</p>
              </div>
            )}

            {englishText && mediaFiles.length === 0 && (
              <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 mb-2 max-w-[85%] shadow-sm">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{englishText}</p>
                <p className="text-[10px] text-slate-400 text-right mt-1">{timeLabel}</p>
              </div>
            )}

            {tamilText && (
              <div className="bg-[#dcf8c6] rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{tamilText}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <p className="text-[10px] text-slate-500">{timeLabel}</p>
                  {messageStatus === 'sending' && <span className="text-[10px] text-slate-400">🕐</span>}
                  {messageStatus === 'sent' && <span className="text-[11px] text-slate-500">✓</span>}
                  {messageStatus === 'delivered' && <span className="text-[11px] text-slate-500">✓✓</span>}
                  {messageStatus === 'read' && <span className="text-[11px] text-blue-500">✓✓</span>}
                </div>
              </div>
            )}

            {!englishText && mediaFiles.length === 0 && (
              <p className="text-xs text-slate-500 text-center mt-20">Your message will preview here as you type</p>
            )}
          </div>

          {messageStatus !== 'idle' && (
            <div className="bg-white px-4 py-2 border-t border-slate-100 flex items-center gap-2">
              {messageStatus === 'sending' && (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <p className="text-xs text-slate-500">Sending to {getAudienceLabel()}...</p>
                </>
              )}
              {messageStatus === 'sent' && (
                <>
                  <span className="text-emerald-600">✓</span>
                  <p className="text-xs text-slate-600">Sent</p>
                </>
              )}
              {messageStatus === 'delivered' && (
                <>
                  <span className="text-slate-500">✓✓</span>
                  <p className="text-xs text-slate-600">Delivered</p>
                </>
              )}
              {messageStatus === 'read' && (
                <>
                  <span className="text-blue-500">✓✓</span>
                  <p className="text-xs text-emerald-600 font-medium">Read by parents</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <SendConfirmModal
          englishText={englishText}
          tamilText={tamilText}
          mediaPreviewUrls={mediaPreviewUrls}
          mediaFiles={mediaFiles}
          voiceAudioUrl={voiceAudioUrl}
          audienceLabel={getAudienceLabel()}
          sending={sending}
          onCancel={() => setShowConfirm(false)}
          onConfirm={async () => {
            if (mediaFiles.length > 0) {
              await handleSendMedia();
            } else {
              await handleSend();
            }
            setShowConfirm(false);
          }}
        />
      )}
    </div>
  );
}