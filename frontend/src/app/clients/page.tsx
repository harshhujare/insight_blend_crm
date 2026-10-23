'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { Client, ClientFormData, ClientStatus } from '@/types/client';
import { ClientDrawer } from '@/components/clients/ClientDrawer';
import { ArchiveConfirmModal } from '@/components/clients/ArchiveConfirmModal';
import { ClientSkeleton } from '@/components/clients/ClientSkeleton';
import {
  Hash,
  Plus,
  Search,
  X,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
  Film,
  CheckSquare,
  Edit2,
  Archive,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

type FilterStatus = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function ClientsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'MANAGER' || user?.role === 'STRATEGIST';

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  // Slide-over Right Thread Drawer states
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Archive modal states
  const [archiveModalOpen, setArchiveModalOpen] = useState<boolean>(false);
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);
  const [archiveLoading, setArchiveLoading] = useState<boolean>(false);

  // Fetch clients from GET /api/clients
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | undefined> = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const data = await api.get<Client[]>('/clients', { params });
      setClients(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load clients';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 200);

    return () => clearTimeout(timer);
  }, [fetchClients]);

  // Open Create Drawer
  const handleOpenCreate = () => {
    setEditingClient(null);
    setDrawerError(null);
    setDrawerOpen(true);
  };

  // Open Edit Drawer
  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setDrawerError(null);
    setDrawerOpen(true);
  };

  // Handle Create or Edit Submit via Drawer
  const handleFormSubmit = async (formData: ClientFormData) => {
    setDrawerLoading(true);
    setDrawerError(null);
    try {
      if (editingClient) {
        // PATCH /api/clients/:id
        const updated = await api.patch<Client>(`/clients/${editingClient.id}`, formData);
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        // POST /api/clients
        const created = await api.post<Client>('/clients', formData);
        setClients((prev) => [created, ...prev]);
      }
      setDrawerOpen(false);
      setEditingClient(null);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to save client';
      setDrawerError(msg);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Handle Archive Confirmation Request
  const handleOpenArchive = (client: Client) => {
    setClientToArchive(client);
    setArchiveModalOpen(true);
  };

  // Execute Archive (PATCH status: INACTIVE)
  const handleConfirmArchive = async () => {
    if (!clientToArchive) return;
    setArchiveLoading(true);
    try {
      const updated = await api.patch<Client>(`/clients/${clientToArchive.id}`, {
        status: 'INACTIVE' as ClientStatus,
      });
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setArchiveModalOpen(false);
      setClientToArchive(null);
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

  // Restore client to ACTIVE
  const handleRestore = async (client: Client) => {
    try {
      const updated = await api.patch<Client>(`/clients/${client.id}`, {
        status: 'ACTIVE' as ClientStatus,
      });
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
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

  // Filtered status counts
  const activeCount = useMemo(
    () => clients.filter((c) => c.status === 'ACTIVE').length,
    [clients]
  );
  const inactiveCount = useMemo(
    () => clients.filter((c) => c.status === 'INACTIVE').length,
    [clients]
  );

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-4 max-w-7xl mx-auto">
          {/* Sticky Slack Header Bar */}
          <div className="sticky top-0 z-20 -mt-4 md:-mt-8 -mx-4 md:-mx-8 border-b border-[#E2E2E2] bg-white px-4 md:px-8 py-3 shadow-2xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Channel / Title Bar with Count */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#19171D] text-white">
                  <Hash className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold text-slate-900">clients-directory</h1>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                      {clients.length} {clients.length === 1 ? 'account' : 'accounts'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    High-density agency client workspace, content targets, and script pipeline.
                  </p>
                </div>
              </div>

              {/* Controls: Search, Status Filter Pills, and Slack Green '+ Add Client' */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Instant Search Bar */}
                <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full sm:w-56 rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1264A3] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1264A3]/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Segmented Status Filter Pills */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      statusFilter === 'ACTIVE'
                        ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Active</span>
                    {statusFilter === 'ALL' && activeCount > 0 && (
                      <span className="text-[10px] text-slate-400">({activeCount})</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('INACTIVE')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      statusFilter === 'INACTIVE'
                        ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>Archived</span>
                    {statusFilter === 'ALL' && inactiveCount > 0 && (
                      <span className="text-[10px] text-slate-400">({inactiveCount})</span>
                    )}
                  </button>
                </div>

                {/* Role-Gated '+ Add Client' Slack Green Button */}
                {canManage && (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="flex items-center gap-1.5 rounded-lg bg-[#007A5A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#148567] active:bg-[#005A42] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Client</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Banner with Retry (FR-12) */}
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-[#E01E5A]/30 bg-[#FDF2F5] p-3 text-xs text-[#E01E5A] shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#E01E5A]" />
                <span className="font-medium">{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchClients}
                className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[#E01E5A] border border-[#E01E5A]/30 hover:bg-[#FDF2F5]"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Main Content Area */}
          {loading ? (
            <ClientSkeleton />
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-2xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <FolderOpen className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No clients match your filter'
                  : 'No client accounts onboarded yet'}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try modifying your search query or switching your status filter pills to locate accounts.'
                  : 'Start by creating your first client account to initialize monthly content plans and script pipelines.'}
              </p>
              <div className="mt-4 flex items-center gap-2.5">
                {searchQuery || statusFilter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : canManage ? (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="flex items-center gap-1.5 rounded-lg bg-[#007A5A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#148567]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Client</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            /* High-Density Scannable Table */
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="border-b border-[#E2E2E2] bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        # Client Channel
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        Category
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        Onboarding Date
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        Workload Counters
                      </th>
                      {canManage && (
                        <th scope="col" className="px-4 py-3 text-right font-semibold">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clients.map((client) => {
                      const isActive = client.status === 'ACTIVE';
                      const slug = client.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');

                      const formattedDate = client.onboardingDate
                        ? new Date(client.onboardingDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Not set';

                      const counts = client._count || {
                        contentPlans: 0,
                        tasks: 0,
                        contentItems: 0,
                      };

                      return (
                        <tr
                          key={client.id}
                          className="group hover:bg-[#F8F8F8] transition-colors"
                        >
                          {/* Client Name with # prefix */}
                          <td className="px-4 py-3">
                            <Link
                              href={`/clients/${client.id}`}
                              className="flex items-center gap-2 group/link"
                            >
                              <span className="font-mono text-xs font-bold text-slate-400 group-hover/link:text-[#1264A3]">
                                #
                              </span>
                              <span className="font-semibold text-slate-900 group-hover/link:text-[#1264A3] transition-colors">
                                {client.name}
                              </span>
                              <ChevronRight className="h-3 w-3 opacity-0 text-slate-400 group-hover/link:opacity-100 transition-opacity" />
                            </Link>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                              #{slug}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="px-3 py-3">
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200/70">
                              {client.category}
                            </span>
                          </td>

                          {/* Onboarding Date */}
                          <td className="px-3 py-3 text-slate-600">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>{formattedDate}</span>
                            </div>
                          </td>

                          {/* Status Badge (Icon + Label per NFR-08) */}
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {isActive ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Archive className="h-3 w-3 text-slate-500" />
                              )}
                              <span>{isActive ? 'Active' : 'Archived'}</span>
                            </span>
                          </td>

                          {/* Workload Counters */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-[#1264A3] border border-sky-200/70"
                                title={`${counts.contentPlans} Content Plans`}
                              >
                                <Layers className="h-3 w-3" />
                                <span>{counts.contentPlans} plans</span>
                              </span>
                              <span
                                className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200/70"
                                title={`${counts.contentItems} Content Items`}
                              >
                                <Film className="h-3 w-3" />
                                <span>{counts.contentItems} items</span>
                              </span>
                              <span
                                className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/70"
                                title={`${counts.tasks} Tasks`}
                              >
                                <CheckSquare className="h-3 w-3" />
                                <span>{counts.tasks} tasks</span>
                              </span>
                            </div>
                          </td>

                          {/* Actions (Only rendered for MANAGER / STRATEGIST) */}
                          {canManage && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(client)}
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                  title="Edit Client in Thread Drawer"
                                  aria-label={`Edit ${client.name}`}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                {isActive ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenArchive(client)}
                                    className="rounded p-1 text-slate-400 hover:bg-[#FDF2F5] hover:text-[#E01E5A] transition-colors"
                                    title="Archive Client"
                                    aria-label={`Archive ${client.name}`}
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRestore(client)}
                                    className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                    title="Restore Client to Active"
                                    aria-label={`Restore ${client.name}`}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Slack Right-Thread Drawer for Create / Edit */}
          <ClientDrawer
            isOpen={drawerOpen}
            client={editingClient}
            isLoading={drawerLoading}
            serverError={drawerError}
            onSubmit={handleFormSubmit}
            onClose={() => {
              if (!drawerLoading) {
                setDrawerOpen(false);
                setEditingClient(null);
              }
            }}
          />

          {/* Archive Confirmation Dialog (FR-12 & Data Preservation Notice) */}
          <ArchiveConfirmModal
            isOpen={archiveModalOpen}
            client={clientToArchive}
            isLoading={archiveLoading}
            onConfirm={handleConfirmArchive}
            onClose={() => {
              if (!archiveLoading) {
                setArchiveModalOpen(false);
                setClientToArchive(null);
              }
            }}
          />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
