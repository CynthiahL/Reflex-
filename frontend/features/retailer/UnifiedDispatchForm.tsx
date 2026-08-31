import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { RiderFleetProfile } from './FleetStatusMatrix';
const API_URL = process.env.NEXT_PUBLIC_API_URL;
console.log('🔗 Reflex API URL:', API_URL);

export default function UnifiedDispatchForm({ onOrderCreated }: { onOrderCreated: () => void }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    item_description: '',
    rider_id: '',
    payment_confirmed: false,
  });
  const [riders, setRiders] = useState<RiderFleetProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchActiveFleet() {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/riders`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const result = await response.json();
      if (response.ok) {
        setRiders(result.fleet || []);
      }
    }
    fetchActiveFleet();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/deliveries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to dispatch order');

      setFormData({
        customer_name: '',
        customer_phone: '',
        delivery_address: '',
        item_description: '',
        rider_id: '',
        payment_confirmed: false,
      });
      onOrderCreated();
      alert('🚀 Delivery logged and rider assigned successfully!');
    } catch (err) {
      console.error('Failed to dispatch order:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-lg font-bold text-gray-900 mb-4">New Delivery Request</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Customer Name"
          className="w-full p-2.5 border rounded-lg text-sm text-black"
          value={formData.customer_name}
          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Customer Phone (e.g., 07...)"
          className="w-full p-2.5 border rounded-lg text-sm text-black"
          value={formData.customer_phone}
          onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Delivery Address"
          className="w-full p-2.5 border rounded-lg text-sm text-black"
          value={formData.delivery_address}
          onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
          required
        />
        <textarea
          placeholder="Item Description"
          className="w-full p-2.5 border rounded-lg text-sm h-20 text-black"
          value={formData.item_description}
          onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
          required
        />
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Assign Rider From Fleet</label>
          <select
            className="w-full p-2.5 border rounded-lg text-sm bg-white text-black"
            value={formData.rider_id}
            onChange={(e) => setFormData({ ...formData, rider_id: e.target.value })}
          >
            <option value="">-- Select Active Rider --</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.full_name} ({rider.live_status})
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={formData.payment_confirmed}
            onChange={(e) => setFormData({ ...formData, payment_confirmed: e.target.checked })}
          />
          <span>Payment Confirmed</span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          {loading ? 'Processing...' : 'Estimate & Assign Rider'}
        </button>
      </form>
    </div>
  );
}
