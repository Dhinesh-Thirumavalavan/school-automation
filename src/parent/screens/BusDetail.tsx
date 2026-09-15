import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { API_URL } from '../../config';
import { Card, EmptyState, Skeleton } from '../ui';
import type { ParentStudent } from '../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
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

interface BusDetailProps {
  student: ParentStudent;
}

export default function BusDetail({ student }: BusDetailProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [live, setLive] = useState<LiveLocation | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const busMarker = useRef<mapboxgl.Marker | null>(null);
  const stopMarker = useRef<mapboxgl.Marker | null>(null);

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
    if (!MAPBOX_TOKEN || !mapContainer.current || !assignment?.stop || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [assignment.stop.longitude, assignment.stop.latitude],
      zoom: 13,
    });
    stopMarker.current = new mapboxgl.Marker({ color: '#dc2626' })
      .setLngLat([assignment.stop.longitude, assignment.stop.latitude])
      .setPopup(new mapboxgl.Popup().setText(assignment.stop.name))
      .addTo(mapRef.current);
  }, [assignment]);

  useEffect(() => {
    if (!mapRef.current || !live?.location) return;
    const { latitude, longitude } = live.location;
    if (busMarker.current) {
      busMarker.current.setLngLat([longitude, latitude]);
    } else {
      const el = document.createElement('div');
      el.textContent = '🚌';
      el.style.fontSize = '24px';
      busMarker.current = new mapboxgl.Marker({ element: el }).setLngLat([longitude, latitude]).addTo(mapRef.current);
    }
    mapRef.current.easeTo({ center: [longitude, latitude] });
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

      {MAPBOX_TOKEN ? (
        <div ref={mapContainer} className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200" />
      ) : (
        <Card className="p-4">
          <p className="text-sm text-slate-500">Map isn't configured yet — set VITE_MAPBOX_TOKEN to enable it.</p>
        </Card>
      )}

      <Card className="p-4">
        <p className="text-sm font-medium text-slate-800">Pickup point</p>
        <p className="text-xs text-slate-500 mt-0.5">{assignment.stop!.name}</p>
      </Card>
    </div>
  );
}
