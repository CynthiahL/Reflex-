import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail early if environment variables are missing during startup
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables in .env');
  process.exit(1);
}

// Client for general database operations and listening to Realtime updates
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  // Hardens WebSocket configurations for real-time dashboard listeners
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Administrative client to safely bypass Row-Level Security (RLS) for system role verification
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
