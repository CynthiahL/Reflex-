'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '../../lib/supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'retailer' | 'rider'>('retailer');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const router = useRouter();

  // =========================================================
  // FORM MODE SWITCH
  // =========================================================

  const switchMode = (signup: boolean) => {
    setIsSignUp(signup);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // =========================================================
  // LOGIN / SIGN-UP
  // =========================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // =====================================================
      // SIGN-UP
      // =====================================================

      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error('Full name is required.');
        }

        if (!['retailer', 'rider'].includes(role)) {
          throw new Error('Invalid workspace role selected.');
        }

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role,
            },
          },
        });

        if (authError) {
          throw authError;
        }

        if (!authData.user) {
          throw new Error(
            'Registration failed. Identity record was not created.'
          );
        }

        setSuccessMsg(
          '🎉 Account created successfully! Please check your email to verify your account before signing in.'
        );

        setFullName('');
        setPassword('');
        setIsSignUp(false);

        return;
      }

      // =====================================================
      // LOGIN — SUPABASE
      // =====================================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.session) {
        throw new Error(
          'Authentication succeeded, but no valid session was established.'
        );
      }

      // =====================================================
      // VERIFY API CONFIGURATION
      // =====================================================

      if (!API_URL) {
        throw new Error(
          'Frontend API configuration is missing. NEXT_PUBLIC_API_URL is not available in this deployment.'
        );
      }

      const normalizedApiUrl = API_URL.replace(/\/+$/, '');

      // =====================================================
      // VERIFY SESSION WITH REFLEX BACKEND
      // =====================================================

      let response: Response;

      try {
        response = await fetch(`${normalizedApiUrl}/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authData.session.access_token}`,
          },
        });
      } catch (networkError) {
        console.error('Backend network request failed:', networkError);

        throw new Error(
          `Unable to connect to the Reflex backend. Backend URL: ${normalizedApiUrl}`
        );
      }

      // =====================================================
      // PROCESS BACKEND RESPONSE
      // =====================================================

      let result: {
        error?: string;
        message?: string;
        user?: {
          id: string;
          email: string;
          role: 'retailer' | 'rider';
          full_name: string;
        };
      } = {};

      try {
        result = await response.json();
      } catch {
        throw new Error(
          `Reflex backend returned an invalid response (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Profile verification failed (HTTP ${response.status}).`
        );
      }

      // =====================================================
      // LOGIN SUCCESS
      // =====================================================

      router.replace('/dashboard');
    } catch (err: unknown) {
      console.error('Authentication error:', err);

      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(
          'An unexpected authentication error occurred.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          {isSignUp
            ? 'Register your Reflex delivery account'
            : 'Access your Reflex delivery command terminal'}
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-100 font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4 border border-green-100 font-medium">
          ✅ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Full Name
              </label>

              <input
                type="text"
                placeholder="Amina Mwangi"
                className="w-full p-3 border rounded-lg text-sm bg-gray-50 text-black focus:bg-white focus:outline-blue-500 transition"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Role
              </label>

              <select
                className="w-full p-3 border rounded-lg text-sm bg-gray-50 text-black focus:bg-white focus:outline-blue-500 transition"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as 'retailer' | 'rider')
                }
              >
                <option value="retailer">Retailer</option>
                <option value="rider">Rider</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Email Address
          </label>

          <input
            type="email"
            placeholder="manager@store.co.ke"
            className="w-full p-3 border rounded-lg text-sm bg-gray-50 text-black focus:bg-white focus:outline-blue-500 transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Password
          </label>

          <input
            type="password"
            placeholder="••••••••"
            className="w-full p-3 border rounded-lg text-sm bg-gray-50 text-black focus:bg-white focus:outline-blue-500 transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg text-sm font-bold tracking-wide hover:bg-blue-700 disabled:bg-gray-400 shadow-sm transition"
        >
          {loading
            ? isSignUp
              ? 'Creating Account...'
              : 'Authenticating Profile...'
            : isSignUp
            ? 'Register Account'
            : 'Secure Login'}
        </button>

        <div className="text-center mt-4 text-sm text-gray-600">
          {isSignUp ? (
            <button
              type="button"
              onClick={() => switchMode(false)}
              className="text-blue-600 hover:underline"
            >
              Already have an account? Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode(true)}
              className="text-blue-600 hover:underline"
            >
              Don’t have an account? Register
            </button>
          )}
        </div>
      </form>
    </div>
  );
}