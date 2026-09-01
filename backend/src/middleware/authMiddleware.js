import { supabaseAdmin } from '../config/supabase.js';

export const checkAuth = () => {
  return async (req, res, next) => {
    try {
      // =====================================================
      // 1. REQUIRE BEARER TOKEN
      // =====================================================
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access token missing or malformed' });
      }

      const token = authHeader.slice(7).trim();
      if (!token) {
        return res.status(401).json({ error: 'Access token missing or malformed' });
      }

      // =====================================================
      // 2. VERIFY TOKEN WITH SUPABASE AUTH
      // =====================================================
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        console.error('Supabase token verification failed:', authError?.message);
        return res.status(401).json({ error: 'Invalid or expired authentication session' });
      }

      // =====================================================
      // 3. LOAD PROFILE USING AUTH USER ID
      // =====================================================
      const {
        data: profile,
        error: profileError,
      } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, role, live_status')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Authenticated user has no valid profile:', profileError);
        return res.status(403).json({ error: 'Authenticated user profile not found' });
      }

      // =====================================================
      // 4. VERIFY PROFILE OWNERSHIP
      // =====================================================
      if (profile.id !== user.id) {
        console.error('Profile ownership mismatch:', {
          authUserId: user.id,
          profileId: profile.id,
        });
        return res.status(403).json({ error: 'Authentication profile mismatch' });
      }

      // =====================================================
      // 5. VERIFY APPLICATION ROLE
      // =====================================================
      if (!['retailer', 'rider'].includes(profile.role)) {
        return res.status(403).json({ error: 'Invalid application workspace role' });
      }

      // =====================================================
      // 6. ATTACH TRUSTED IDENTITY TO REQUEST
      // =====================================================
      req.user = {
        id: user.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        live_status: profile.live_status,
      };

      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({ error: 'Internal authentication failure' });
    }
  };
};
