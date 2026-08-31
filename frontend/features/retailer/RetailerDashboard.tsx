"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { apiFetch } from "@/lib/api";

import UnifiedDispatchForm from "./UnifiedDispatchForm";

import {
  Delivery,
  DeliveryStatus,
} from "@/types/delivery";

function StatusBadge({
  status,
}: {
  status: DeliveryStatus;
}) {
  const styles: Record<
    DeliveryStatus,
    string
  > = {
    PENDING:
      "border-amber-200 bg-amber-50 text-amber-700",

    ASSIGNED:
      "border-blue-200 bg-blue-50 text-blue-700",

    PICKED_UP:
      "border-violet-200 bg-violet-50 text-violet-700",

    DELIVERED:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  const labels: Record<
    DeliveryStatus,
    string
  > = {
    PENDING: "Pending",
    ASSIGNED: "Assigned",
    PICKED_UP: "Picked up",
    DELIVERED: "Delivered",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "en-KE",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(dateString));
}

export default function RetailerDashboard() {
  const router = useRouter();

  const [deliveries, setDeliveries] =
    useState<Delivery[]>([]);

  const [userEmail, setUserEmail] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const fetchDeliveries =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await apiFetch(
            "/api/deliveries"
          );

        if (
          response.status === 401
        ) {
          await supabase.auth.signOut();

          router.replace("/");
          return;
        }

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
              result?.error ||
              "Failed to load deliveries."
          );
        }

        const deliveryData =
          result?.data ||
          result?.deliveries ||
          [];

        setDeliveries(
          deliveryData
        );
      } catch (fetchError) {
        console.error(
          "Failed to fetch deliveries:",
          fetchError
        );

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load deliveries."
        );
      } finally {
        setLoading(false);
      }
    }, [router]);

  useEffect(() => {
    async function initialise() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
        return;
      }

      setUserEmail(
        session.user.email ?? ""
      );

      await fetchDeliveries();
    }

    initialise();
  }, [
    fetchDeliveries,
    router,
  ]);

  function handleDeliveryCreated(
    delivery: Delivery
  ) {
    setDeliveries(
      (current) => [
        delivery,
        ...current,
      ]
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();

    router.replace("/");
    router.refresh();
  }

  const counts = useMemo(
    () => ({
      total: deliveries.length,

      pending:
        deliveries.filter(
          (delivery) =>
            delivery.status ===
            "PENDING"
        ).length,

      active:
        deliveries.filter(
          (delivery) =>
            delivery.status ===
              "ASSIGNED" ||
            delivery.status ===
              "PICKED_UP"
        ).length,

      delivered:
        deliveries.filter(
          (delivery) =>
            delivery.status ===
            "DELIVERED"
        ).length,
    }),
    [deliveries]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-bold text-white">
              R
            </div>

            <div>
              <h1 className="font-bold text-slate-900">
                Reflex
              </h1>

              <p className="text-xs text-slate-500">
                Retailer dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden text-sm text-slate-500 sm:block">
                {userEmail}
              </span>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Operations
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Delivery control center
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Create delivery requests and
            monitor their progress.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total deliveries
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {counts.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pending
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              {counts.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              In progress
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {counts.active}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Delivered
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {counts.delivered}
            </p>
          </div>
        </section>

        <UnifiedDispatchForm
          onDeliveryCreated={
            handleDeliveryCreated
          }
        />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                My deliveries
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Delivery requests created
                by your store.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchDeliveries}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:m-6">
              {error}
            </div>
          )}

          {loading &&
          deliveries.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading deliveries...
            </div>
          ) : deliveries.length ===
            0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                —
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No deliveries yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create your first delivery
                request above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Customer
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Item
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Address
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {deliveries.map(
                    (delivery) => (
                      <tr
                        key={
                          delivery.id
                        }
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-6 py-5">
                          <p className="font-medium text-slate-900">
                            {
                              delivery.customer_name
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {
                              delivery.customer_phone
                            }
                          </p>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-700">
                          {
                            delivery.item_description
                          }
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-700">
                          {
                            delivery.address
                          }
                        </td>

                        <td className="px-6 py-5">
                          <StatusBadge
                            status={
                              delivery.status
                            }
                          />
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-500">
                          {formatDate(
                            delivery.created_at
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}