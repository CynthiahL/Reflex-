import { supabaseAdmin } from '../config/supabase.js';

export const checkAuth = () => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Access token missing or malformed'
        });
      }

      const token = authHeader.split(' ')[1];

      // 1. Verify JWT with Supabase
      const {
        data: { user },
        error: authError
      } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({
          error: 'Invalid or expired auth session'
        });
      }

      // 2. Fetch application profile
      const {
        data: profile,
        error: dbError
      } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (dbError || !profile) {
        return res.status(403).json({
          error: 'User profile or role not found'
        });
      }

      // 3. Attach authenticated identity to request
      req.user = {
        id: user.id,
        role: profile.role
      };

      next();

    } catch (error) {
      console.error(' Authentication middleware error:', error);

      return res.status(500).json({
        error: 'Internal authentication failure'
      });
    }
  };
};