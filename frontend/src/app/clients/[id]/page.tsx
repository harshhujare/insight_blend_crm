'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { Client, ClientFormData, ClientStatus } from '@/types/client';
import { Task, TaskFormData } from '@/types/task';
import { ClientDrawer } from '@/components/clients/ClientDrawer';
import { ArchiveConfirmModal } from '@/components/clients/ArchiveConfirmModal';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import { TaskSkeleton } from '@/components/tasks/TaskSkeleton';
import {
  Hash,
  Calendar,
  Layers,
  CheckSquare,
  Film,
  Edit2,
  Archive,
  RotateCcw,
  ArrowLeft,
  AlertCircle,
  FileText,
  Sparkles,
  CheckCircle2,
  Activity,
  ChevronDown,
  Info,
  Plus,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

type TabKey = 'plans' | 'tasks' | 'activity';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'MANAGER' || user?.role === 'STRATEGIST';

  const clientId = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab state: plans | tasks | activity
  const [activeTab, setActiveTab] = useState<TabKey>('plans');

  // Expandable notes dropdown/popover
  const [notesExpanded, setNotesExpanded] = useState<boolean>(false);

  // Client Edit Drawer
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Client Archive modal
  const [archiveModalOpen, setArchiveModalOpen] = useState<boolean>(false);
  const [archiveLoading, setArchiveLoading] = useState<boolean>(false);

  // Client Tasks Tab State
  const [clientTasks, setClientTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Task Drawer State (inside Client Channel)
  const [taskDrawerOpen, setTaskDrawerOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDrawerLoading, setTaskDrawerLoading] = useState<boolean>(false);
  const [taskDrawerError, setTaskDrawerError] = useState<string | null>(null);

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

  // Fetch tasks for this client
  const fetchClientTasks = useCallback(async () => {
    if (!clientId) return;
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await api.get<Task[]>('/tasks', {
        params: { clientId },
      });
      setClientTasks(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load client tasks';
      setTasksError(msg);
    } finally {
      setTasksLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchClientTasks();
    }
  }, [activeTab, fetchClientTasks]);

  // Handle Client Edit Submit via Right-Thread Drawer
  const handleEditSubmit = async (formData: ClientFormData) => {
    if (!client) return;
    setDrawerLoading(true);
    setDrawerError(null);
    try {
      const updated = await api.patch<Client>(`/clients/${client.id}`, formData);
      setClient(updated);
      setDrawerOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to update client';
      setDrawerError(msg);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Handle Client Archive Confirm
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

  // Handle Client Restore
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

  // Task Drawer Handlers
  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskDrawerError(null);
    setTaskDrawerOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDrawerError(null);
    setTaskDrawerOpen(true);
  };

  const handleTaskDrawerSubmit = async (formData: TaskFormData) => {
    setTaskDrawerLoading(true);
    setTaskDrawerError(null);
    try {
      if (editingTask) {
        // PATCH /api/tasks/:id
        const payload: Partial<TaskFormData> = {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          dueDate: formData.dueDate,
          assigneeId: formData.assigneeId,
        };
        const updated = await api.patch<Task>(`/api/tasks/${editingTask.id}`, payload);
        setClientTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        // POST /api/tasks (ensures clientId matches)
        const payload = {
          ...formData,
          clientId: clientId,
        };
        const created = await api.post<Task>('/api/tasks', payload);
        setClientTasks((prev) => [created, ...prev]);
      }
      setTaskDrawerOpen(false);
      setEditingTask(null);
      // Refresh client summary counts if needed
      fetchClient();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to save task';
      setTaskDrawerError(msg);
    } finally {
      setTaskDrawerLoading(false);
    }
  };

  const counts = client?._count || { contentPlans: 0, tasks: 0, contentItems: 0 };
  const isActive = client?.status === 'ACTIVE';

  const formattedDate = client?.onboardingDate
    ? new Date(client.onboardingDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not set';

  const slug = client?.name
    ? client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : 'channel';

  const clientOverdueTasksCount = useMemo(
    () => clientTasks.filter((t) => t.isOverdue).length,
    [clientTasks]
  );

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-4 max-w-7xl mx-auto">
          {/* Back link */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              href="/clients"
              className="flex items-center gap-1 font-medium text-slate-600 hover:text-[#1264A3] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Clients Directory</span>
            </Link>
            <span>/</span>
            <span className="font-mono text-slate-800 font-semibold">
              #{slug}
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-[#E01E5A]/30 bg-[#FDF2F5] p-3 text-xs text-[#E01E5A] shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#E01E5A]" />
                <span className="font-medium">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/clients')}
                className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[#E01E5A] border border-[#E01E5A]/30 hover:bg-[#FDF2F5]"
              >
                Return to Directory
              </button>
            </div>
          )}

          {/* Channel Hero Header */}
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-5 w-44 rounded bg-slate-200" />
                    <div className="h-3 w-28 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-8 w-24 rounded-lg bg-slate-100" />
              </div>
              <div className="h-4 w-full rounded bg-slate-100" />
            </div>
          ) : client ? (
            <>
              {/* Slack Channel Header Card */}
              <div className="rounded-xl border border-[#E2E2E2] bg-white shadow-2xs overflow-hidden">
                <div className="p-5 md:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Channel Title & Metadata Pills */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#19171D] text-white shadow-xs">
                        <Hash className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                            #{slug}
                          </h1>
                          <span className="text-xs text-slate-400 font-medium">
                            ({client.name})
                          </span>

                          {/* Status Badge with Icon + Label per NFR-08 */}
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
                            <span>{isActive ? 'Active Channel' : 'Archived'}</span>
                          </span>
                        </div>

                        {/* Metadata Pills */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 border border-slate-200">
                            {client.category}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>Onboarded: {formattedDate}</span>
                          </span>

                          {/* Notes Popover Toggle */}
                          <button
                            type="button"
                            onClick={() => setNotesExpanded((prev) => !prev)}
                            className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 font-medium text-[#1264A3] border border-sky-200/80 hover:bg-sky-50 transition-colors"
                          >
                            <FileText className="h-3 w-3 text-[#1264A3]" />
                            <span>Strategy Notes</span>
                            <ChevronDown
                              className={`h-3 w-3 transition-transform duration-200 ${
                                notesExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Role-Gated Actions (Section 3) */}
                    {canManage && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDrawerOpen(true)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                          <span>Edit Client</span>
                        </button>
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => setArchiveModalOpen(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-[#E01E5A]/30 bg-[#FDF2F5] px-3 py-1.5 text-xs font-semibold text-[#E01E5A] shadow-2xs hover:bg-[#FDF2F5]/80 transition-colors"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            <span>Archive</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRestore}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expandable Notes Popover Panel */}
                  {notesExpanded && (
                    <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/50 p-4 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-[#1264A3]" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Strategy Notes & Brand Guidelines
                          </h3>
                        </div>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setDrawerOpen(true)}
                            className="text-[11px] font-semibold text-[#1264A3] hover:underline"
                          >
                            Edit in Thread
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {client.notes || 'No strategic notes recorded for this client.'}
                      </p>
                    </div>
                  )}

                  {/* Workload Summary Bar */}
                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                    <div className="rounded-lg border border-slate-100 bg-[#F8F8F8] p-3 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500">
                        <Layers className="h-3.5 w-3.5 text-[#1264A3]" />
                        <span className="font-medium">Content Plans</span>
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {counts.contentPlans}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-[#F8F8F8] p-3 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500">
                        <Film className="h-3.5 w-3.5 text-purple-600" />
                        <span className="font-medium">Content Items</span>
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {counts.contentItems}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-[#F8F8F8] p-3 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500">
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-medium">Tasks</span>
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {clientTasks.length > 0 ? clientTasks.length : counts.tasks}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slack Channel Tab Navigation (3 Tabs) */}
                <div className="flex items-center border-t border-[#E2E2E2] bg-slate-50/50 px-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab('plans')}
                    className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-all ${
                      activeTab === 'plans'
                        ? 'border-[#007A5A] text-[#007A5A]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Content Plans ({counts.contentPlans})</span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-[#007A5A] border border-emerald-200">
                      PLAN-01b
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('tasks')}
                    className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-all ${
                      activeTab === 'tasks'
                        ? 'border-[#007A5A] text-[#007A5A]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Tasks ({clientTasks.length > 0 ? clientTasks.length : counts.tasks})</span>
                    {clientOverdueTasksCount > 0 && (
                      <span className="rounded-full bg-[#FDF2F5] px-1.5 py-0.2 text-[9px] font-bold text-[#E01E5A] border border-[#E01E5A]/30">
                        {clientOverdueTasksCount} overdue
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-all ${
                      activeTab === 'activity'
                        ? 'border-[#007A5A] text-[#007A5A]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    <span>Activity</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                      SCHED-01b
                    </span>
                  </button>
                </div>
              </div>

              {/* Tab Body Canvas */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
                {activeTab === 'plans' ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#007A5A]">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h4 className="mt-3 text-sm font-bold text-slate-900">
                      Content Plan Target: 8 Reels & 8 Static Posts
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Custom start date plan generator and content deliverable tracking will connect directly to this client workspace in task PLAN-01b.
                    </p>
                  </div>
                ) : activeTab === 'tasks' ? (
                  /* Client Tasks Tab Content (TASK-01b) */
                  <div className="space-y-4">
                    {/* Tab Action Bar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">Client Deliverables & Tasks</h3>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                            {clientTasks.length} {clientTasks.length === 1 ? 'task' : 'tasks'}
                          </span>
                          {clientOverdueTasksCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF2F5] px-2 py-0.5 text-[10px] font-bold text-[#E01E5A] border border-[#E01E5A]/30">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{clientOverdueTasksCount} overdue</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Assigned tasks, deadlines, and deliverables specific to #{slug}.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenCreateTask}
                        className="flex items-center gap-1.5 rounded-lg bg-[#007A5A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#148567] active:bg-[#005A42] transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>

                    {/* Error Banner */}
                    {tasksError && (
                      <div className="flex items-center justify-between rounded-xl border border-[#E01E5A]/30 bg-[#FDF2F5] p-3 text-xs text-[#E01E5A]">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 text-[#E01E5A]" />
                          <span>{tasksError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={fetchClientTasks}
                          className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#E01E5A] border border-[#E01E5A]/30"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}

                    {/* Task Table or Skeletons or Empty */}
                    {tasksLoading ? (
                      <TaskSkeleton />
                    ) : clientTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
                        <CheckSquare className="mx-auto h-8 w-8 text-slate-400" />
                        <h4 className="mt-2 text-sm font-bold text-slate-900">
                          No tasks for #{slug} yet
                        </h4>
                        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Create the first task for this client to assign drafting or content production responsibilities.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenCreateTask}
                          className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-[#007A5A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#148567]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create First Task</span>
                        </button>
                      </div>
                    ) : (
                      <TaskTable
                        tasks={clientTasks}
                        onEditTask={handleOpenEditTask}
                        hideClientColumn={true}
                      />
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-[#1264A3]">
                      <Activity className="h-6 w-6" />
                    </div>
                    <h4 className="mt-3 text-sm font-bold text-slate-900">
                      Activity Event Audit Timeline Ready for SCHED-01b
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Complete immutable history of script submissions, reviews, manual date reschedules, and status changes.
                    </p>
                  </div>
                )}
              </div>

              {/* Client Details Edit Drawer */}
              <ClientDrawer
                isOpen={drawerOpen}
                client={client}
                isLoading={drawerLoading}
                serverError={drawerError}
                onSubmit={handleEditSubmit}
                onClose={() => {
                  if (!drawerLoading) setDrawerOpen(false);
                }}
              />

              {/* Task Creation & Editing Drawer (scoped to this client) */}
              <TaskDrawer
                isOpen={taskDrawerOpen}
                task={editingTask}
                initialClientId={client.id}
                isLoading={taskDrawerLoading}
                serverError={taskDrawerError}
                onSubmit={handleTaskDrawerSubmit}
                onClose={() => {
                  if (!taskDrawerLoading) {
                    setTaskDrawerOpen(false);
                    setEditingTask(null);
                  }
                }}
                availableClients={[{ id: client.id, name: client.name }]}
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
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
              <Hash className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">Client Channel Not Found</h3>
              <p className="mt-1 text-xs text-slate-500">
                The requested client record does not exist or may have been deleted.
              </p>
              <Link
                href="/clients"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#007A5A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#148567]"
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
