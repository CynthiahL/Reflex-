'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
  const [dutyStatus, setDutyStatus] = useState<'Available' | 'Offline'>('Offline');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 1. Fetch data wrapped in useCallback to prevent re-creation loops
  const fetchRiderWorkspace = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('live_status')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.live_status === 'Available' || profile?.live_status === 'In Transit') {
        setDutyStatus('Available');
      } else {
        setDutyStatus('Offline');
      }

      const response = await fetch('http://localhost:5000/api/deliveries', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const result = await response.json();
      if (response.ok) {
        setTasks((result.deliveries || []) as DeliveryTask[]);
      }
    } catch (err) {
      console.error('Failed to sync rider workspace:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fixed layout rendering cycle error inside the useEffect block
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        if (isMounted) {
          fetchRiderWorkspace();
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchRiderWorkspace]);

  // 3. Toggle active duty availability state matrix
  const toggleDuty = async () => {
    const nextStatus = dutyStatus === 'Available' ? 'Offline' : 'Available';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('http://localhost:5000/api/riders/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ new_status: nextStatus })
      });
      if (response.ok) {
        setDutyStatus(nextStatus);
      }
    } catch (err) {
      console.error('Failed to update duty state:', err);
      alert('Failed to modify operational duty metrics.');
    }
  };

  // 4. Cleaned up state transitions and fixed 'unexpected any' error on the catch block
  const advanceTaskState = async (taskId: string, currentStatus: string) => {
    let next_status = 'Picked Up';
    if (currentStatus === 'Picked Up') next_status = 'Delivered';

    setActionLoadingId(taskId); 

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`http://localhost:5000/api/deliveries/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ next_status })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'State transition rejected');

      await fetchRiderWorkspace(); 
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`❌ State Error: ${err.message}`);
      } else {
        alert('❌ An unexpected state transition error occurred.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-black font-medium">Loading Rider Workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans max-w-md mx-auto shadow-2xl flex flex-col">
      <header className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black tracking-tight text-blue-400">Reflex Rider</h1>
          <p className="text-xs text-gray-400">Transit Node Command</p>
        </div>
        
        <button 
          onClick={toggleDuty}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
            dutyStatus === 'Available' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-600 text-gray-300'
          }`}
        >
          ● {dutyStatus === 'Available' ? 'On Duty' : 'Off Duty'}
        </button>
      </header>

      <main className="p-4 space-y-4 flex-1 overflow-y-auto">
        <h2 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-2">Assigned Deliveries</h2>

        {tasks.map((task) => {
          const isCompleted = task.status === 'Delivered' || task.status === 'Cancelled';
          
          return (
            <div 
              key={task.id} 
              className={`p-5 rounded-xl border transition-all ${
                isCompleted ? 'bg-gray-800/40 border-gray-800 text-gray-500' : 'bg-gray-800 border-gray-700'
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
                <p><strong className="text-gray-400">Recipient:</strong> {task.customer_name}</p>
                <p>
                  <strong className="text-gray-400">Contact:</strong>{' '}
                  {isCompleted ? (
                    <span className="italic">{task.customer_phone}</span>
                  ) : (
                    <a href={`tel:${task.customer_phone}`} className="text-blue-400 underline font-semibold">
                      {task.customer_phone} 📞 Call
                    </a>
                  )}
                </p>
                <p><strong className="text-gray-400">Address:</strong> {task.delivery_address}</p>
                <p className="text-xs bg-gray-900/50 p-2 rounded border border-gray-700/30">
                  <strong className="text-gray-400">Cargo:</strong> {task.item_description}
                </p>
              </div>

              {!isCompleted && (
                <div className="mt-4 pt-3 border-t border-gray-700/50">
                  <button
                    disabled={actionLoadingId === task.id || dutyStatus === 'Offline'}
                    onClick={() => advanceTaskState(task.id, task.status)}
                    className="w-full bg-blue-600 disabled:bg-gray-700 text-white disabled:text-gray-400 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all"
                  >
                    {actionLoadingId === task.id ? 'Updating Network...' : 
                     dutyStatus === 'Offline' ? 'Go On Duty to Proceed' :
                     task.status === 'Assigned' ? 'Confirm Package Pickup' : 'Mark as Delivered'}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="text-center py-12 bg-gray-800/20 border border-dashed border-gray-800 rounded-xl">
            <p className="text-gray-500 text-sm">No active delivery assignments found.</p>
          </div>
        )}
      </main>
    </div>
  );
}
