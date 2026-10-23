'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  PauseCircle,
  AlertTriangle,
  Film,
  Calendar,
  Edit2,
  ChevronRight,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '@/types/task';

interface TaskTableProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  hideClientColumn?: boolean; // When rendered in single client workspace tab
}

function getStatusBadge(status: TaskStatus) {
  switch (status) {
    case 'COMPLETED':
      return {
        icon: CheckCircle2,
        label: 'Completed',
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconClass: 'text-emerald-600',
      };
    case 'IN_PROGRESS':
      return {
        icon: Clock,
        label: 'In Progress',
        classes: 'bg-sky-50 text-[#1264A3] border-sky-200',
        iconClass: 'text-[#1264A3]',
      };
    case 'IN_REVIEW':
      return {
        icon: Eye,
        label: 'In Review',
        classes: 'bg-amber-50 text-amber-800 border-amber-200',
        iconClass: 'text-amber-600',
      };
    case 'ON_HOLD':
      return {
        icon: PauseCircle,
        label: 'On Hold',
        classes: 'bg-slate-100 text-slate-700 border-slate-200',
        iconClass: 'text-slate-500',
      };
    case 'TODO':
    default:
      return {
        icon: Circle,
        label: 'To Do',
        classes: 'bg-slate-50 text-slate-700 border-slate-200',
        iconClass: 'text-slate-400',
      };
  }
}

function getPriorityBadge(priority: TaskPriority) {
  switch (priority) {
    case 'URGENT':
      return {
        label: 'Urgent',
        classes: 'bg-[#FDF2F5] text-[#E01E5A] border-[#E01E5A]/30',
      };
    case 'HIGH':
      return {
        label: 'High',
        classes: 'bg-amber-50 text-amber-800 border-amber-300',
      };
    case 'MEDIUM':
      return {
        label: 'Medium',
        classes: 'bg-sky-50 text-[#1264A3] border-sky-200',
      };
    case 'LOW':
    default:
      return {
        label: 'Low',
        classes: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}

export function TaskTable({
  tasks,
  onEditTask,
  hideClientColumn = false,
}: TaskTableProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="border-b border-[#E2E2E2] bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Task Title
              </th>
              {!hideClientColumn && (
                <th scope="col" className="px-3 py-3 font-semibold">
                  Client Channel
                </th>
              )}
              <th scope="col" className="px-3 py-3 font-semibold">
                Content Item
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Priority
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Assignee
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Due Date
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const statusBadge = getStatusBadge(task.status);
              const StatusIcon = statusBadge.icon;
              const priorityBadge = getPriorityBadge(task.priority);

              const clientSlug = task.client?.name
                ? task.client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                : 'client';

              const formattedDueDate = task.dueDate
                ? new Date(task.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not set';

              const assigneeInitials = task.assignee?.name
                ? task.assignee.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'U';

              return (
                <tr
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className={`group cursor-pointer transition-colors ${
                    task.isOverdue
                      ? 'bg-[#FDF2F5]/30 hover:bg-[#FDF2F5]/60'
                      : 'hover:bg-[#F8F8F8]'
                  }`}
                >
                  {/* Status Badge */}
                  <td className="px-4 py-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${statusBadge.classes}`}
                    >
                      <StatusIcon className={`h-3 w-3 ${statusBadge.iconClass}`} />
                      <span>{statusBadge.label}</span>
                    </span>
                  </td>

                  {/* Task Title */}
                  <td className="px-3 py-3 max-w-xs sm:max-w-md">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-900 group-hover:text-[#1264A3] transition-colors truncate">
                        {task.title}
                      </span>
                      <ChevronRight className="h-3 w-3 opacity-0 text-slate-400 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    {task.description && (
                      <p className="mt-0.5 text-[11px] text-slate-500 truncate max-w-sm">
                        {task.description}
                      </p>
                    )}
                  </td>

                  {/* Client Channel Badge */}
                  {!hideClientColumn && (
                    <td className="px-3 py-3 shrink-0">
                      <Link
                        href={`/clients/${task.clientId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-700 border border-slate-200/80 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                      >
                        <span className="text-slate-400">#</span>
                        <span>{clientSlug}</span>
                      </Link>
                    </td>
                  )}

                  {/* Content Item Link */}
                  <td className="px-3 py-3 shrink-0">
                    {task.contentItem ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                          task.contentItem.type === 'REEL'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-sky-50 text-[#1264A3] border-sky-200'
                        }`}
                        title={task.contentItem.title}
                      >
                        <Film className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[120px]">
                          {task.contentItem.title}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">None</span>
                    )}
                  </td>

                  {/* Priority Badge */}
                  <td className="px-3 py-3 shrink-0">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold border ${priorityBadge.classes}`}
                    >
                      {priorityBadge.label}
                    </span>
                  </td>

                  {/* Assignee Avatar */}
                  <td className="px-3 py-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#19171D] text-[10px] font-bold text-white shrink-0 shadow-2xs">
                        {assigneeInitials}
                      </div>
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[110px]">
                        {task.assignee?.name || 'Unassigned'}
                      </span>
                    </div>
                  </td>

                  {/* Due Date & Overdue Highlight (FR-05 & NFR-08) */}
                  <td className="px-3 py-3 shrink-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{formattedDueDate}</span>
                      </div>

                      {/* Accessible Overdue Flag (NFR-08: icon + text, never color alone) */}
                      {task.isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#FDF2F5] px-1.5 py-0.5 text-[10px] font-bold text-[#E01E5A] border border-[#E01E5A]/30 w-fit">
                          <AlertTriangle className="h-3 w-3 shrink-0 text-[#E01E5A]" />
                          <span>Overdue</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Action Icon */}
                  <td className="px-4 py-3 text-right shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTask(task);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="Open task thread"
                      aria-label={`Open task thread for ${task.title}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
