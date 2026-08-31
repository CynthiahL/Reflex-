import { supabase } from '../config/supabase.js';

// PATCH /api/riders/:id/assign
export const assignRiderToDelivery = async (req, res) => {
  const { id } = req.params; // Delivery record ID
  const { rider_id } = req.body;

  if (!rider_id) {
    return res.status(400).json({ error: 'A valid target rider ID selection is required' });
  }

  try {
    // Confirm the target user exists and operates under the correct role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', rider_id)
      .single();

    if (profileError || profile?.role !== 'rider') {
      return res.status(400).json({ error: 'Target user is not registered as an active rider' });
    }

    // Atomically transition status from Pending -> Assigned to prevent race condition overrides
    const { data, error } = await supabase
      .from('deliveries')
      .update({ 
        rider_id, 
        status: 'Assigned',
        assigned_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'Pending') 
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({ error: 'Assignment rejected. Order may already be processed or canceled.' });
    }

    return res.status(200).json({ message: 'Rider successfully assigned to cargo transit task', delivery: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server failure handling assignment task' });
  }
};
