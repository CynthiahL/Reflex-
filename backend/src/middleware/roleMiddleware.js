import { supabaseAdmin } from '../config/supabase.js';

export const grantAccessTo = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication context missing.' });
      }

      // Query database profile using admin client to securely bypass row level locks
      const { data: profile, error: dbError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (dbError || !profile) {
        return res.status(403).json({ error: 'Access denied. Custom profile record not found.' });
      }

      // Validate user role status against the endpoint configuration list
      if (!allowedRoles.includes(profile.role)) {
        return res.status(403).json({ 
          error: `Forbidden. This operation requires one of these roles: [${allowedRoles.join(', ')}].` 
        });
      }

      // Dynamically append verified role to user context payload for controller-level isolation filters
      req.user.role = profile.role;

      next();
    } catch (error) {
      return res.status(500).json({ error: 'Internal system error handling role clearance permissions.' });
    }
  };
};
