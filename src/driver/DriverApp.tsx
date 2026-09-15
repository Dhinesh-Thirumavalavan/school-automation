import { useEffect, useRef, useState } from 'react';
import { driverApi, type DriverSession } from './api';

const LOCATION_INTERVAL_MS = 12000;

export default function DriverApp() {
  const [session, setSession] = useState<DriverSession | null>(null);
  const [busNumber, setBusNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [tripActive, setTripActive] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState('');

  const latestPosition = useRef<{ lat: number; lon: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // not supported, or permission denied — non-critical, tracking still works if the screen stays on manually
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && tripActive) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tripActive]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await driverApi.login(busNumber, pin);
      setSession(data);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, []);

  const startTrip = async () => {
    if (!session) return;
    if (!('geolocation' in navigator)) {
      setGpsError('This device/browser does not support GPS location.');
      return;
    }
    setGpsError('');
    await driverApi.startTrip(session.id);
    setTripActive(true);
    requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPosition.current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setGpsError('');
      },
      (err) => setGpsError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    const send = async () => {
      if (!latestPosition.current) return;
      try {
        await driverApi.sendLocation(session.id, latestPosition.current.lat, latestPosition.current.lon);
        setLastSent(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch {
        setGpsError('Could not reach the server — check your connection.');
      }
    };
    send();
    intervalRef.current = window.setInterval(send, LOCATION_INTERVAL_MS);
  };

  const endTrip = async () => {
    if (!session) return;
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    watchIdRef.current = null;
    intervalRef.current = null;
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    await driverApi.endTrip(session.id);
    setTripActive(false);
    setLastSent(null);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm px-4">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">
              🚌
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Kalvi Driver</h1>
            <p className="text-sm text-slate-500 mt-1">Bus Trip Tracker</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bus Number</label>
              <input
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
                placeholder="e.g. Bus 04"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PIN</label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password"
                inputMode="numeric"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-sm text-slate-500">{session.bus_number}</p>
        <h1 className="text-lg font-bold text-slate-900 mb-6">{session.driver_name || 'Driver'}</h1>

        <div
          className={`w-40 h-40 rounded-full mx-auto flex items-center justify-center mb-6 ${
            tripActive ? 'bg-emerald-100' : 'bg-slate-100'
          }`}
        >
          <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl ${tripActive ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            🚌
          </div>
        </div>

        {tripActive ? (
          <>
            <p className="text-sm font-semibold text-emerald-700 mb-1">Trip in progress</p>
            <p className="text-xs text-slate-500 mb-6">{lastSent ? `Last sent at ${lastSent}` : 'Getting GPS signal...'}</p>
            <button onClick={endTrip} className="w-full bg-red-600 text-white text-sm font-semibold py-3 rounded-xl">
              End Trip
            </button>
          </>
        ) : (
          <button onClick={startTrip} className="w-full bg-emerald-600 text-white text-sm font-semibold py-3 rounded-xl">
            Start Trip
          </button>
        )}

        {gpsError && <p className="text-xs text-red-600 mt-3">{gpsError}</p>}
        <p className="text-xs text-slate-400 mt-6">This screen stays awake automatically during a trip. Keep it open and your phone charging.</p>
      </div>
    </div>
  );
}
