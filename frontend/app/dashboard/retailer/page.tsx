'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import RetailerDashboard from '../../../features/retailer/RetailerDashboard';
import { useAuth } from '../../components/AuthProvider';

export default function RetailerPage() {
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
    // only retailers may access this route.
    if (profile.role !== 'retailer') {
      if (profile.role === 'rider') {
        router.replace('/dashboard/rider');
      } else {
        router.replace('/');
      }
    }
  }, [loading, session, profile, router]);

  // Prevent dashboard content from rendering
  // while authentication is still being resolved.
  if (loading || !session || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">
        Verifying retailer identity...
      </div>
    );
  }

  // Prevent unauthorized role from seeing retailer UI
  if (profile.role !== 'retailer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">
        Redirecting to your authorized workspace...
      </div>
    );
  }

  return <RetailerDashboard />;
}