'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { Task, TaskFormData, TaskPriority, TaskStatus } from '@/types/task';
import { Client } from '@/types/client';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import { TaskSkeleton } from '@/components/tasks/TaskSkeleton';
import {
  Hash,
  Plus,
  Search,
  X,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';

export default function TasksPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Fetch Clients for dropdown filter and drawer
  useEffect(() => {
    async function loadClients() {
      try {
        const data = await api.get<Client[]>('/clients');
        setClients(Array.isArray(data) ? data : []);
      } catch {
        // Silently tolerate dropdown failure
      }
    }
    loadClients();
  }, []);

  // Fetch Tasks from GET /api/tasks with query params
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | boolean | undefined> = {};

      if (selectedClientId !== 'ALL') {
        params.clientId = selectedClientId;
      }
      if (selectedStatus !== 'ALL') {
        params.status = selectedStatus;
      }
      if (selectedPriority !== 'ALL') {
        params.priority = selectedPriority;
      }
      if (selectedAssigneeId !== 'ALL') {
        params.assigneeId = selectedAssigneeId;
      }
      if (overdueOnly) {
        params.overdue = true;
      }

      const data = await api.get<Task[]>('/tasks', { params });
      setTasks(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load tasks';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, selectedStatus, selectedPriority, selectedAssigneeId, overdueOnly]);

  // Debounce task fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  // Client-side search filtering on title, description, client name
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase().trim();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        t.client.name.toLowerCase().includes(query) ||
        (t.contentItem && t.contentItem.title.toLowerCase().includes(query))
    );
  }, [tasks, searchQuery]);

  // Derived counts
  const overdueCount = useMemo(() => tasks.filter((t) => t.isOverdue).length, [tasks]);

  // Unique assignees for filter dropdown
  const uniqueAssignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tasks.forEach((t) => {
      if (t.assignee && !map.has(t.assignee.id)) {
        map.set(t.assignee.id, { id: t.assignee.id, name: t.assignee.name });
      }
    });
    if (user && !map.has(user.id)) {
      map.set(user.id, { id: user.id, name: user.name });
    }
    return Array.from(map.values());
  }, [tasks, user]);

  // Content items extracted from tasks
  const availableContentItems = useMemo(() => {
    const items: Array<{ id: string; title: string; type: string; clientId: string }> = [];
    const seen = new Set<string>();
    tasks.forEach((t) => {
      if (t.contentItem && !seen.has(t.contentItem.id)) {
        seen.add(t.contentItem.id);
        items.push({
          id: t.contentItem.id,
          title: t.contentItem.title,
          type: t.contentItem.type,
          clientId: t.clientId,
        });
      }
    });
    return items;
  }, [tasks]);

  // Handlers for Drawer
  const handleOpenCreate = () => {
    setEditingTask(null);
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const handleDrawerSubmit = async (formData: TaskFormData) => {
    setDrawerLoading(true);
    setDrawerError(null);
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
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        // POST /api/tasks
        const created = await api.post<Task>('/api/tasks', formData);
        setTasks((prev) => [created, ...prev]);
      }
      setDrawerOpen(false);
      setEditingTask(null);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to save task';
      setDrawerError(msg);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedClientId('ALL');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSelectedAssigneeId('ALL');
    setOverdueOnly(false);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedClientId !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedPriority !== 'ALL' ||
    selectedAssigneeId !== 'ALL' ||
    overdueOnly;

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-4 max-w-7xl mx-auto">
          {/* Sticky Slack Header Bar */}
          <div className="sticky top-0 z-20 -mt-4 md:-mt-8 -mx-4 md:-mx-8 border-b border-[#E2E2E2] bg-white px-4 md:px-8 py-3 shadow-2xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Title & Stats */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#19171D] text-white">
                  <Hash className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold text-slate-900">tasks-workspace</h1>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                      {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                    {overdueCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF2F5] px-2 py-0.5 text-[11px] font-bold text-[#E01E5A] border border-[#E01E5A]/30">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{overdueCount} overdue</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    High-density task pipeline, content deadlines, and script drafting deliverables.
                  </p>
                </div>
              </div>

              {/* Action & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Instant Search Bar */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks or clients..."
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

                {/* Primary '+ New Task' Slack Green Button */}
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1.5 rounded-lg bg-[#007A5A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#148567] active:bg-[#005A42] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Task</span>
                </button>
              </div>
            </div>

            {/* Filter Bar Controls */}
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100 text-xs">
              {/* Overdue Quick-Toggle Pill */}
              <button
                type="button"
                onClick={() => setOverdueOnly((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all border ${
                  overdueOnly
                    ? 'bg-[#E01E5A] text-white border-[#E01E5A] shadow-2xs'
                    : 'bg-white text-[#E01E5A] border-[#E01E5A]/30 hover:bg-[#FDF2F5]'
                }`}
              >
                <AlertTriangle className={`h-3 w-3 ${overdueOnly ? 'text-white' : 'text-[#E01E5A]'}`} />
                <span>Overdue Only</span>
                {overdueCount > 0 && <span>({overdueCount})</span>}
              </button>

              {/* Status Filter Pills */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                {(['ALL', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium transition-all ${
                      selectedStatus === st
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All Status' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Client Selector Dropdown */}
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-[#1264A3] focus:outline-hidden"
              >
                <option value="ALL">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>

              {/* Priority Selector Dropdown */}
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as TaskPriority | 'ALL')}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-[#1264A3] focus:outline-hidden"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Assignee Selector Dropdown */}
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-[#1264A3] focus:outline-hidden"
              >
                <option value="ALL">All Assignees</option>
                {uniqueAssignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              {/* Reset Filters button if active */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Reset Filters
                </button>
              )}
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
                onClick={fetchTasks}
                className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[#E01E5A] border border-[#E01E5A]/30 hover:bg-[#FDF2F5]"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Main Task List Content */}
          {loading ? (
            <TaskSkeleton />
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-2xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <FolderOpen className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">
                {hasActiveFilters ? 'No tasks match your filters' : 'No tasks created yet'}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                {hasActiveFilters
                  ? 'Try clearing or widening your filter selections to see existing deliverables.'
                  : 'Start delegating client deliverables, scripts, and production deadlines.'}
              </p>
              <div className="mt-4 flex items-center gap-2.5">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Clear All Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="flex items-center gap-1.5 rounded-lg bg-[#007A5A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#148567]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Task</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <TaskTable tasks={filteredTasks} onEditTask={handleOpenEdit} />
          )}

          {/* Right-Thread Drawer for Task Create / Edit */}
          <TaskDrawer
            isOpen={drawerOpen}
            task={editingTask}
            isLoading={drawerLoading}
            serverError={drawerError}
            onSubmit={handleDrawerSubmit}
            onClose={() => {
              if (!drawerLoading) {
                setDrawerOpen(false);
                setEditingTask(null);
              }
            }}
            availableClients={clients.map((c) => ({ id: c.id, name: c.name }))}
            availableContentItems={availableContentItems}
          />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
