'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '../features/auth/loginForm';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function evaluateActiveSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session) {
          router.replace('/dashboard');
          return;
        }

        setCheckingSession(false);
      } catch (error) {
        console.error('Session check failed:', error);

        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    evaluateActiveSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black font-semibold">
        Verifying system initialization state...
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="flex items-center space-x-3 mb-8">
        <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
          <span className="text-white font-black text-xl">R</span>
        </div>

        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Reflex
        </h1>
      </div>

      <LoginForm />

      <footer className="mt-12 text-xs text-gray-400 font-medium">
        Reflex Logistics Network • Built for Small Enterprise Retailers
      </footer>
    </main>
  );
}