import express from 'express';
import { supabase } from '../services/supabase.service';
import { checkProximityAndAlert } from '../services/bus.service';

const router = express.Router();

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
      .select('id')
      .eq('bus_id', req.params.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (trip) {
      await supabase.from('bus_trips').update({ ended_at: new Date().toISOString() }).eq('id', trip.id);
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

// Convenience lookup for the parent app: which bus/stop is this student on?
router.get('/by-student/:studentId', async (req, res) => {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('bus_stop_id, bus_stops(id, bus_id, name, latitude, longitude, stop_order)')
      .eq('id', req.params.studentId)
      .single();
    if (error) throw error;
    if (!student?.bus_stop_id) return res.json({ assigned: false });

    const stop = student.bus_stops as any;
    const { data: bus } = await supabase.from('buses').select('id, bus_number, driver_name').eq('id', stop.bus_id).single();
    res.json({ assigned: true, bus, stop });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
