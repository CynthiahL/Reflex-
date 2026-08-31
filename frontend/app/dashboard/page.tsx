'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // 🚀 Native framework router
import RetailerDashboard from '../../features/retailer/RetailerDashboard';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter(); // Initialize the router hook

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAuthenticated(true);
      } else {
        // ✨ Client-side transitions that preserve app state
        router.replace('/'); 
      }
    }
    checkSession();
  }, [router]);

  if (!authenticated) {
    return (
      <div className="p-8 text-center text-black">
        Verifying workspace session identity...
      </div>
    );
  }

  return <RetailerDashboard />;
}
