import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
console.log('🔗 Reflex API URL:', API_URL);

export interface Delivery {
  id: string;
  reference_number: string;
  customer_name: string;
  delivery_address: string;
  status: 'Pending' | 'Assigned' | 'Picked Up' | 'Delivered' | 'Cancelled';
}

export function useRealtimeDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch deliveries from API
  const fetchDeliveries = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/deliveries`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await response.json();

      if (response.ok) {
        setDeliveries((result.deliveries || []) as Delivery[]);
      } else {
        throw new Error(result.error || `Request failed with status ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize + subscribe to realtime updates
  useEffect(() => {
    let isMounted = true;

    async function initializeSyncPipeline() {
      if (isMounted) {
        await fetchDeliveries();
      }
    }

    initializeSyncPipeline();

    const channel = supabase
      .channel('db-delivery-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => {
          if (isMounted) {
            fetchDeliveries();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchDeliveries]);

  return { deliveries, loading, refresh: fetchDeliveries };
}
