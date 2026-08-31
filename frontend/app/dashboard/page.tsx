"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

import RetailerDashboard from "@/features/retailer/RetailerDashboard";

export default function DashboardPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session) {
        router.replace("/");
        return;
      }

      setAuthenticated(true);
      setCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!session) {
            router.replace("/");
          }
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />

          <p className="mt-4 text-sm text-slate-500">
            Checking your session...
          </p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <RetailerDashboard />;
}