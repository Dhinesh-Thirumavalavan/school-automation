import { supabase } from './supabase.service';
import { sendToPhone } from './whatsapp.service';
import { translateText } from './groq.service';

const ALERT_ETA_MINUTES = 10;
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

  const { data: stops } = await supabase
    .from('bus_stops')
    .select('*')
    .eq('bus_id', busId)
    .order('stop_order');
  if (!stops || stops.length === 0) return;

  const alerted: string[] = trip.alerted_stop_ids || [];

  for (const stop of stops) {
    if (alerted.includes(stop.id)) continue;
    const distanceKm = haversineDistanceKm(lat, lon, stop.latitude, stop.longitude);
    const eta = etaMinutes(distanceKm);
    if (eta > ALERT_ETA_MINUTES) continue;

    const { data: students } = await supabase
      .from('students')
      .select('name, parent_phone, alternate_phone')
      .eq('bus_stop_id', stop.id);

    if (students && students.length > 0) {
      for (const student of students) {
        const english = `${student.name}'s bus is about ${eta} min away from ${stop.name}. Please be ready at the pickup point.`;
        const tamil = await translateText(english);
        const message = `${english}\n\n${tamil}`;
        await sendToPhone(student.parent_phone, message);
        if (student.alternate_phone) await sendToPhone(student.alternate_phone, message);
      }
    }

    alerted.push(stop.id);
  }

  await supabase.from('bus_trips').update({ alerted_stop_ids: alerted }).eq('id', trip.id);
}
