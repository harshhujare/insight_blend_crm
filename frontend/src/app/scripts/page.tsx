'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { FileText } from 'lucide-react';

export default function ScriptsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#4A154B]" />
                <h1 className="text-lg font-bold text-slate-900">Script Reviews & Revision Loop</h1>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Draft scripts, record version snapshots, and manage approvals.
              </p>
            </div>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-[#4A154B] border border-purple-200">
              Milestone 5 (SCRIPT-01)
            </span>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">Script Workspace Ready for Milestone 5</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Draft editor, version history snapshots, and reviewer feedback loops will be connected in SCRIPT-01 and SCRIPT-02.
            </p>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
