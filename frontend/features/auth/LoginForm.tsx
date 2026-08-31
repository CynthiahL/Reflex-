"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { apiFetch } from "@/lib/api";
import { AuthResponse } from "@/types/auth";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      /*
       * Step 1:
       * Authenticate with Supabase Auth.
       */
      const {
        data: authData,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (!authData.session) {
        throw new Error(
          "Login succeeded but no session was created."
        );
      }

      /*
       * Step 2:
       * Ask Cynthia's backend to verify the JWT
       * and retrieve the user's profile and role.
       */
      const response = await apiFetch("/api/auth", {
        method: "POST",
      });

      const result =
        (await response.json()) as Partial<AuthResponse> & {
          error?: string;
        };

      if (!response.ok) {
        await supabase.auth.signOut();

        throw new Error(
          result.error ||
            "Your account could not be verified."
        );
      }

      if (!result.user) {
        await supabase.auth.signOut();

        throw new Error(
          "No user profile was returned by the server."
        );
      }

      /*
       * Step 3:
       * Normalize the role because the current project
       * has used both lowercase and uppercase role values
       * in different backend areas.
       */
      const role = result.user.role.toUpperCase();

      /*
       * Retailer is the dashboard owned by you.
       */
      if (role === "RETAILER") {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      /*
       * We don't build dispatcher/rider interfaces here.
       */
      await supabase.auth.signOut();

      throw new Error(
        `This account has the ${role} role. The retailer dashboard is only available to retailer accounts.`
      );
    } catch (loginError) {
      console.error("Login failed:", loginError);

      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
          R
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome to Reflex
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Sign in to manage your store deliveries.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="retailer@example.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              disabled={loading}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              disabled={loading}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}