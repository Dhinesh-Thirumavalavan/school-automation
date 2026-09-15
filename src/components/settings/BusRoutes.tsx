import { useEffect, useState } from 'react';
import { API_URL } from '../../config';

interface Bus {
  id: string;
  bus_number: string;
  driver_name: string | null;
}
interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  stop_order: number;
}

export default function BusRoutes() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/bus`)
      .then((r) => r.json())
      .then((data) => {
        setBuses(data);
        if (data[0]) setSelectedBusId(data[0].id);
      })
      .catch(() => setBuses([]));
  }, []);

  useEffect(() => {
    if (!selectedBusId) return;
    setLoading(true);
    fetch(`${API_URL}/api/bus/${selectedBusId}/stops`)
      .then((r) => r.json())
      .then(setStops)
      .catch(() => setStops([]))
      .finally(() => setLoading(false));
  }, [selectedBusId]);

  const persistOrder = async (ordered: Stop[]) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/bus/stops/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedStopIds: ordered.map((s) => s.id) }),
      });
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    const reordered = [...stops];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setStops(reordered);
    persistOrder(reordered);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Bus Routes</h3>
      <p className="text-xs text-slate-500 mb-4">
        Reorder pickup stops to match the actual driving route. Parents add their own stop from the app — new ones land at the bottom until you move them into place.
      </p>

      {buses.length === 0 ? (
        <p className="text-sm text-slate-400">No buses set up yet.</p>
      ) : (
        <>
          <select
            value={selectedBusId}
            onChange={(e) => setSelectedBusId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bus_number}{b.driver_name ? ` — ${b.driver_name}` : ''}
              </option>
            ))}
          </select>

          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : stops.length === 0 ? (
            <p className="text-sm text-slate-400">No stops on this route yet.</p>
          ) : (
            <div className="space-y-1.5">
              {stops.map((stop, i) => (
                <div key={stop.id} className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                  <span className="text-sm text-slate-800 flex-1">{stop.name}</span>
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || saving}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === stops.length - 1 || saving}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1"
                  >
                    ▼
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
