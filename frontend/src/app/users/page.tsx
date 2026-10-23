'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { Users, Shield } from 'lucide-react';

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={['MANAGER']}>
      <AppShell>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-700" />
                <h1 className="text-lg font-bold text-slate-900">User Administration</h1>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Manage agency users, permissions, and active status (strictly restricted to Managers).
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
              <Shield className="h-3.5 w-3.5" />
              Manager Access Only
            </span>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-purple-600/60" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">User Management Console</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Manager interface to create team accounts, assign roles (`MANAGER`, `STRATEGIST`, `WRITER`), and toggle active status.
            </p>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
