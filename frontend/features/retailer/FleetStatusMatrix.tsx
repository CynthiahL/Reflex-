'use client';
const API_URL = process.env.NEXT_PUBLIC_API_URL;
console.log('🔗 Reflex API URL:', API_URL);
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

export interface RiderFleetProfile {
  id: string;
  full_name: string;
  email: string;
  live_status: 'Available' | 'In Transit' | 'Offline';
}

export default function FleetStatusMatrix() {
  const [fleet, setFleet] = useState<RiderFleetProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch active rider list from secure backend profile endpoint
  const fetchFleetStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/riders`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const result = await response.json();
      
      if (response.ok) {
        setFleet((result.fleet || []) as RiderFleetProfile[]);
      }
    } catch (err) {
      console.error('Failed to pull rider fleet metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Open up real-time stream subscription to handle live grid transitions
  useEffect(() => {
    let isMounted = true;

    async function initializeFleetChannel() {
      if (isMounted) {
        await fetchFleetStatus();
      }
    }

    initializeFleetChannel();

    // Listen to changes specifically within the profiles table
    const channel = supabase
      .channel('fleet-matrix-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => {
          if (isMounted) {
            fetchFleetStatus(); // Realtime synchronization trigger
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchFleetStatus]);

  if (loading) {
    return <div className="text-sm font-medium text-gray-400 py-4">Syncing active fleet node matrix...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Rider Availability Matrix</h2>
          <p className="text-xs text-gray-500">Live operational status of your local shop couriers</p>
        </div>
        <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
          Total: {fleet.length}
        </span>
      </div>

      <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
        {fleet.map((rider) => (
          <div key={rider.id} className="py-3 flex justify-between items-center text-sm">
            <div>
              <p className="font-semibold text-gray-800">{rider.full_name}</p>
              <p className="text-xs text-gray-400">{rider.email}</p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Dynamic Status Badging Block */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                rider.live_status === 'Available' ? 'bg-green-100 text-green-800' :
                rider.live_status === 'In Transit' ? 'bg-amber-100 text-amber-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  rider.live_status === 'Available' ? 'bg-green-500' :
                  rider.live_status === 'In Transit' ? 'bg-amber-500' : 
                  'bg-gray-400'
                }`}></span>
                {rider.live_status}
              </span>
            </div>
          </div>
        ))}

        {fleet.length === 0 && (
          <div className="text-center py-6 text-sm text-gray-400">
            No couriers registered within your fleet.
          </div>
        )}
      </div>
    </div>
  );
}
