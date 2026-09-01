
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not configured');
}

interface DeliveryTask {
  id: string;
  reference_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  item_description: string;
  status: 'Assigned' | 'Picked Up' | 'Delivered' | 'Cancelled';
}

export default function RiderDashboard() {
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [dutyStatus, setDutyStatus] =
    useState<'Available' | 'Offline'>('Offline');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] =
    useState<string | null>(null);

  // Get a valid authenticated session before making API requests
  const getAuthenticatedSession = async () => {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      throw new Error('Unable to retrieve authentication session.');
    }

    if (!session?.access_token) {
      throw new Error('No authenticated session found. Please log in again.');
    }

    return session;
  };

  // Fetch rider workspace
  const fetchRiderWorkspace = useCallback(async () => {
    try {
      const session = await getAuthenticatedSession();

      // Fetch rider's current duty status directly from Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('live_status')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        throw new Error('Unable to retrieve rider profile.');
      }

      if (
        profile?.live_status === 'Available' ||
        profile?.live_status === 'In Transit'
      ) {
        setDutyStatus('Available');
      } else {
        setDutyStatus('Offline');
      }

      // Fetch assigned deliveries through the Express API
      const response = await fetch(`${API_URL}/deliveries`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Failed to retrieve assigned deliveries.'
        );
      }

      setTasks((result.deliveries || []) as DeliveryTask[]);
    } catch (err) {
      console.error('Failed to sync rider workspace:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize dashboard and subscribe to delivery changes
  useEffect(() => {
    let isMounted = true;

    async function initializeDashboard() {
      if (isMounted) {
        await fetchRiderWorkspace();
      }
    }

    initializeDashboard();

    const channel = supabase
      .channel('rider-task-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries'
        },
        () => {
          if (isMounted) {
            fetchRiderWorkspace();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchRiderWorkspace]);

  // Toggle rider duty availability
  const toggleDuty = async () => {
    const nextStatus =
      dutyStatus === 'Available' ? 'Offline' : 'Available';

    try {
      const session = await getAuthenticatedSession();

      const response = await fetch(`${API_URL}/riders/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          new_status: nextStatus
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Failed to update rider duty status.'
        );
      }

      setDutyStatus(nextStatus);
    } catch (err) {
      console.error('Failed to update duty state:', err);

      if (err instanceof Error) {
        alert(`Failed to modify duty status: ${err.message}`);
      } else {
        alert('Failed to modify duty status.');
      }
    }
  };

  // Advance delivery status
  const advanceTaskState = async (
    taskId: string,
    currentStatus: DeliveryTask['status']
  ) => {
    let next_status: 'Picked Up' | 'Delivered';

    if (currentStatus === 'Assigned') {
      next_status = 'Picked Up';
    } else if (currentStatus === 'Picked Up') {
      next_status = 'Delivered';
    } else {
      return;
    }

    setActionLoadingId(taskId);

    try {
      const session = await getAuthenticatedSession();

      const response = await fetch(
        `${API_URL}/deliveries/${taskId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            next_status
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'State transition rejected.'
        );
      }

      // Refresh dashboard after successful status transition
      await fetchRiderWorkspace();
    } catch (err: unknown) {
      console.error('Delivery state transition failed:', err);

      if (err instanceof Error) {
        alert(`❌ State Error: ${err.message}`);
      } else {
        alert('❌ An unexpected state transition error occurred.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-black font-medium">
        Loading Rider Workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans max-w-md mx-auto shadow-2xl flex flex-col">
      <header className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black tracking-tight text-blue-400">
            Reflex Rider
          </h1>

          <p className="text-xs text-gray-400">
            Transit Node Command
          </p>
        </div>

        <button
          onClick={toggleDuty}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
            dutyStatus === 'Available'
              ? 'bg-green-500 text-white'
              : 'bg-gray-600 text-gray-300'
          }`}
        >
          ●{' '}
          {dutyStatus === 'Available'
            ? 'On Duty'
            : 'Off Duty'}
        </button>
      </header>

      <main className="p-4 space-y-4 flex-1 overflow-y-auto">
        <h2 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-2">
          Assigned Deliveries
        </h2>

        {tasks.map((task) => {
          const isCompleted =
            task.status === 'Delivered' ||
            task.status === 'Cancelled';

          return (
            <div
              key={task.id}
              className={`p-5 rounded-xl border transition-all ${
                isCompleted
                  ? 'bg-gray-800/40 border-gray-800 text-gray-500'
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300">
                  {task.reference_number}
                </span>

                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-900/40 text-blue-400">
                  {task.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <strong className="text-gray-400">
                    Recipient:
                  </strong>{' '}
                  {task.customer_name}
                </p>

                <p>
                  <strong className="text-gray-400">
                    Contact:
                  </strong>{' '}
                  {isCompleted ? (
                    <span className="italic">
                      {task.customer_phone}
                    </span>
                  ) : (
                    <a
                      href={`tel:${task.customer_phone}`}
                      className="text-blue-400 underline font-semibold"
                    >
                      {task.customer_phone} 📞 Call
                    </a>
                  )}
                </p>

                <p>
                  <strong className="text-gray-400">
                    Address:
                  </strong>{' '}
                  {task.delivery_address}
                </p>

                <p className="text-xs bg-gray-900/50 p-2 rounded border border-gray-700/30">
                  <strong className="text-gray-400">
                    Cargo:
                  </strong>{' '}
                  {task.item_description}
                </p>
              </div>

              {!isCompleted && (
                <div className="mt-4 pt-3 border-t border-gray-700/50">
                  <button
                    disabled={
                      actionLoadingId === task.id ||
                      dutyStatus === 'Offline'
                    }
                    onClick={() =>
                      advanceTaskState(
                        task.id,
                        task.status
                      )
                    }
                    className="w-full bg-blue-600 disabled:bg-gray-700 text-white disabled:text-gray-400 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all"
                  >
                    {actionLoadingId === task.id
                      ? 'Updating Network...'
                      : dutyStatus === 'Offline'
                        ? 'Go On Duty to Proceed'
                        : task.status === 'Assigned'
                          ? 'Confirm Package Pickup'
                          : 'Mark as Delivered'}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="text-center py-12 bg-gray-800/20 border border-dashed border-gray-800 rounded-xl">
            <p className="text-gray-500 text-sm">
              No active delivery assignments found.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
