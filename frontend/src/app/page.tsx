'use client';

import React from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import {
  Briefcase,
  CheckSquare,
  FileText,
  Users,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Welcome Hero Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">👋</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Welcome back, {user?.name}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Insight Blend CRM workspace & organic social media production manager.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Authenticated as {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Clients Card */}
        <Link
          href="/clients"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-[#1164A3] hover:shadow-sm"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-[#1164A3] group-hover:bg-[#1164A3] group-hover:text-white transition-colors">
              <Briefcase className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">Clients</h3>
            <p className="mt-1 text-xs text-slate-500">
              Manage client records, onboarding dates, and content targets.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#1164A3]">
            <span>View directory</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Tasks Card */}
        <Link
          href="/tasks"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-[#1164A3] hover:shadow-sm"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">Tasks</h3>
            <p className="mt-1 text-xs text-slate-500">
              Track deadlines, priorities, status transitions, and overdue items.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-amber-700">
            <span>Manage tasks</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Scripts Card */}
        <Link
          href="/scripts"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-[#1164A3] hover:shadow-sm"
        >
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-[#4A154B] group-hover:bg-[#4A154B] group-hover:text-white transition-colors">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">Scripts</h3>
            <p className="mt-1 text-xs text-slate-500">
              Draft reel/post scripts, manage revisions, and submit for review.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#4A154B]">
            <span>Open script editor</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Users Card (Restricted to Manager) */}
        {user?.role === 'MANAGER' ? (
          <Link
            href="/users"
            className="group flex flex-col justify-between rounded-xl border border-purple-200 bg-white p-5 shadow-xs transition hover:border-purple-600 hover:shadow-sm"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-800 group-hover:bg-purple-700 group-hover:text-white transition-colors">
                <Users className="h-5 w-5" />
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900">Users</h3>
                <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-700">
                  ADMIN
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Manage agency team members, permissions, and active status.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-purple-700">
              <span>Manage users</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ) : (
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 opacity-70">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-700">Users Admin</h3>
              <p className="mt-1 text-xs text-slate-400">
                User management is restricted strictly to Managers.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-medium text-slate-400">
              Manager role required
            </div>
          </div>
        )}
      </div>

      {/* Role Capabilities Reference */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <TrendingUp className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-800">
            Your Active Role Capabilities ({user?.role})
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-xs text-slate-600">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
            <span className="font-semibold text-slate-800">Client Visibility</span>
            <p className="mt-1 text-slate-500">
              Full read access to all clients and their monthly production content plans.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
            <span className="font-semibold text-slate-800">Script Workflows</span>
            <p className="mt-1 text-slate-500">
              {user?.role === 'WRITER'
                ? 'Draft scripts, save version snapshots, and submit for approval.'
                : 'Review scripts, approve, or request revisions with required feedback.'}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
            <span className="font-semibold text-slate-800">Production Dates</span>
            <p className="mt-1 text-slate-500">
              {user?.role === 'WRITER'
                ? 'View scheduled shoot, editing, and publishing deadlines.'
                : 'Manually reschedule shoot and publishing dates.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
