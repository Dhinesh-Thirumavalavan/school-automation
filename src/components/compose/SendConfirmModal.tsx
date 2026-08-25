interface SendConfirmModalProps {
  englishText: string;
  tamilText: string;
  mediaPreviewUrls: string[];
  mediaFiles: File[];
  voiceAudioUrl: string | null;
  audienceLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  sending: boolean;
}

export default function SendConfirmModal({
  englishText,
  tamilText,
  mediaPreviewUrls,
  mediaFiles,
  voiceAudioUrl,
  audienceLabel,
  onConfirm,
  onCancel,
  sending,
}: SendConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Confirm before sending</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Sending to</p>
            <p className="text-sm font-semibold text-slate-800">{audienceLabel}</p>
          </div>

          {mediaPreviewUrls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Attached media ({mediaPreviewUrls.length})</p>
              <div className="grid grid-cols-3 gap-2">
                {mediaPreviewUrls.map((url, i) => {
                  const isVideo = mediaFiles[i]?.type.startsWith('video');
                  return isVideo ? (
                    <video key={i} src={url} className="rounded-lg w-full h-20 object-cover" />
                  ) : (
                    <img key={i} src={url} className="rounded-lg w-full h-20 object-cover" />
                  );
                })}
              </div>
            </div>
          )}

          {voiceAudioUrl && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Voice note</p>
              <audio controls src={voiceAudioUrl} className="w-full h-8" />
            </div>
          )}

          {englishText && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">English</p>
              <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-2.5">{englishText}</p>
            </div>
          )}

          {tamilText && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Tamil</p>
              <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-2.5">{tamilText}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onConfirm}
            disabled={sending}
            className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {sending ? 'Sending...' : '✅ Confirm & Send'}
          </button>
          <button
            onClick={onCancel}
            disabled={sending}
            className="flex-1 bg-slate-100 text-slate-700 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-200 disabled:opacity-50"
          >
            Go Back & Edit
          </button>
        </div>
      </div>
    </div>
  );
}