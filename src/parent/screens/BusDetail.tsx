import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_URL } from '../../config';
import { Card, EmptyState, Skeleton } from '../ui';
import type { ParentStudent } from '../types';

const POLL_INTERVAL_MS = 8000;
const ASSUMED_SPEED_KMH = 20;
const DEFAULT_CENTER: [number, number] = [13.0827, 80.2707]; // Chennai, used only if geolocation is unavailable

interface Bus {
  id: string;
  bus_number: string;
  driver_name: string | null;
}
interface Stop {
  id: string;
  bus_id: string;
  name: string;
  latitude: number;
  longitude: number;
}
interface Assignment {
  busAssigned: boolean;
  stopAssigned: boolean;
  bus?: Bus;
  stop?: Stop;
}
interface LiveLocation {
  location: { latitude: number; longitude: number; recorded_at: string } | null;
  tripActive: boolean;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const busIcon = L.divIcon({
  html: '<div style="font-size:22px;line-height:1;transform:translate(-50%,-50%)">🚌</div>',
  className: '',
  iconSize: [0, 0],
});
const pinIcon = L.divIcon({
  html: '<div style="font-size:26px;line-height:1;transform:translate(-50%,-90%)">📍</div>',
  className: '',
  iconSize: [0, 0],
});

interface BusDetailProps {
  student: ParentStudent;
}

export default function BusDetail({ student }: BusDetailProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  const refresh = () => {
    fetch(`${API_URL}/api/bus/by-student/${student.id}`)
      .then((r) => r.json())
      .then(setAssignment)
      .catch(() => setAssignment({ busAssigned: false, stopAssigned: false }));
  };

  useEffect(refresh, [student.id]);

  if (!assignment) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!assignment.busAssigned) {
    return (
      <div className="p-4">
        <EmptyState icon={<span className="text-lg">🚌</span>} title="Not enrolled for bus transport yet — contact the school office" />
      </div>
    );
  }

  if (!assignment.stopAssigned) {
    return <PickupPointPicker student={student} bus={assignment.bus!} onSaved={refresh} />;
  }

  return <LiveBusView student={student} bus={assignment.bus!} stop={assignment.stop!} />;
}

function PickupPointPicker({ student, bus, onSaved }: { student: ParentStudent; bus: Bus; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const placeMarker = (lat: number, lon: number) => {
    setPosition({ lat, lon });
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      markerRef.current = L.marker([lat, lon], { icon: pinIcon, draggable: true }).addTo(mapRef.current);
      markerRef.current.on('dragend', () => {
        const ll = markerRef.current!.getLatLng();
        setPosition({ lat: ll.lat, lon: ll.lng });
      });
    }
    mapRef.current.panTo([lat, lon]);
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = L.map(mapContainer.current).setView(DEFAULT_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const useCurrentLocation = () => {
    setError('');
    if (!('geolocation' in navigator)) {
      setError('Location is not available on this device/browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        placeMarker(pos.coords.latitude, pos.coords.longitude);
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 16);
      },
      () => setError('Could not get your location — place the pin manually instead.')
    );
  };

  const handleSave = async () => {
    if (!position || !name.trim()) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/bus/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          bus_id: bus.id,
          name: name.trim(),
          latitude: position.lat,
          longitude: position.lon,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not save your pickup point');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Could not save your pickup point');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4">
        <p className="text-sm font-semibold text-slate-900">Set your pickup point</p>
        <p className="text-xs text-slate-500 mt-1">
          Tap the map where {student.name}'s bus should stop for pickup — your gate, or the nearest point the bus ({bus.bus_number}) can reach.
        </p>
      </Card>

      <button
        onClick={useCurrentLocation}
        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-emerald-700 shadow-sm"
      >
        📍 Use my current location
      </button>

      <div ref={mapContainer} className="w-full h-64 rounded-2xl overflow-hidden border border-slate-200" />

      <Card className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Label (e.g. "Home", "Anna Nagar corner")</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Home"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={handleSave}
          disabled={!position || !name.trim() || saving}
          className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save pickup point'}
        </button>
        {!position && <p className="text-xs text-slate-400 text-center">Tap the map or use your current location first</p>}
      </Card>
    </div>
  );
}

function LiveBusView({ bus, stop }: { student: ParentStudent; bus: Bus; stop: Stop }) {
  const [live, setLive] = useState<LiveLocation | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    const poll = () => {
      fetch(`${API_URL}/api/bus/${bus.id}/location`)
        .then((r) => r.json())
        .then(setLive)
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [bus.id]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = L.map(mapContainer.current).setView([stop.latitude, stop.longitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    L.marker([stop.latitude, stop.longitude], { icon: pinIcon }).addTo(map).bindPopup(stop.name);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !live?.location) return;
    const { latitude, longitude } = live.location;
    if (busMarker.current) {
      busMarker.current.setLatLng([latitude, longitude]);
    } else {
      busMarker.current = L.marker([latitude, longitude], { icon: busIcon }).addTo(mapRef.current);
    }
    mapRef.current.panTo([latitude, longitude]);
  }, [live]);

  const distanceKm = live?.location ? haversineKm(live.location.latitude, live.location.longitude, stop.latitude, stop.longitude) : null;
  const etaMin = distanceKm !== null ? Math.round((distanceKm / ASSUMED_SPEED_KMH) * 60) : null;

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{bus.bus_number}</p>
        {!live?.tripActive ? (
          <p className="text-sm text-slate-500 mt-1">Trip not started yet</p>
        ) : etaMin !== null ? (
          <p className="text-lg font-bold text-emerald-700 mt-1">{etaMin} min away from {stop.name}</p>
        ) : (
          <p className="text-sm text-slate-500 mt-1">Waiting for GPS signal...</p>
        )}
      </Card>

      <div ref={mapContainer} className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200" />

      <Card className="p-4">
        <p className="text-sm font-medium text-slate-800">Pickup point</p>
        <p className="text-xs text-slate-500 mt-0.5">{stop.name}</p>
      </Card>
    </div>
  );
}
