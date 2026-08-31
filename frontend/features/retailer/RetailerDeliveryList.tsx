// RetailerDashboard.tsx — REALTIME INTEGRATION SNIPPET
// This is not a replacement for Member 3's full RetailerDashboard.tsx.
// It's the specific addition needed to prove "retailer dashboard updates
// without refresh" — hand this to Member 3 to merge into the real file.

import { useRealtimeDeliveries } from '../../hooks/useRealtimeDeliveries';
import { useAuth } from '../auth/useAuth';

export function RetailerDeliveryList() {
  const { user } = useAuth();

  // Retailer only READS — no updateStatus call on this side. Status
  // changes come exclusively from the rider; this dashboard is purely
  // a live view, which is the whole point of the realtime requirement.
  const { deliveries, connectionStatus } = useRealtimeDeliveries({
    filterColumn: 'retailer_id',
    userId: user?.id ?? null,
  });

  return (
    <div>
      {connectionStatus !== 'connected' && (
        <p role="status">Reconnecting to live updates…</p>
      )}
      <ul>
        {deliveries.map((d) => (
          <li key={d.id}>
            {d.customer_name} — <span data-status={d.status}>{d.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
