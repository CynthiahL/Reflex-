'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, } from 'react';
import {Session} from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';


interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'retailer' | 'rider';
  live_status?: 'Available' | 'In Transit' | 'Offline' | null;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      setSession(null);
      setProfile(null);
      return;
    }

    setSession(currentSession);

    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured.');
      return;
    }

    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Backend profile verification failed.');
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      return;
    }

    const result = await response.json();

    setProfile(result.user);
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        await refreshProfile();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (newSession) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const router = useRouter();
  const signOut = async () => {
  await supabase.auth.signOut();
  setSession(null);
  setProfile(null);
  router.replace('/'); // ✅ Next.js‑friendly redirect
};

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
