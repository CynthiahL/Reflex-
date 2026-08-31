// useRealtimeDeliveries.ts
// Task 5: Realtime Synchronization & Delivery Status
// Owned by Member 5.
//
// Subscribes to Postgres change events on the `deliveries` table via
// Supabase Realtime, and keeps local state in sync without requiring
// a page refresh. Used by both the Retailer dashboard (filtered by
// retailer_id) and the Rider dashboard (filtered by rider_id).

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED';

export interface Delivery {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  item_description: string;
  status: DeliveryStatus;
  retailer_id: string;
  rider_id: string | null;
  updated_at: string;
}

interface UseRealtimeDeliveriesOptions {
  /** 'retailer_id' or 'rider_id' — which column to filter the subscription on */
  filterColumn: 'retailer_id' | 'rider_id';
  /** the current user's id, used as the filter value */
  userId: string | null;
  initialDeliveries?: Delivery[];
}

/**
 * Trade-off (documented in trade-off-log.md):
 * This hook does NOT implement a polling fallback if the WebSocket
 * connection drops. connectionStatus is exposed so the UI can show a
 * "reconnecting" indicator, but MVP does not auto-refetch on reconnect
 * beyond what Supabase's client already retries internally.
 */
export function useRealtimeDeliveries({
  filterColumn,
  userId,
  initialDeliveries = [],
}: UseRealtimeDeliveriesOptions) {
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchDeliveries = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq(filterColumn, userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setDeliveries(data as Delivery[]);
    }
  }, [filterColumn, userId]);

  useEffect(() => {
    if (!userId) return;

    // Initial load, in case rows changed before the subscription was live.
    fetchDeliveries();

    const channel = supabase
      .channel(`deliveries-${filterColumn}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT + UPDATE — a new PENDING delivery, or a status change
          schema: 'public',
          table: 'deliveries',
          filter: `${filterColumn}=eq.${userId}`,
        },
        (payload) => {
          setDeliveries((prev) => {
            if (payload.eventType === 'INSERT') {
              const exists = prev.some((d) => d.id === payload.new.id);
              return exists ? prev : [payload.new as Delivery, ...prev];
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((d) =>
                d.id === payload.new.id ? (payload.new as Delivery) : d
              );
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [filterColumn, userId, fetchDeliveries]);

  /**
   * Rider-facing status update. Calls the backend PATCH endpoint (which
   * enforces the transition rules) rather than writing to Supabase directly
   * from the client, so the server-side validation in deliveryController.js
   * is always the source of truth.
   */
  const updateStatus = useCallback(
    async (deliveryId: string, nextStatus: DeliveryStatus, authToken: string) => {
      const res = await fetch(`/api/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update status');
      }

      return res.json();
      // Note: we don't need to manually update local state here — the
      // Supabase Realtime UPDATE event will arrive and update it for us.
      // This avoids state drift between an optimistic local update and
      // what the server actually persisted.
    },
    []
  );

  return { deliveries, connectionStatus, updateStatus, refetch: fetchDeliveries };
}
