import { useState, useRef } from 'react';

interface VoiceNoteInputProps {
  onTranscribed: (text: string, audioUrl: string) => void;
}

export default function VoiceNoteInput({ onTranscribed }: VoiceNoteInputProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sendForTranscription = async (blob: Blob, name: string) => {
    setProcessing(true);
    setFileName(name);
    const audioUrl = URL.createObjectURL(blob);
    try {
      const formData = new FormData();
      formData.append('audio', blob, name);

      const res = await fetch('http://localhost:4000/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      onTranscribed(data.text || 'Transcription failed', audioUrl);
    } catch (err) {
      onTranscribed('Error connecting to transcription server', audioUrl);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sendForTranscription(file, file.name);
  };

  const handleRecordToggle = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        sendForTranscription(blob, 'voice-note.webm');
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    }
  };

  return (
    <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {!processing && !fileName && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleRecordToggle}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg ${
              recording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🎙️ {recording ? 'Recording... tap to stop' : 'Record voice note'}
          </button>
          <span className="text-xs text-slate-400">or</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            📎 Upload audio file
          </button>
        </div>
      )}

      {processing && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-2">
          <span className="animate-spin">⏳</span>
          Transcribing voice note{fileName ? ` (${fileName})` : ''}...
        </div>
      )}

    {!processing && fileName && (
  <div className="flex items-center justify-center gap-3">
    <span className="text-sm text-emerald-600 font-medium py-2">
      ✅ Transcribed from {fileName}
    </span>
    <button
      onClick={() => setFileName(null)}
      className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
    >
      🔄 Record Again
    </button>
  </div>
)}
    </div>
  );
}