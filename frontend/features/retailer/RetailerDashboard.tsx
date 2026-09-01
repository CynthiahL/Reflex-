'use client';

import React from 'react';
import ProfileSection from '../profile/ProfileSection';
import UnifiedDispatchForm from './UnifiedDispatchForm';
import FleetStatusMatrix from './FleetStatusMatrix';
import { useRealtimeDeliveries } from '../../hooks/UseRealtimeDeliveries'; // ✅ Fixed path case

export default function RetailerDashboard() {
  const { deliveries, refresh } = useRealtimeDeliveries();

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      {/* Header with profile on the right */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Reflex Unified Dispatch
          </h1>
          <p className="text-gray-500">
            Retail Operations & Live Last-Mile Control
          </p>
        </div>

        {/* Profile section aligned right */}
        <ProfileSection />
      </header>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Intake + Fleet */}
        <div className="lg:col-span-1 space-y-6">
          <UnifiedDispatchForm onOrderCreated={refresh} />
          <FleetStatusMatrix />
        </div>

        {/* Right Column: Delivery Logs */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Your Deliveries</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-medium">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Address</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((order) => (
                  <tr
                    key={order.id}
                    className="text-gray-700 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3 font-semibold text-blue-600">
                      {order.reference_number}
                    </td>
                    <td className="py-3">{order.customer_name}</td>
                    <td className="py-3">{order.delivery_address}</td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'Delivered'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'Picked Up'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {deliveries.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-gray-400"
                    >
                      No active delivery entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
