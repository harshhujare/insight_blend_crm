'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { Briefcase } from 'lucide-react';

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#1164A3]" />
                <h1 className="text-lg font-bold text-slate-900">Clients Directory</h1>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Manage client accounts, monthly plans, and historical content workloads.
              </p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-[#1164A3] border border-sky-200">
              Milestone 3 (CLI-01)
            </span>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">Client Directory Ready for Milestone 3</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Client CRUD, archiving with historical data preservation, and content plan generation will be connected in CLI-01 and PLAN-01.
            </p>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
