'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { Client, ClientFormData, ClientStatus } from '@/types/client';
import { ClientModal } from '@/components/clients/ClientModal';
import { ArchiveConfirmModal } from '@/components/clients/ArchiveConfirmModal';
import {
  Briefcase,
  Calendar,
  Layers,
  CheckSquare,
  Film,
  Edit2,
  Archive,
  RotateCcw,
  ArrowLeft,
  AlertCircle,
  Clock,
  FileText,
  Sparkles,
} from 'lucide-react';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'MANAGER' || user?.role === 'STRATEGIST';

  const clientId = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'plans' | 'tasks'>('plans');

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Archive modal
  const [archiveModalOpen, setArchiveModalOpen] = useState<boolean>(false);
  const [archiveLoading, setArchiveLoading] = useState<boolean>(false);

  // Fetch client details
  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Client>(`/clients/${clientId}`);
      setClient(data);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load client details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  // Handle Edit Submit
  const handleEditSubmit = async (formData: ClientFormData) => {
    if (!client) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const updated = await api.patch<Client>(`/clients/${client.id}`, formData);
      setClient(updated);
      setEditModalOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to update client';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Archive Confirm
  const handleConfirmArchive = async () => {
    if (!client) return;
    setArchiveLoading(true);
    try {
      const updated = await api.patch<Client>(`/clients/${client.id}`, {
        status: 'INACTIVE' as ClientStatus,
      });
      setClient(updated);
      setArchiveModalOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to archive client';
      setError(msg);
    } finally {
      setArchiveLoading(false);
    }
  };

  // Handle Restore
  const handleRestore = async () => {
    if (!client) return;
    try {
      const updated = await api.patch<Client>(`/clients/${client.id}`, {
        status: 'ACTIVE' as ClientStatus,
      });
      setClient(updated);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to restore client';
      setError(msg);
    }
  };

  const counts = client?._count || { contentPlans: 0, tasks: 0, contentItems: 0 };
  const isActive = client?.status === 'ACTIVE';

  const formattedDate = client?.onboardingDate
    ? new Date(client.onboardingDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not set';

  const initials = client?.name
    ? client.name
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'IB';

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              href="/clients"
              className="flex items-center gap-1 font-medium text-slate-600 hover:text-[#1164A3] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Clients</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">
              {loading ? 'Loading client...' : client?.name || 'Client Details'}
            </span>
          </nav>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/clients')}
                className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-50"
              >
                Return to Directory
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-44 rounded-2xl bg-white border border-slate-200 p-6" />
              <div className="h-32 rounded-2xl bg-white border border-slate-200 p-6" />
              <div className="h-64 rounded-2xl bg-white border border-slate-200 p-6" />
            </div>
          ) : client ? (
            <>
              {/* Header Hero Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold shadow-xs ${
                        isActive ? 'bg-[#1164A3] text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {initials}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
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
                          {isActive ? 'Active Account' : 'Archived'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                          {client.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Onboarded: {formattedDate}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span>ID: {client.id.slice(0, 8)}...</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Role-Guarded Actions */}
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                        <span>Edit Client</span>
                      </button>
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => setArchiveModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700 shadow-xs hover:bg-rose-100 transition-colors"
                        >
                          <Archive className="h-3.5 w-3.5 text-rose-600" />
                          <span>Archive</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRestore}
                          className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-700 shadow-xs hover:bg-emerald-100 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Workload Summary Bar */}
                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Layers className="h-4 w-4 text-[#1164A3]" />
                      <span>Content Plans</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-slate-900">
                      {counts.contentPlans}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <CheckSquare className="h-4 w-4 text-emerald-600" />
                      <span>Associated Tasks</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-slate-900">
                      {counts.tasks}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Film className="h-4 w-4 text-purple-600" />
                      <span>Content Items</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-slate-900">
                      {counts.contentItems}
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Notes Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Client Overview & Strategy Notes
                  </h3>
                </div>
                <div className="mt-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {client.notes || (
                    <span className="italic text-slate-400">No notes recorded for this client.</span>
                  )}
                </div>
              </div>

              {/* Tabbed Content Sections: Ready for PLAN-01 and TASK-01 Integration */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
                {/* Tab Navigation Header */}
                <div className="flex items-center border-b border-slate-200 px-6 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('plans')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
                      activeTab === 'plans'
                        ? 'border-[#1164A3] text-[#1164A3]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Content Plans ({counts.contentPlans})</span>
                    <span className="rounded-full bg-sky-50 px-2 py-0.2 text-[10px] text-[#1164A3] border border-sky-200">
                      PLAN-01
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('tasks')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
                      activeTab === 'tasks'
                        ? 'border-[#1164A3] text-[#1164A3]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Tasks ({counts.tasks})</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] text-slate-600">
                      TASK-01
                    </span>
                  </button>
                </div>

                {/* Tab Body */}
                <div className="p-8">
                  {activeTab === 'plans' ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-[#1164A3]">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-slate-900">
                        Content Plans Ready for Milestone 3 (PLAN-01)
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Automatic generation of monthly content plans (default 8 reels & 8 static posts with customizable start date) will plug directly into this view in task PLAN-01b.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                        <CheckSquare className="h-6 w-6" />
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-slate-900">
                        Task Board Ready for Milestone 4 (TASK-01)
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Client task assignments, status tracking, overdue flagging, and comment threads will be connected in task TASK-01b.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Modal */}
              <ClientModal
                isOpen={editModalOpen}
                client={client}
                isLoading={modalLoading}
                serverError={modalError}
                onSubmit={handleEditSubmit}
                onClose={() => {
                  if (!modalLoading) setEditModalOpen(false);
                }}
              />

              {/* Archive Confirmation Dialog */}
              <ArchiveConfirmModal
                isOpen={archiveModalOpen}
                client={client}
                isLoading={archiveLoading}
                onConfirm={handleConfirmArchive}
                onClose={() => {
                  if (!archiveLoading) setArchiveModalOpen(false);
                }}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <Briefcase className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-slate-900">Client Not Found</h3>
              <p className="mt-1 text-xs text-slate-500">
                The requested client record does not exist or may have been deleted.
              </p>
              <Link
                href="/clients"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1164A3] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0d4f82]"
              >
                Back to Directory
              </Link>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
