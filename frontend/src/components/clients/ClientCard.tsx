'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Layers,
  CheckSquare,
  Film,
  Edit2,
  Archive,
  RotateCcw,
  ExternalLink,
  Briefcase,
} from 'lucide-react';
import { Client } from '@/types/client';
import { Role } from '@/types/auth';

interface ClientCardProps {
  client: Client;
  userRole?: Role;
  onEdit: (client: Client) => void;
  onArchive: (client: Client) => void;
  onRestore: (client: Client) => void;
}

export function ClientCard({
  client,
  userRole,
  onEdit,
  onArchive,
  onRestore,
}: ClientCardProps) {
  const canManage = userRole === 'MANAGER' || userRole === 'STRATEGIST';

  const formattedDate = client.onboardingDate
    ? new Date(client.onboardingDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not set';

  const initials = client.name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const counts = client._count || { contentPlans: 0, tasks: 0, contentItems: 0 };
  const isActive = client.status === 'ACTIVE';

  return (
    <div
      className={`group flex flex-col justify-between rounded-xl border bg-white p-5 transition-all hover:shadow-md ${
        isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200/80 bg-slate-50/50 opacity-90'
      }`}
    >
      <div>
        {/* Top Header: Avatar + Title + Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-xs ${
                isActive
                  ? 'bg-[#1164A3] text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {initials || <Briefcase className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <Link
                href={`/clients/${client.id}`}
                className="group/link flex items-center gap-1.5 truncate text-sm font-bold text-slate-900 hover:text-[#1164A3] transition-colors"
              >
                <span className="truncate">{client.name}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 text-slate-400 transition-opacity" />
              </Link>
              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 mt-1">
                {client.category}
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-400'
              }`}
            />
            {isActive ? 'Active' : 'Archived'}
          </span>
        </div>

        {/* Onboarding Date */}
        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>Onboarded: {formattedDate}</span>
        </div>

        {/* Notes preview */}
        {client.notes && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {client.notes}
          </p>
        )}
      </div>

      {/* Bottom Section: Summary Counts & Actions */}
      <div className="mt-5 border-t border-slate-100 pt-3.5">
        <div className="flex items-center justify-between">
          {/* Workload Counts */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1" title={`${counts.contentPlans} Content Plans`}>
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold">{counts.contentPlans}</span>
              <span className="hidden sm:inline text-[10px] text-slate-400">plans</span>
            </span>
            <span className="flex items-center gap-1" title={`${counts.tasks} Associated Tasks`}>
              <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold">{counts.tasks}</span>
              <span className="hidden sm:inline text-[10px] text-slate-400">tasks</span>
            </span>
            <span className="flex items-center gap-1" title={`${counts.contentItems} Content Items`}>
              <Film className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold">{counts.contentItems}</span>
              <span className="hidden sm:inline text-[10px] text-slate-400">items</span>
            </span>
          </div>

          {/* Role-Aware Action Buttons (Section 3 Permissions) */}
          <div className="flex items-center gap-1">
            {canManage ? (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(client)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Edit Client"
                  aria-label="Edit Client"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                {isActive ? (
                  <button
                    type="button"
                    onClick={() => onArchive(client)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    title="Archive Client"
                    aria-label="Archive Client"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRestore(client)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    title="Restore Client to Active"
                    aria-label="Restore Client to Active"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            ) : (
              <Link
                href={`/clients/${client.id}`}
                className="text-[11px] font-medium text-[#1164A3] hover:underline"
              >
                View
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
