import { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface StatusData {
  backendRunning: boolean;
  whatsappReady: boolean;
  databaseConnected: boolean;
  serverTime?: string;
}

export default function SystemStatus() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [checking, setChecking] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_URL}/api/system-status`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setStatus({ backendRunning: false, whatsappReady: false, databaseConnected: false });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const allGood = status?.backendRunning && status?.whatsappReady && status?.databaseConnected;
  const dotColor = checking ? 'bg-slate-300' : allGood ? 'bg-emerald-500' : 'bg-red-500';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-full shadow-lg hover:bg-slate-800"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor} ${checking ? 'animate-pulse' : ''}`}></span>
        System
      </button>

      {expanded && (
        <div className="absolute bottom-12 right-0 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-56">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-700">System Status</p>
            <button onClick={checkStatus} className="text-xs text-emerald-600 hover:underline">
              ↻ Refresh
            </button>
          </div>

          <div className="space-y-2">
            <StatusRow label="Backend" ok={status?.backendRunning} />
            <StatusRow label="WhatsApp" ok={status?.whatsappReady} />
            <StatusRow label="Database" ok={status?.databaseConnected} />
          </div>

          {!status?.whatsappReady && status?.backendRunning && (
            <p className="text-[10px] text-amber-600 mt-3">⚠️ WhatsApp may need rescanning at /qr</p>
          )}
          {!status?.backendRunning && (
            <p className="text-[10px] text-red-600 mt-3">⚠️ Backend unreachable — check Railway</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <span className={ok ? 'text-emerald-600' : 'text-red-500'}>
        {ok ? '✅ OK' : '❌ Down'}
      </span>
    </div>
  );
}