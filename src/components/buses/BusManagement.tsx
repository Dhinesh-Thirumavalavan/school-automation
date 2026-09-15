import { useEffect, useState } from 'react';
import { API_URL } from '../../config';
import BusFormModal, { type BusFormValues } from './BusFormModal';

interface Bus {
  id: string;
  bus_number: string;
  driver_name: string | null;
  driver_phone: string | null;
  pin: string;
  tripActive: boolean;
  tripStartedAt: string | null;
  tripShift: 'morning' | 'evening' | null;
}
interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  stop_order: number;
}
interface Trip {
  id: string;
  shift: 'morning' | 'evening' | null;
  started_at: string;
  ended_at: string | null;
}

const shiftLabel = (shift: Trip['shift']) => (shift === 'morning' ? '🌅 Morning Pickup' : shift === 'evening' ? '🌆 Evening Drop' : 'Trip');
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function BusManagement() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [expandedBusId, setExpandedBusId] = useState<string | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  const loadBuses = () => {
    setLoading(true);
    fetch(`${API_URL}/api/bus`)
      .then((r) => r.json())
      .then(setBuses)
      .catch(() => setBuses([]))
      .finally(() => setLoading(false));
  };

  useEffect(loadBuses, []);

  const handleSave = async (values: BusFormValues) => {
    const url = editingBus ? `${API_URL}/api/bus/${editingBus.id}` : `${API_URL}/api/bus`;
    const method = editingBus ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    setShowForm(false);
    setEditingBus(null);
    loadBuses();
  };

  const handleDelete = async (bus: Bus) => {
    if (!confirm(`Delete ${bus.bus_number}? This also removes its stops and location history.`)) return;
    await fetch(`${API_URL}/api/bus/${bus.id}`, { method: 'DELETE' });
    if (expandedBusId === bus.id) setExpandedBusId(null);
    loadBuses();
  };

  const toggleExpand = (busId: string) => {
    if (expandedBusId === busId) {
      setExpandedBusId(null);
      return;
    }
    setExpandedBusId(busId);
    setStopsLoading(true);
    fetch(`${API_URL}/api/bus/${busId}/stops`)
      .then((r) => r.json())
      .then(setStops)
      .catch(() => setStops([]))
      .finally(() => setStopsLoading(false));

    setTripsLoading(true);
    fetch(`${API_URL}/api/bus/${busId}/trips`)
      .then((r) => r.json())
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
  };

  const moveStop = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    const reordered = [...stops];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setStops(reordered);
    await fetch(`${API_URL}/api/bus/stops/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedStopIds: reordered.map((s) => s.id) }),
    });
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Bus Tracking</h2>
          <p className="text-sm text-slate-500">{buses.length} bus{buses.length !== 1 ? 'es' : ''} · {buses.filter((b) => b.tripActive).length} on a trip right now</p>
        </div>
        <button
          onClick={() => { setEditingBus(null); setShowForm(true); }}
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          + Add Bus
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : buses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
          No buses yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {buses.map((bus) => (
            <div key={bus.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <button onClick={() => toggleExpand(bus.id)} className="flex-1 text-left flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-lg shrink-0">🚌</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{bus.bus_number}</p>
                    <p className="text-xs text-slate-500">
                      {bus.driver_name || 'No driver name set'}{bus.driver_phone ? ` · ${bus.driver_phone}` : ''}
                    </p>
                  </div>
                </button>

                {bus.tripActive ? (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    ● {shiftLabel(bus.tripShift)} {bus.tripStartedAt ? `since ${new Date(bus.tripStartedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">Not on a trip</span>
                )}

                <button onClick={() => { setEditingBus(bus); setShowForm(true); }} className="text-xs text-slate-500 hover:text-slate-800 px-2">
                  Edit
                </button>
                <button onClick={() => handleDelete(bus)} className="text-xs text-red-500 hover:text-red-700 px-2">
                  Delete
                </button>
              </div>

              {expandedBusId === bus.id && (
                <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Route stops {stops.length > 0 && `(${stops.length})`}
                    </p>
                    {stopsLoading ? (
                      <p className="text-sm text-slate-400">Loading...</p>
                    ) : stops.length === 0 ? (
                      <p className="text-sm text-slate-400">No stops yet — parents add their own from the app.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {stops.map((stop, i) => (
                          <div key={stop.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                            <span className="text-sm text-slate-800 flex-1">{stop.name}</span>
                            <button onClick={() => moveStop(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1">▲</button>
                            <button onClick={() => moveStop(i, 1)} disabled={i === stops.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1">▼</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Trip history</p>
                    {tripsLoading ? (
                      <p className="text-sm text-slate-400">Loading...</p>
                    ) : trips.length === 0 ? (
                      <p className="text-sm text-slate-400">No trips recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {trips.map((trip) => (
                          <div key={trip.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                            <span className="text-slate-800 flex-1">{shiftLabel(trip.shift)}</span>
                            <span className="text-xs text-slate-500">
                              {formatDateTime(trip.started_at)} → {trip.ended_at ? formatDateTime(trip.ended_at) : (
                                <span className="text-emerald-700 font-medium">in progress</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BusFormModal
          initial={editingBus ? { bus_number: editingBus.bus_number, driver_name: editingBus.driver_name || '', driver_phone: editingBus.driver_phone || '', pin: editingBus.pin } : undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingBus(null); }}
        />
      )}
    </div>
  );
}
