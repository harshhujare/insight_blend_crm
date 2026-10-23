'use client';

import React, { useEffect } from 'react';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="archive-dialog-title"
        aria-describedby="archive-dialog-description"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDF2F5] text-[#E01E5A] ring-4 ring-[#E01E5A]/10">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 id="archive-dialog-title" className="text-base font-bold text-slate-900">
              Archive Client Account
            </h3>
            <p id="archive-dialog-description" className="mt-1 text-xs text-slate-500">
              Are you sure you want to archive <span className="font-semibold text-slate-800">“{client.name}”</span>?
            </p>
          </div>
        </div>

        {/* Data Preservation Guarantee Box (FR-03 & FR-12) */}
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <span className="font-semibold">Historical Data Preserved:</span>
              <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-800">
                All associated monthly content plans, scripts, tasks, and audit logs remain safely preserved. This account can be restored to active status at any time.
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
            className="flex items-center gap-1.5 rounded-lg bg-[#E01E5A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#c7184f] active:bg-[#af1545] transition-colors disabled:opacity-60"
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

