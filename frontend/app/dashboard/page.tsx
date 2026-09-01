'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../components/AuthProvider';

export default function DashboardPage() {
const router = useRouter();
const { session, profile, loading } = useAuth();

useEffect(() => {
if (loading) return;

// No authenticated session or profile.
if (!session || !profile) {
  router.replace('/');
  return;
}

// Route the authenticated user according to their verified role.
if (profile.role === 'rider') {
  router.replace('/dashboard/rider');
  return;
}

if (profile.role === 'retailer') {
  router.replace('/dashboard/retailer');
  return;
}

// Unknown or unsupported role.
router.replace('/');


}, [loading, session, profile, router]);

return ( <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black"> <p className="font-medium">
{loading
? 'Verifying workspace identity...'
: 'Redirecting to your authorized workspace...'} </p> </div>
);
}
