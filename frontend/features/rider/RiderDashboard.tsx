'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../app/components/AuthProvider';

interface DeliveryTask {
  id: string;
  reference_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  item_description: string;
  status: 'Assigned' | 'Picked Up' | 'Delivered' | 'Cancelled';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function RiderDashboard() {
  const router = useRouter();
  const { profile, session, loading: authLoading, signOut } = useAuth();

  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [dutyStatus, setDutyStatus] =
    useState<'Available' | 'Offline'>('Offline');

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] =
    useState<string | null>(null);

  /*
   * Explicit role protection.
   *
   * Even though the backend protects the API,
   * the frontend must not render a rider workspace
   * for a retailer.
   */
  useEffect(() => {
    if (authLoading) return;

    if (!session || !profile) {
      router.replace('/');
      return;
    }

    if (profile.role !== 'rider') {
      router.replace('/dashboard');
    }
  }, [authLoading, session, profile, router]);

  const fetchRiderWorkspace = useCallback(async () => {
    if (!session || !profile || profile.role !== 'rider' || !API_URL) {
      return;
    }

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('live_status')
        .eq('id', profile.id)
        .single();

      if (
        currentProfile?.live_status === 'Available' ||
        currentProfile?.live_status === 'In Transit'
      ) {
        setDutyStatus('Available');
      } else {
        setDutyStatus('Offline');
      }

      const response = await fetch(`${API_URL}/deliveries`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retrieve deliveries.');
      }

      setTasks((result.deliveries || []) as DeliveryTask[]);
    } catch (err) {
      console.error('Failed to sync rider workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [session, profile]);

  useEffect(() => {
    if (
      authLoading ||
      !session ||
      !profile ||
      profile.role !== 'rider'
    ) {
      return;
    }

    fetchRiderWorkspace();

    const channel = supabase
      .channel(`rider-task-changes-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `rider_id=eq.${profile.id}`,
        },
        () => {
          fetchRiderWorkspace();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, session, profile, fetchRiderWorkspace]);

  const toggleDuty = async () => {
    if (!session || profile?.role !== 'rider' || !API_URL) return;

    const nextStatus =
      dutyStatus === 'Available' ? 'Offline' : 'Available';

    try {
      const response = await fetch(`${API_URL}/riders/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          new_status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Failed to update duty status.'
        );
      }

      setDutyStatus(nextStatus);
    } catch (err) {
      console.error('Failed to update duty state:', err);

      alert(
        err instanceof Error
          ? err.message
          : 'Failed to update duty status.'
      );
    }
  };

  const advanceTaskState = async (
    taskId: string,
    currentStatus: string
  ) => {
    if (!session || profile?.role !== 'rider' || !API_URL) return;

    let next_status = 'Picked Up';

    if (currentStatus === 'Picked Up') {
      next_status = 'Delivered';
    }

    setActionLoadingId(taskId);

    try {
      const response = await fetch(
        `${API_URL}/deliveries/${taskId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            next_status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'State transition rejected.'
        );
      }

      await fetchRiderWorkspace();
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? `❌ ${err.message}`
          : '❌ Unexpected state transition error.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  if (authLoading || !session || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Verifying rider identity...
      </div>
    );
  }

  if (profile.role !== 'rider') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Redirecting to your authorized workspace...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading Rider Workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans max-w-md mx-auto shadow-2xl flex flex-col">

      <header className="bg-gray-800 p-4 border-b border-gray-700 sticky top-0 z-50">

        <div className="flex justify-between items-start">

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
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              dutyStatus === 'Available'
                ? 'bg-green-500 text-white'
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            ● {dutyStatus === 'Available' ? 'On Duty' : 'Off Duty'}
          </button>

        </div>

        {/* Rider account section */}
        <div className="mt-4 p-3 rounded-lg bg-gray-900 border border-gray-700">

          <div className="flex justify-between items-start">

            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Signed in as
              </p>

              <p className="text-sm font-bold text-white mt-1">
                {profile.full_name}
              </p>

              <p className="text-xs text-gray-400">
                {profile.email}
              </p>

              <span className="inline-block mt-2 px-2 py-1 rounded bg-blue-900/60 text-blue-300 text-xs font-bold uppercase">
                Rider
              </span>
            </div>

            <button
              onClick={signOut}
              className="text-xs font-semibold text-red-400 hover:text-red-300"
            >
              Sign Out
            </button>

          </div>

        </div>

      </header>

      <main className="p-4 space-y-4 flex-1 overflow-y-auto">

        <h2 className="text-sm font-bold tracking-wider text-gray-400 uppercase">
          Assigned Deliveries
        </h2>

        {tasks.map((task) => {

          const isCompleted =
            task.status === 'Delivered' ||
            task.status === 'Cancelled';

          return (
            <div
              key={task.id}
              className={`p-5 rounded-xl border ${
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
                    className="w-full bg-blue-600 disabled:bg-gray-700 text-white disabled:text-gray-400 py-2.5 rounded-lg text-sm font-bold"
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
