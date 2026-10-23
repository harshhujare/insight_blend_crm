'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { CheckSquare } from 'lucide-react';

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-amber-600" />
                <h1 className="text-lg font-bold text-slate-900">Task Management</h1>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Track assigned tasks, priority, due dates, and overdue workflows.
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
              Milestone 4 (TASK-01)
            </span>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <CheckSquare className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">Task Management Ready for Milestone 4</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Task assignment, status transitions, and overdue detection will be connected in TASK-01 and DASH-01.
            </p>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
