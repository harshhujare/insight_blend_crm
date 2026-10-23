'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, Shield, Sparkles } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: cleanEmail, password });
      router.replace(redirectPath);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please verify your credentials or server connection.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setErrorMessage(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A1D21] px-4 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-[#35373B] bg-[#222529] p-8 shadow-2xl">
        {/* Workspace Brand Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4A154B] text-xl font-bold text-white shadow-lg ring-2 ring-purple-400/20">
            IB
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Insight Blend</h1>
          <p className="mt-1 text-xs text-slate-400">
            Sign in to your organic social media agency workspace
          </p>
        </div>

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="ml-1 text-rose-400 hover:text-rose-200"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. manager@insightblend.local"
              disabled={submitting}
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-[#3E4249] bg-[#1A1D21] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#1164A3] focus:outline-none focus:ring-1 focus:ring-[#1164A3] disabled:opacity-50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
            </div>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={submitting}
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#3E4249] bg-[#1A1D21] px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:border-[#1164A3] focus:outline-none focus:ring-1 focus:ring-[#1164A3] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1164A3] py-2.5 px-4 text-sm font-semibold text-white shadow transition-colors hover:bg-[#0E548A] active:bg-[#0B436E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo Seeded Accounts Quick-Fill */}
        <div className="mt-8 border-t border-[#35373B] pt-5">
          <div className="mb-2.5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Quick Demo Accounts (Password123!)
            </span>
            <span className="text-[10px] text-slate-500">Click to fill</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('manager@insightblend.local')}
              disabled={submitting}
              className="flex flex-col items-center rounded-lg border border-[#3E4249] bg-[#1A1D21] p-2 text-center transition-colors hover:border-purple-500 hover:bg-[#282B30] disabled:opacity-50"
            >
              <span className="text-xs font-semibold text-purple-300">Manager</span>
              <span className="mt-0.5 text-[10px] text-slate-400 truncate max-w-full">Alex</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('strategist@insightblend.local')}
              disabled={submitting}
              className="flex flex-col items-center rounded-lg border border-[#3E4249] bg-[#1A1D21] p-2 text-center transition-colors hover:border-sky-500 hover:bg-[#282B30] disabled:opacity-50"
            >
              <span className="text-xs font-semibold text-sky-300">Strategist</span>
              <span className="mt-0.5 text-[10px] text-slate-400 truncate max-w-full">Sam</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('writer@insightblend.local')}
              disabled={submitting}
              className="flex flex-col items-center rounded-lg border border-[#3E4249] bg-[#1A1D21] p-2 text-center transition-colors hover:border-emerald-500 hover:bg-[#282B30] disabled:opacity-50"
            >
              <span className="text-xs font-semibold text-emerald-300">Writer</span>
              <span className="mt-0.5 text-[10px] text-slate-400 truncate max-w-full">Casey</span>
            </button>
          </div>
        </div>

        {/* Security Invariant Badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Shield className="h-3.5 w-3.5 text-slate-400" />
          <span>Server-Side RBAC & Session Security Enforced</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#1A1D21] text-slate-300">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#1164A3]" />
            <p className="text-xs text-slate-400">Loading sign in...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

