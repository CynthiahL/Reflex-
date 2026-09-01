'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'retailer' | 'rider';
  live_status?: 'Available' | 'In Transit' | 'Offline' | null;
}

export default function ProfileSection() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, live_status')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Profile retrieval failed:', error);
          return;
        }

        setProfile(data as Profile);
      } catch (error) {
        console.error('Profile loading error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <p className="text-sm text-gray-400">Loading account...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <p className="text-sm text-red-400">
          Unable to load account profile.
        </p>
      </div>
    );
  }

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-lg font-black">
            {profile.full_name.charAt(0).toUpperCase()}
          </span>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">
            {profile.full_name}
          </h2>

          <p className="text-sm text-gray-400">
            {profile.email}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Account Role
          </p>

          <p className="mt-1 text-sm font-semibold text-blue-400 capitalize">
            {profile.role}
          </p>
        </div>

        {profile.role === 'rider' && (
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Duty Status
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              {profile.live_status || 'Offline'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
