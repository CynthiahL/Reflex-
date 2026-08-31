import { supabaseAdmin } from '../config/supabase.js';

// POST /api/auth/signup (Exposed publicly for new registration initialization)
export const onboardNewProfile = async (req, res) => {
  const { id, email, full_name, role } = req.body;

  if (!id || !email || !full_name || !role) {
    return res.status(400).json({ error: 'All core profile registration fields are required.' });
  }

  if (!['retailer', 'rider'].includes(role)) {
    return res.status(400).json({ error: 'Invalid workspace assignment role selection.' });
  }

  try {
    // Inject the custom metadata profile using administrative bypass privileges
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id,
          full_name,
          email,
          role,
          live_status: role === 'rider' ? 'Offline' : null // Initialize riders as offline
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Profile workspace created successfully', profile: data });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to initialize account profile' });
  }
};
