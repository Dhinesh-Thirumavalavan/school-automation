import { supabase } from './supabase.service';
import { sendToPhone } from './whatsapp.service';
import { translateText } from './groq.service';

const APPROACHING_ETA_MINUTES = 10;
const ARRIVED_ETA_MINUTES = 1;
const ASSUMED_SPEED_KMH = 20; // city traffic average, used for a simple v1 ETA

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function etaMinutes(distanceKm: number) {
  return Math.round((distanceKm / ASSUMED_SPEED_KMH) * 60);
}

async function notifyStudentsAtStop(stopId: string, buildMessage: (studentName: string) => string) {
  const { data: students } = await supabase
    .from('students')
    .select('name, parent_phone, alternate_phone')
    .eq('bus_stop_id', stopId);
  if (!students || students.length === 0) return;

  for (const student of students) {
    const english = buildMessage(student.name);
    const tamil = await translateText(english);
    const message = `${english}\n\n${tamil}`;
    await sendToPhone(student.parent_phone, message);
    if (student.alternate_phone) await sendToPhone(student.alternate_phone, message);
  }
}

// Fired once when a driver taps Start Trip — lets every parent on the bus
// know the trip is on, before any proximity alert would fire.
export async function notifyTripStarted(busId: string) {
  const { data: bus } = await supabase.from('buses').select('bus_number').eq('id', busId).single();
  const { data: students } = await supabase
    .from('students')
    .select('name, parent_phone, alternate_phone')
    .eq('bus_id', busId);
  if (!students || students.length === 0) return;

  const english = `${bus?.bus_number || 'Your child\'s bus'} has started its trip. We'll notify you as it approaches your stop.`;
  const tamil = await translateText(english);
  const message = `${english}\n\n${tamil}`;
  for (const student of students) {
    await sendToPhone(student.parent_phone, message);
    if (student.alternate_phone) await sendToPhone(student.alternate_phone, message);
  }
}

// Fired once when a driver ends a trip — safety net for any stop that never
// got an "arrived" alert (breakdown, cut-short route, skipped today), so
// parents aren't left waiting indefinitely for a bus that isn't coming.
export async function notifyTripEnded(busId: string, arrivedStopIds: string[]) {
  const { data: bus } = await supabase.from('buses').select('bus_number').eq('id', busId).single();
  const { data: stops } = await supabase.from('bus_stops').select('id').eq('bus_id', busId);
  const missed = (stops || []).filter((s) => !arrivedStopIds.includes(s.id));

  for (const stop of missed) {
    await notifyStudentsAtStop(
      stop.id,
      () => `${bus?.bus_number || 'The bus'}'s trip has ended without reaching your stop today. Please contact the school if your child still needs a ride.`
    );
  }
}

export async function checkProximityAndAlert(busId: string, lat: number, lon: number) {
  const { data: trip } = await supabase
    .from('bus_trips')
    .select('*')
    .eq('bus_id', busId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!trip) return;

  const { data: stops } = await supabase.from('bus_stops').select('*').eq('bus_id', busId).order('stop_order');
  if (!stops || stops.length === 0) return;

  const approaching: string[] = trip.alerted_stop_ids || [];
  const arrived: string[] = trip.arrived_stop_ids || [];

  for (const stop of stops) {
    const distanceKm = haversineDistanceKm(lat, lon, stop.latitude, stop.longitude);
    const eta = etaMinutes(distanceKm);

    if (!approaching.includes(stop.id) && eta <= APPROACHING_ETA_MINUTES) {
      await notifyStudentsAtStop(stop.id, (name) => `${name}'s bus is about ${eta} min away from ${stop.name}. Please be ready at the pickup point.`);
      approaching.push(stop.id);
    }

    if (!arrived.includes(stop.id) && eta <= ARRIVED_ETA_MINUTES) {
      await notifyStudentsAtStop(stop.id, () => `The bus has arrived at ${stop.name} now!`);
      arrived.push(stop.id);
    }
  }

  await supabase.from('bus_trips').update({ alerted_stop_ids: approaching, arrived_stop_ids: arrived }).eq('id', trip.id);
}
