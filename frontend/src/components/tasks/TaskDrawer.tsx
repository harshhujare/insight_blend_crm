'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Hash,
  Loader2,
  AlertCircle,
  Calendar,
  FileText,
  User as UserIcon,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  PauseCircle,
  AlertTriangle,
  Building2,
  Film,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Task, TaskFormData, TaskPriority, TaskStatus } from '@/types/task';

interface TaskDrawerProps {
  isOpen: boolean;
  task?: Task | null; // If passed, edit mode; else create mode
  initialClientId?: string; // Pre-fills client when opened from client channel
  isLoading: boolean;
  serverError?: string | null;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onClose: () => void;
  availableClients?: Array<{ id: string; name: string }>;
  availableContentItems?: Array<{ id: string; title: string; type: string; clientId: string }>;
}

const DEFAULT_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const DEFAULT_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD'];

export function TaskDrawer({
  isOpen,
  task,
  initialClientId,
  isLoading,
  serverError,
  onSubmit,
  onClose,
  availableClients = [],
  availableContentItems = [],
}: TaskDrawerProps) {
  const { user } = useAuth();
  const isEdit = !!task;
  const isWriter = user?.role === 'WRITER';
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Check if writer can edit this task (must be assigned to them)
  const isAssignedToWriter = isEdit && isWriter && task?.assigneeId === user?.id;
  const isWriterBlocked = isEdit && isWriter && !isAssignedToWriter;

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    clientId: initialClientId || '',
    contentItemId: '',
    assigneeId: isWriter && user ? user.id : '',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TaskFormData, boolean>>>({});

  // Populate or reset form data
  useEffect(() => {
    if (task) {
      const dateStr = task.dueDate
        ? new Date(task.dueDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      setFormData({
        title: task.title || '',
        description: task.description || '',
        clientId: task.clientId || initialClientId || '',
        contentItemId: task.contentItemId || '',
        assigneeId: task.assigneeId || (isWriter && user ? user.id : ''),
        priority: task.priority || 'MEDIUM',
        status: task.status || 'TODO',
        dueDate: dateStr,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        clientId: initialClientId || (availableClients.length > 0 ? availableClients[0].id : ''),
        contentItemId: '',
        assigneeId: isWriter && user ? user.id : (user ? user.id : ''),
        priority: 'MEDIUM',
        status: 'TODO',
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      });
    }
    setErrors({});
    setTouched({});

    if (isOpen) {
      const timer = setTimeout(() => {
        if (!isWriter || !isEdit) {
          titleInputRef.current?.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [task, isOpen, initialClientId, availableClients, isWriter, user, isEdit]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Filter available content items for the currently selected client
  const clientContentItems = availableContentItems.filter(
    (item) => item.clientId === formData.clientId
  );

  const validateField = (field: keyof TaskFormData, value: string): string | undefined => {
    switch (field) {
      case 'title':
        if (!value.trim()) return 'Task title is required';
        if (value.trim().length > 200) return 'Title must not exceed 200 characters';
        return undefined;
      case 'clientId':
        if (!value) return 'Client selection is required';
        return undefined;
      case 'contentItemId':
        if (isWriter && !isEdit && !value) {
          return 'Writers must associate tasks with a content item or script';
        }
        return undefined;
      case 'assigneeId':
        if (!value) return 'Assignee is required';
        return undefined;
      case 'dueDate':
        if (!value) return 'Due date is required';
        if (isNaN(new Date(value).getTime())) return 'Please enter a valid date';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: keyof TaskFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: keyof TaskFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isWriterBlocked) return;

    const newErrors: Partial<Record<keyof TaskFormData, string>> = {
      title: validateField('title', formData.title),
      clientId: validateField('clientId', formData.clientId),
      contentItemId: validateField('contentItemId', formData.contentItemId),
      assigneeId: validateField('assigneeId', formData.assigneeId),
      dueDate: validateField('dueDate', formData.dueDate),
    };

    setTouched({
      title: true,
      clientId: true,
      contentItemId: true,
      assigneeId: true,
      dueDate: true,
    });

    const hasErrors = Object.values(newErrors).some((err) => !!err);
    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Slide-over Right Thread Panel */}
      <aside
        className="fixed inset-y-0 right-0 flex max-w-full pl-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-title"
      >
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Slack Thread Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E2E2E2] px-6 bg-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#19171D] text-white">
                <Hash className="h-4 w-4 text-emerald-400" />
              </span>
              <div className="min-w-0">
                <h2
                  id="task-drawer-title"
                  className="truncate text-sm font-bold text-slate-900"
                >
                  {isEdit ? 'Task Details Thread' : 'Create New Task'}
                </h2>
                <p className="text-[11px] text-slate-500 truncate">
                  {isEdit ? task?.client?.name || 'Task details' : 'Assign task deliverables & deadlines'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
              aria-label="Close thread panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Overdue Warning Callout (FR-05 & NFR-08) */}
          {task?.isOverdue && (
            <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg border border-[#E01E5A]/30 bg-[#FDF2F5] p-3 text-xs text-[#E01E5A]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#E01E5A]" />
              <div className="font-semibold">
                This task is currently overdue!
                <span className="font-normal block text-[11px] text-[#E01E5A]/90">
                  Due date ({new Date(task.dueDate).toLocaleDateString()}) has passed without completion.
                </span>
              </div>
            </div>
          )}

          {/* Writer Read-Only Block Notification */}
          {isWriterBlocked && (
            <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-100 p-3 text-xs text-slate-700">
              <Lock className="h-4 w-4 shrink-0 text-slate-500" />
              <span>This task is assigned to another team member and is in read-only mode for writers.</span>
            </div>
          )}

          {/* Writer Restricted Edit Note */}
          {isEdit && isWriter && isAssignedToWriter && (
            <div className="mx-6 mt-4 rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-xs text-[#1264A3]">
              <span className="font-semibold">Writer Status Control:</span>
              <p className="mt-0.5 text-[11px] text-slate-600">
                You can transition the status of this task. Assignment, priority, and schedule changes must be made by a manager or strategist.
              </p>
            </div>
          )}

          {/* Server Error Alert Banner (FR-12) */}
          {serverError && (
            <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg border border-[#E01E5A]/30 bg-[#FDF2F5] p-3 text-xs text-[#E01E5A]">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#E01E5A]" />
              <span className="font-medium">{serverError}</span>
            </div>
          )}

          {/* Drawer Form Body */}
          <form
            id="task-drawer-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-[#F8F8F8]"
          >
            {/* Task Title */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <label
                htmlFor="drawer-task-title"
                className="block text-xs font-semibold text-slate-800"
              >
                Task Title <span className="text-[#E01E5A]">*</span>
              </label>
              <input
                ref={titleInputRef}
                id="drawer-task-title"
                type="text"
                disabled={isEdit && isWriter}
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                onBlur={() => handleBlur('title')}
                placeholder="e.g. Write Script for Hook 1: Morning Routines"
                className={`mt-2 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 transition-all focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500 ${
                  errors.title
                    ? 'border-[#E01E5A] focus:border-[#E01E5A] focus:ring-[#E01E5A]/20'
                    : 'border-slate-200 focus:border-[#1264A3] focus:ring-[#1264A3]/20'
                }`}
              />
              {errors.title && (
                <p className="mt-1.5 text-[11px] font-medium text-[#E01E5A]">{errors.title}</p>
              )}
            </div>

            {/* Client and Linked Content Item */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Client Selection */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <label
                  htmlFor="drawer-task-client"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Client</span>
                  <span className="text-[#E01E5A]">*</span>
                </label>
                <select
                  id="drawer-task-client"
                  disabled={isEdit || !!initialClientId}
                  value={formData.clientId}
                  onChange={(e) => {
                    handleChange('clientId', e.target.value);
                    handleChange('contentItemId', ''); // Reset item on client switch
                  }}
                  onBlur={() => handleBlur('clientId')}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#1264A3]/20 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Select client...</option>
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="mt-1.5 text-[11px] font-medium text-[#E01E5A]">{errors.clientId}</p>
                )}
              </div>

              {/* Content Item Selection (Optional for Manager, Required for Writer) */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <label
                  htmlFor="drawer-task-content-item"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                >
                  <Film className="h-3.5 w-3.5 text-slate-400" />
                  <span>Content Item</span>
                  {isWriter && !isEdit && <span className="text-[#E01E5A]">*</span>}
                </label>
                <select
                  id="drawer-task-content-item"
                  disabled={isEdit && isWriter}
                  value={formData.contentItemId}
                  onChange={(e) => handleChange('contentItemId', e.target.value)}
                  onBlur={() => handleBlur('contentItemId')}
                  className={`mt-2 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500 ${
                    errors.contentItemId
                      ? 'border-[#E01E5A] focus:border-[#E01E5A] focus:ring-[#E01E5A]/20'
                      : 'border-slate-200 focus:border-[#1264A3] focus:ring-[#1264A3]/20'
                  }`}
                >
                  <option value="">None (Independent task)</option>
                  {clientContentItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.type}] {item.title}
                    </option>
                  ))}
                </select>
                {errors.contentItemId ? (
                  <p className="mt-1.5 text-[11px] font-medium text-[#E01E5A]">
                    {errors.contentItemId}
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-400">
                    Links task deliverables to reel/post
                  </p>
                )}
              </div>
            </div>

            {/* Assignee & Due Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Assignee Selection */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <label
                  htmlFor="drawer-task-assignee"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                >
                  <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Assignee</span>
                  <span className="text-[#E01E5A]">*</span>
                </label>
                {isWriter ? (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#19171D] text-[10px] font-bold text-white">
                      {user?.name?.[0] || 'W'}
                    </span>
                    <span>{user?.name} (You)</span>
                  </div>
                ) : (
                  <select
                    id="drawer-task-assignee"
                    value={formData.assigneeId}
                    onChange={(e) => handleChange('assigneeId', e.target.value)}
                    onBlur={() => handleBlur('assigneeId')}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#1264A3]/20"
                  >
                    <option value="">Select assignee...</option>
                    {user && (
                      <option value={user.id}>
                        {user.name} ({user.role}) - Current
                      </option>
                    )}
                    {task?.assignee && task.assignee.id !== user?.id && (
                      <option value={task.assignee.id}>
                        {task.assignee.name} ({task.assignee.role})
                      </option>
                    )}
                  </select>
                )}
                {errors.assigneeId && (
                  <p className="mt-1.5 text-[11px] font-medium text-[#E01E5A]">
                    {errors.assigneeId}
                  </p>
                )}
              </div>

              {/* Due Date */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <label
                  htmlFor="drawer-task-due-date"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Due Date</span>
                  <span className="text-[#E01E5A]">*</span>
                </label>
                <input
                  id="drawer-task-due-date"
                  type="date"
                  disabled={isEdit && isWriter}
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  onBlur={() => handleBlur('dueDate')}
                  className={`mt-2 w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 transition-all focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500 ${
                    errors.dueDate
                      ? 'border-[#E01E5A] focus:border-[#E01E5A] focus:ring-[#E01E5A]/20'
                      : 'border-slate-200 focus:border-[#1264A3] focus:ring-[#1264A3]/20'
                  }`}
                />
                {errors.dueDate && (
                  <p className="mt-1.5 text-[11px] font-medium text-[#E01E5A]">{errors.dueDate}</p>
                )}
              </div>
            </div>

            {/* Priority Selector */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="block text-xs font-semibold text-slate-800">Priority</span>
              <div className="mt-2 flex rounded-lg border border-slate-200 bg-slate-100 p-1 gap-1">
                {DEFAULT_PRIORITIES.map((p) => {
                  const isSelected = formData.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={isEdit && isWriter}
                      onClick={() => handleChange('priority', p)}
                      className={`flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-all ${
                        isSelected
                          ? p === 'URGENT'
                            ? 'bg-[#E01E5A] text-white shadow-xs'
                            : p === 'HIGH'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : p === 'MEDIUM'
                            ? 'bg-[#1264A3] text-white shadow-xs'
                            : 'bg-slate-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workflow Status Selector */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="block text-xs font-semibold text-slate-800">Task Status</span>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DEFAULT_STATUSES.map((s) => {
                  const isSelected = formData.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={isWriterBlocked}
                      onClick={() => handleChange('status', s)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? s === 'COMPLETED'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                            : s === 'IN_PROGRESS'
                            ? 'border-sky-600 bg-sky-50 text-[#1264A3] ring-2 ring-sky-500/20'
                            : s === 'IN_REVIEW'
                            ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                            : 'border-slate-400 bg-white text-slate-900 ring-2 ring-slate-400/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50'
                      }`}
                    >
                      {s === 'COMPLETED' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : s === 'IN_PROGRESS' ? (
                        <Clock className="h-3.5 w-3.5 text-[#1264A3] shrink-0" />
                      ) : s === 'IN_REVIEW' ? (
                        <Eye className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      ) : s === 'ON_HOLD' ? (
                        <PauseCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{s.replace('_', ' ')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description & Operational Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <label
                htmlFor="drawer-task-description"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>Description & Instructions</span>
              </label>
              <textarea
                id="drawer-task-description"
                rows={3}
                disabled={isEdit && isWriter}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Specific guidance, script angle, references, or review checklist..."
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 placeholder-slate-400 transition-all focus:border-[#1264A3] focus:outline-hidden focus:ring-2 focus:ring-[#1264A3]/20 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </form>

          {/* Sticky Slack Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-[#E2E2E2] px-6 py-3.5 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="task-drawer-form"
              disabled={isLoading || isWriterBlocked}
              className="flex items-center gap-2 rounded-lg bg-[#007A5A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#148567] active:bg-[#005A42] transition-colors disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{isEdit ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Task Changes' : 'Create Task'}</span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
