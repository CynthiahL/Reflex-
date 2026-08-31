import { supabase, supabaseAdmin } from '../config/supabase.js';

// GET /api/riders
export const getFleetStatusMatrix = async (req, res) => {
  try {
    const { data: riders, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, live_status')
      .eq('role', 'rider'); // Isolate riders from retailers

    if (error) throw error;

    return res.status(200).json({ fleet: riders });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to look up driver fleet data metrics' });
  }
};

// PATCH /api/riders/status
export const toggleRiderDutyState = async (req, res) => {
  const { new_status } = req.body; // Expects 'Available' or 'Offline'

  if (!['Available', 'Offline'].includes(new_status)) {
    return res.status(400).json({ error: 'Invalid operation state configuration.' });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ live_status: new_status })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ message: 'Duty status updated', profile: data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to alter driver baseline operation metrics' });
  }
};
