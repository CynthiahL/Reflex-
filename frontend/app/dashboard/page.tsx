'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '../../lib/supabaseClient';
import RetailerDashboard from '../../features/retailer/RetailerDashboard';
import RiderDashboard from '../../features/rider/RiderDashboard';

type UserRole = 'retailer' | 'rider';

export default function DashboardPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace('/');
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          console.error('Failed to retrieve workspace profile:', error);
          await supabase.auth.signOut();

          if (isMounted) {
            router.replace('/');
          }

          return;
        }

        if (profile.role !== 'retailer' && profile.role !== 'rider') {
          console.error('Unsupported workspace role:', profile.role);
          await supabase.auth.signOut();

          if (isMounted) {
            router.replace('/');
          }

          return;
        }

        if (isMounted) {
          setRole(profile.role);
          setCheckingSession(false);
        }
      } catch (error) {
        console.error('Workspace session check failed:', error);

        if (isMounted) {
          router.replace('/');
        }
      }
    }

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black font-semibold">
        Verifying workspace session identity...
      </div>
    );
  }

  if (role === 'retailer') {
    return <RetailerDashboard />;
  }

  if (role === 'rider') {
    return <RiderDashboard />;
  }

  return null;
}