// RiderDashboard.tsx
// Not present in the original Task Deliverables table — added here to close
// the loop on Task 5's DoD line "Rider can update ASSIGNED -> PICKED_UP ->
// DELIVERED", since no rider-facing UI file was assigned to any task.
// Flag this gap to the team: this file needs an owner (likely Member 3 or
// Member 5) before Day 1 freeze.

import { useRealtimeDeliveries, DeliveryStatus } from '../../hooks/useRealtimeDeliveries';
import { useAuth } from '../auth/useAuth'; // assumes Member 1's auth context

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  ASSIGNED: 'PICKED_UP',
  PICKED_UP: 'DELIVERED',
};

export function RiderDashboard() {
  const { user, token } = useAuth();
  const { deliveries, connectionStatus, updateStatus } = useRealtimeDeliveries({
    filterColumn: 'rider_id',
    userId: user?.id ?? null,
  });

  const handleAdvance = async (deliveryId: string, currentStatus: DeliveryStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next || !token) return;
    try {
      await updateStatus(deliveryId, next, token);
      // No local setState here on purpose: the Realtime subscription
      // will push the confirmed row back down, so UI reflects only
      // what the server actually persisted (see hook comments).
    } catch (err) {
      alert((err as Error).message); // replace with toast in production build
    }
  };

  return (
    <div>
      <p>Connection: {connectionStatus}</p>
      <ul>
        {deliveries.map((d) => (
          <li key={d.id}>
            <strong>{d.customer_name}</strong> — {d.address} — {d.status}
            {NEXT_STATUS[d.status] && (
              <button onClick={() => handleAdvance(d.id, d.status)}>
                Mark {NEXT_STATUS[d.status]}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
