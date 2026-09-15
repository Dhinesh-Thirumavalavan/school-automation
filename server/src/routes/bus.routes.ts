import express from 'express';
import { supabase } from '../services/supabase.service';
import { checkProximityAndAlert, notifyTripStarted, notifyTripEnded } from '../services/bus.service';

const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('buses').select('id, bus_number, driver_name').order('bus_number');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Driver login: bus number + shared PIN, no individual driver accounts for MVP
router.post('/login', async (req, res) => {
  try {
    const { bus_number, pin } = req.body;
    const { data: bus, error } = await supabase
      .from('buses')
      .select('id, bus_number, driver_name')
      .eq('bus_number', bus_number)
      .eq('pin', pin)
      .maybeSingle();
    if (error) throw error;
    if (!bus) return res.status(401).json({ error: 'Invalid bus number or PIN' });
    res.json(bus);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/start-trip', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bus_trips')
      .insert([{ bus_id: req.params.id }])
      .select()
      .single();
    if (error) throw error;
    notifyTripStarted(req.params.id).catch((err) => console.error('Trip-started notify error:', err));
    res.json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/end-trip', async (req, res) => {
  try {
    const { data: trip } = await supabase
      .from('bus_trips')
      .select('id, arrived_stop_ids')
      .eq('bus_id', req.params.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (trip) {
      await supabase.from('bus_trips').update({ ended_at: new Date().toISOString() }).eq('id', trip.id);
      notifyTripEnded(req.params.id, trip.arrived_stop_ids || []).catch((err) => console.error('Trip-ended notify error:', err));
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const { error } = await supabase.from('bus_locations').insert([{ bus_id: req.params.id, latitude, longitude }]);
    if (error) throw error;
    checkProximityAndAlert(req.params.id, latitude, longitude).catch((err) => console.error('Proximity alert error:', err));
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/location', async (req, res) => {
  try {
    const { data: location } = await supabase
      .from('bus_locations')
      .select('latitude, longitude, recorded_at')
      .eq('bus_id', req.params.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: trip } = await supabase
      .from('bus_trips')
      .select('id, started_at')
      .eq('bus_id', req.params.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({ location: location || null, tripActive: !!trip });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/stops', async (req, res) => {
  const { data, error } = await supabase.from('bus_stops').select('*').eq('bus_id', req.params.id).order('stop_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Parent self-service: create their own stop (a pin they placed) and assign
// their child to it. Appended to the end of the route; an admin can reorder
// it later to match the actual driving order.
router.post('/stops', async (req, res) => {
  try {
    const { student_id, bus_id, name, latitude, longitude } = req.body;
    if (!student_id || !bus_id || !name || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'student_id, bus_id, name, latitude, longitude are required' });
    }

    const { data: existing } = await supabase
      .from('bus_stops')
      .select('stop_order')
      .eq('bus_id', bus_id)
      .order('stop_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (existing?.stop_order ?? 0) + 1;

    const { data: stop, error } = await supabase
      .from('bus_stops')
      .insert([{ bus_id, stop_order: nextOrder, name, latitude, longitude }])
      .select()
      .single();
    if (error) throw error;

    const { error: updateError } = await supabase.from('students').update({ bus_stop_id: stop.id }).eq('id', student_id);
    if (updateError) throw updateError;

    res.json(stop);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: reorder a bus's stops to match the real driving order
router.put('/stops/reorder', async (req, res) => {
  try {
    const { orderedStopIds } = req.body as { orderedStopIds: string[] };
    if (!Array.isArray(orderedStopIds)) return res.status(400).json({ error: 'orderedStopIds must be an array' });

    await Promise.all(
      orderedStopIds.map((id, index) => supabase.from('bus_stops').update({ stop_order: index + 1 }).eq('id', id))
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Convenience lookup for the parent app: which bus/stop is this student on?
router.get('/by-student/:studentId', async (req, res) => {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('bus_id, bus_stop_id, buses(id, bus_number, driver_name), bus_stops(id, bus_id, name, latitude, longitude, stop_order)')
      .eq('id', req.params.studentId)
      .single();
    if (error) throw error;

    if (!student?.bus_id) return res.json({ busAssigned: false, stopAssigned: false });

    const bus = student.buses as any;
    if (!student.bus_stop_id) return res.json({ busAssigned: true, stopAssigned: false, bus });

    const stop = student.bus_stops as any;
    res.json({ busAssigned: true, stopAssigned: true, bus, stop });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
