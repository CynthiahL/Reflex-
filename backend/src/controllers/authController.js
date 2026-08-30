import { supabaseAdmin } from '../config/supabase.js'; // Notice the explicit .js extension


// POST /api/auth
export const validateSessionAndGetProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header token is required' });
    }

    const token = authHeader.split(' ')[1];

    // Validate the token signature directly against Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid, expired, or malformed session token' });
    }

    // Pull application custom role permissions from your profiles database table
    const { data: profile, error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError || !profile) {
      return res.status(404).json({ error: 'Profile not found for authenticated user.' });
    }

    return res.status(200).json({
      message: 'Session verified successfully',
      user: profile
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal system server failure during auth verification' });
  }
};
