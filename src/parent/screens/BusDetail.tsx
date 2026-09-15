import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_URL } from '../../config';
import { Card, EmptyState, Skeleton } from '../ui';
import type { ParentStudent } from '../types';

const POLL_INTERVAL_MS = 8000;
const ASSUMED_SPEED_KMH = 20;

interface Stop {
  id: string;
  bus_id: string;
  name: string;
  latitude: number;
  longitude: number;
}
interface Bus {
  id: string;
  bus_number: string;
  driver_name: string | null;
}
interface Assignment {
  assigned: boolean;
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
const stopIcon = L.divIcon({
  html: '<div style="font-size:22px;line-height:1;transform:translate(-50%,-90%)">📍</div>',
  className: '',
  iconSize: [0, 0],
});

interface BusDetailProps {
  student: ParentStudent;
}

export default function BusDetail({ student }: BusDetailProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [live, setLive] = useState<LiveLocation | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/bus/by-student/${student.id}`)
      .then((r) => r.json())
      .then(setAssignment)
      .catch(() => setAssignment({ assigned: false }));
  }, [student.id]);

  useEffect(() => {
    if (!assignment?.assigned || !assignment.bus) return;
    const busId = assignment.bus.id;

    const poll = () => {
      fetch(`${API_URL}/api/bus/${busId}/location`)
        .then((r) => r.json())
        .then(setLive)
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [assignment]);

  useEffect(() => {
    if (!mapContainer.current || !assignment?.stop || mapRef.current) return;
    const map = L.map(mapContainer.current).setView([assignment.stop.latitude, assignment.stop.longitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    L.marker([assignment.stop.latitude, assignment.stop.longitude], { icon: stopIcon })
      .addTo(map)
      .bindPopup(assignment.stop.name);
    mapRef.current = map;
  }, [assignment]);

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

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (!assignment) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!assignment.assigned) {
    return (
      <div className="p-4">
        <EmptyState icon={<span className="text-lg">🚌</span>} title="Not assigned to a bus yet" />
      </div>
    );
  }

  const distanceKm = live?.location
    ? haversineKm(live.location.latitude, live.location.longitude, assignment.stop!.latitude, assignment.stop!.longitude)
    : null;
  const etaMin = distanceKm !== null ? Math.round((distanceKm / ASSUMED_SPEED_KMH) * 60) : null;

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{assignment.bus!.bus_number}</p>
        {!live?.tripActive ? (
          <p className="text-sm text-slate-500 mt-1">Trip not started yet</p>
        ) : etaMin !== null ? (
          <p className="text-lg font-bold text-emerald-700 mt-1">{etaMin} min away from {assignment.stop!.name}</p>
        ) : (
          <p className="text-sm text-slate-500 mt-1">Waiting for GPS signal...</p>
        )}
      </Card>

      <div ref={mapContainer} className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200" />

      <Card className="p-4">
        <p className="text-sm font-medium text-slate-800">Pickup point</p>
        <p className="text-xs text-slate-500 mt-0.5">{assignment.stop!.name}</p>
      </Card>
    </div>
  );
}
