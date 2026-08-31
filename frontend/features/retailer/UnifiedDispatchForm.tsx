"use client";

import {
  FormEvent,
  useState,
} from "react";

import { apiFetch } from "@/lib/api";
import {
  CreateDeliveryPayload,
  Delivery,
} from "@/types/delivery";

interface UnifiedDispatchFormProps {
  onDeliveryCreated?: (
    delivery: Delivery
  ) => void;
}

export default function UnifiedDispatchForm({
  onDeliveryCreated,
}: UnifiedDispatchFormProps) {
  const [form, setForm] =
    useState<CreateDeliveryPayload>({
      customer_name: "",
      customer_phone: "",
      address: "",
      item_description: "",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function updateField(
    field: keyof CreateDeliveryPayload,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload: CreateDeliveryPayload = {
        customer_name:
          form.customer_name.trim(),

        customer_phone:
          form.customer_phone.trim(),

        address:
          form.address.trim(),

        item_description:
          form.item_description.trim(),
      };

      if (
        !payload.customer_name ||
        !payload.customer_phone ||
        !payload.address ||
        !payload.item_description
      ) {
        throw new Error(
          "Please complete all delivery fields."
        );
      }

      const response = await apiFetch(
        "/api/deliveries",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Failed to create delivery."
        );
      }

      const createdDelivery =
        result?.data ||
        result?.delivery;

      setForm({
        customer_name: "",
        customer_phone: "",
        address: "",
        item_description: "",
      });

      setSuccess(
        "Delivery request created successfully."
      );

      if (createdDelivery) {
        onDeliveryCreated?.(
          createdDelivery as Delivery
        );
      }
    } catch (submissionError) {
      console.error(
        "Delivery creation failed:",
        submissionError
      );

      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create delivery."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          New request
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Create a delivery
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Enter the customer and item information
          for this delivery.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="customer_name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Customer name
            </label>

            <input
              id="customer_name"
              name="customer_name"
              type="text"
              placeholder="Jane Doe"
              value={form.customer_name}
              onChange={(event) =>
                updateField(
                  "customer_name",
                  event.target.value
                )
              }
              disabled={loading}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="customer_phone"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Customer phone
            </label>

            <input
              id="customer_phone"
              name="customer_phone"
              type="tel"
              placeholder="0712345678"
              value={form.customer_phone}
              onChange={(event) =>
                updateField(
                  "customer_phone",
                  event.target.value
                )
              }
              disabled={loading}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="address"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Delivery address
          </label>

          <input
            id="address"
            name="address"
            type="text"
            placeholder="Kilimani, Nairobi"
            value={form.address}
            onChange={(event) =>
              updateField(
                "address",
                event.target.value
              )
            }
            disabled={loading}
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="item_description"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Item description
          </label>

          <textarea
            id="item_description"
            name="item_description"
            rows={4}
            placeholder="Samsung 32-inch Smart TV"
            value={form.item_description}
            onChange={(event) =>
              updateField(
                "item_description",
                event.target.value
              )
            }
            disabled={loading}
            required
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loading
              ? "Creating..."
              : "Create delivery"}
          </button>
        </div>
      </form>
    </section>
  );
}