'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import RiderDashboard from '../../../features/rider/RiderDashboard';
import { useAuth } from '../../components/AuthProvider';

export default function RiderPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // No authenticated session/profile → return to sign-in
    if (!session || !profile) {
      router.replace('/');
      return;
    }

    // Explicit role protection:
    // only riders may access this route.
    if (profile.role !== 'rider') {
      if (profile.role === 'retailer') {
        router.replace('/dashboard/retailer');
      } else {
        router.replace('/');
      }
    }
  }, [loading, session, profile, router]);

  // Keep the workspace hidden while authentication
  // and profile verification are still in progress.
  if (loading || !session || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Verifying rider identity...
      </div>
    );
  }

  // Prevent an unauthorized role from seeing
  // the rider workspace.
  if (profile.role !== 'rider') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Redirecting to your authorized workspace...
      </div>
    );
  }

  return <RiderDashboard />;
}
