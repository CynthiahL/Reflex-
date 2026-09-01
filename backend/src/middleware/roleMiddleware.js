import { supabaseAdmin } from '../config/supabase.js';

export const grantAccessTo = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Ensure authentication context exists
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authenticated identity is required.' });
      }

      // If role already injected by auth middleware, validate directly
      if (req.user.role && allowedRoles.includes(req.user.role)) {
        return next();
      }

      // Otherwise, securely fetch role from Supabase
      const { data: profile, error: dbError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (dbError || !profile) {
        return res.status(403).json({
          error: 'Access denied. Profile record not found or inaccessible.',
        });
      }

      // Validate role against allowed list
      if (!allowedRoles.includes(profile.role)) {
        return res.status(403).json({
          error: `Forbidden. This operation requires one of these roles: [${allowedRoles.join(', ')}].`,
        });
      }

      // Append verified role to request context for downstream use
      req.user.role = profile.role;

      next();
    } catch (error) {
      console.error('Role clearance error:', error);
      return res.status(500).json({
        error: 'Internal system error while verifying role permissions.',
      });
    }
  };
};
