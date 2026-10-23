'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { Client, ClientFormData, ClientStatus } from '@/types/client';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientModal } from '@/components/clients/ClientModal';
import { ArchiveConfirmModal } from '@/components/clients/ArchiveConfirmModal';
import { ClientSkeleton } from '@/components/clients/ClientSkeleton';
import {
  Briefcase,
  Plus,
  Search,
  X,
  AlertCircle,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

type FilterStatus = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function ClientsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'MANAGER' || user?.role === 'STRATEGIST';

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingClient(null);
    setModalError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setModalError(null);
    setModalOpen(true);
  };

  // Handle Create or Edit Submit
  const handleFormSubmit = async (formData: ClientFormData) => {
    setModalLoading(true);
    setModalError(null);
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
      setModalOpen(false);
      setEditingClient(null);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to save client';
      setModalError(msg);
    } finally {
      setModalLoading(false);
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

  // Status counts for tabs
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
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4A154B] text-white shadow-sm">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">Clients Directory</h1>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {clients.length} {clients.length === 1 ? 'account' : 'accounts'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Manage agency client accounts, monthly content workloads, and script production pipelines.
                </p>
              </div>
            </div>

            {/* Role-Guarded 'New Client' Button (MANAGER, STRATEGIST only) */}
            {canManage && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#1164A3] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0d4f82] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Client</span>
              </button>
            )}
          </div>

          {/* Controls Bar: Search & Status Filter Tabs */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            {/* Real-time Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients by name or category..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1164A3] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1164A3]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Segmented Control */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Active</span>
                {statusFilter === 'ALL' && activeCount > 0 && (
                  <span className="ml-1 text-[10px] text-slate-400">({activeCount})</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Archived</span>
                {statusFilter === 'ALL' && inactiveCount > 0 && (
                  <span className="ml-1 text-[10px] text-slate-400">({inactiveCount})</span>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner with Retry (FR-12) */}
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchClients}
                className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Content States: Loading, Empty, or Client Grid */}
          {loading ? (
            <ClientSkeleton />
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FolderOpen className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No clients match your filter'
                  : 'No clients yet'}
              </h3>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try adjusting your search terms or clearing status filters to see available clients.'
                  : 'Onboard your first client account to begin planning monthly reels and tracking script deliverables.'}
              </p>
              <div className="mt-5 flex items-center gap-3">
                {searchQuery || statusFilter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : canManage ? (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="flex items-center gap-1.5 rounded-lg bg-[#1164A3] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0d4f82] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Client</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  userRole={user?.role}
                  onEdit={handleOpenEdit}
                  onArchive={handleOpenArchive}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}

          {/* Create / Edit Client Modal */}
          <ClientModal
            isOpen={modalOpen}
            client={editingClient}
            isLoading={modalLoading}
            serverError={modalError}
            onSubmit={handleFormSubmit}
            onClose={() => {
              if (!modalLoading) {
                setModalOpen(false);
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
