'use client';

import React from 'react';
import { AlertTriangle, X, ShieldCheck, Loader2 } from 'lucide-react';
import { Client } from '@/types/client';

interface ArchiveConfirmModalProps {
  isOpen: boolean;
  client: Client | null;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ArchiveConfirmModal({
  isOpen,
  client,
  isLoading,
  onConfirm,
  onClose,
}: ArchiveConfirmModalProps) {
  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-4 ring-amber-500/10">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Archive Client Account</h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to archive <span className="font-semibold text-slate-800">“{client.name}”</span>?
            </p>
          </div>
        </div>

        {/* Data Preservation Guarantee Box (FR-03 & FR-12) */}
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="text-xs text-emerald-800">
              <span className="font-semibold">Historical Data Preserved:</span>
              <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-700">
                All associated monthly content plans, tasks, scripts, and production logs will remain safely stored and accessible. You can reactivate this client at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Archiving...</span>
              </>
            ) : (
              <span>Archive Client</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
