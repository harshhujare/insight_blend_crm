'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1A1D21] text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-purple-500 border-t-transparent" />
          <p className="text-xs font-medium text-slate-400">Loading Insight Blend workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-rose-800">Permission Denied</h2>
          <p className="mt-2 text-xs text-slate-600">
            Your role (<span className="font-semibold">{user.role}</span>) does not have permission
            to view this section.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-md bg-[#1164A3] px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
