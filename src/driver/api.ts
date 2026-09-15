import { API_URL } from '../config';

export interface DriverSession {
  id: string;
  bus_number: string;
  driver_name: string | null;
}

export type Shift = 'morning' | 'evening';

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const driverApi = {
  login: (bus_number: string, pin: string) =>
    fetch(`${API_URL}/api/bus/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bus_number, pin }),
    }).then((r) => handle<DriverSession>(r)),

  startTrip: (busId: string, shift: Shift) =>
    fetch(`${API_URL}/api/bus/${busId}/start-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift }),
    }).then((r) => handle(r)),

  endTrip: (busId: string) =>
    fetch(`${API_URL}/api/bus/${busId}/end-trip`, { method: 'POST' }).then((r) => handle(r)),

  sendLocation: (busId: string, latitude: number, longitude: number) =>
    fetch(`${API_URL}/api/bus/${busId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    }).then((r) => handle(r)),
};
