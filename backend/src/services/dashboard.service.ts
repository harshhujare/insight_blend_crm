import { Prisma, TaskStatus, WorkflowStatus, ScriptStatus, ContentPlanStatus, Role } from '@prisma/client';
import { prisma } from '../config/db';
import { DashboardQueryInput } from '../schemas/dashboard.schema';

export interface DashboardSummaryResponse {
  clientWorkload: Array<{
    id: string;
    name: string;
    category: string;
    status: string;
    activePlansCount: number;
    totalContentItems: number;
    contentItemsByStatus: Record<WorkflowStatus, number>;
    openTasksCount: number;
    overdueTasksCount: number;
  }>;
  taskSummary: {
    total: number;
    overdueCount: number;
    byStatus: Record<TaskStatus, number>;
    byAssignee: Array<{
      assigneeId: string;
      assigneeName: string;
      assigneeRole: Role;
      totalTasks: number;
      openTasks: number;
      overdueTasks: number;
    }>;
  };
  overdueTasks: Array<{
    id: string;
    title: string;
    dueDate: Date;
    priority: string;
    status: TaskStatus;
    daysOverdue: number;
    isOverdue: boolean;
    client: { id: string; name: string };
    assignee: { id: string; name: string; role: Role };
    contentItem?: { id: string; title: string; type: string } | null;
  }>;
  upcomingDeadlines: {
    tasks: Array<{
      id: string;
      title: string;
      dueDate: Date;
      priority: string;
      status: TaskStatus;
      client: { id: string; name: string };
      assignee: { id: string; name: string };
    }>;
    contentItems: Array<{
      id: string;
      title: string;
      type: string;
      status: WorkflowStatus;
      deadlineType: 'scriptDeadline' | 'editingDeadline' | 'plannedPublishDate';
      deadlineDate: Date;
      client: { id: string; name: string };
      owner?: { id: string; name: string } | null;
    }>;
  };
  scriptsAwaitingReview: Array<{
    id: string;
    currentVersion: number;
    status: ScriptStatus;
    submittedAt: Date;
    contentItem: {
      id: string;
      title: string;
      type: string;
      plannedShootDate?: Date | null;
      plannedPublishDate?: Date | null;
    };
    client: { id: string; name: string };
    author: { id: string; name: string; email: string; role: Role };
  }>;
  upcomingSchedule: Array<{
    id: string;
    title: string;
    type: string;
    status: WorkflowStatus;
    plannedShootDate?: Date | null;
    plannedPublishDate?: Date | null;
    editingDeadline?: Date | null;
    client: { id: string; name: string };
    owner?: { id: string; name: string; role: Role } | null;
  }>;
}

const ALL_WORKFLOW_STATUSES: WorkflowStatus[] = [
  WorkflowStatus.PLANNED,
  WorkflowStatus.SCRIPT_DRAFT,
  WorkflowStatus.IN_REVIEW,
  WorkflowStatus.REVISION_REQUESTED,
  WorkflowStatus.SCRIPT_APPROVED,
  WorkflowStatus.READY_FOR_SHOOT,
  WorkflowStatus.SHOOT_COMPLETED,
  WorkflowStatus.EDITING,
  WorkflowStatus.READY_TO_PUBLISH,
  WorkflowStatus.PUBLISHED,
  WorkflowStatus.ON_HOLD,
];

const ALL_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.COMPLETED,
  TaskStatus.ON_HOLD,
];

export async function getDashboardSummary(
  query: DashboardQueryInput
): Promise<DashboardSummaryResponse> {
  const now = new Date();
  const defaultDeadlineWindowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const deadlineStart = query.startDate ? new Date(query.startDate) : now;
  const deadlineEnd = query.endDate ? new Date(query.endDate) : defaultDeadlineWindowEnd;

  // 1. Fetch Client Workload
  const clientWhere: Prisma.ClientWhereInput = {};
  if (query.clientId) {
    clientWhere.id = query.clientId;
  } else {
    clientWhere.status = 'ACTIVE';
  }

  const contentItemWhereForClient: Prisma.ContentItemWhereInput = {};
  if (query.contentType) {
    contentItemWhereForClient.type = query.contentType;
  }
  if (query.assigneeId) {
    contentItemWhereForClient.ownerId = query.assigneeId;
  }

  const taskWhereForClient: Prisma.TaskWhereInput = {
    status: { not: TaskStatus.COMPLETED },
  };
  if (query.assigneeId) {
    taskWhereForClient.assigneeId = query.assigneeId;
  }

  const clientsPromise = prisma.client.findMany({
    where: clientWhere,
    orderBy: { name: 'asc' },
    include: {
      contentPlans: {
        where: { status: ContentPlanStatus.ACTIVE },
        select: { id: true },
      },
      contentItems: {
        where: Object.keys(contentItemWhereForClient).length > 0 ? contentItemWhereForClient : undefined,
        select: { id: true, status: true, type: true },
      },
      tasks: {
        where: taskWhereForClient,
        select: { id: true, status: true, dueDate: true },
      },
    },
  });

  // 2. Fetch Tasks for taskSummary
  const taskSummaryWhere: Prisma.TaskWhereInput = {};
  if (query.clientId) {
    taskSummaryWhere.clientId = query.clientId;
  }
  if (query.assigneeId) {
    taskSummaryWhere.assigneeId = query.assigneeId;
  }
  if (query.status && Object.values(TaskStatus).includes(query.status as TaskStatus)) {
    taskSummaryWhere.status = query.status as TaskStatus;
  }
  if (query.startDate || query.endDate) {
    taskSummaryWhere.dueDate = {};
    if (query.startDate) taskSummaryWhere.dueDate.gte = new Date(query.startDate);
    if (query.endDate) taskSummaryWhere.dueDate.lte = new Date(query.endDate);
  }

  const taskSummaryPromise = prisma.task.findMany({
    where: taskSummaryWhere,
    select: {
      id: true,
      status: true,
      dueDate: true,
      assigneeId: true,
      assignee: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  // 3. Fetch Overdue Tasks (dueDate < now and status != COMPLETED)
  const overdueWhere: Prisma.TaskWhereInput = {
    dueDate: { lt: now },
    status: { not: TaskStatus.COMPLETED },
  };
  if (query.clientId) {
    overdueWhere.clientId = query.clientId;
  }
  if (query.assigneeId) {
    overdueWhere.assigneeId = query.assigneeId;
  }

  const overdueTasksPromise = prisma.task.findMany({
    where: overdueWhere,
    orderBy: { dueDate: 'asc' },
    take: 20,
    select: {
      id: true,
      title: true,
      dueDate: true,
      priority: true,
      status: true,
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, role: true } },
      contentItem: { select: { id: true, title: true, type: true } },
    },
  });

  // 4. Fetch Upcoming Deadlines
  // 4a. Upcoming Tasks in deadline window
  const upcomingTasksWhere: Prisma.TaskWhereInput = {
    dueDate: {
      gte: deadlineStart,
      lte: deadlineEnd,
    },
    status: { not: TaskStatus.COMPLETED },
  };
  if (query.clientId) {
    upcomingTasksWhere.clientId = query.clientId;
  }
  if (query.assigneeId) {
    upcomingTasksWhere.assigneeId = query.assigneeId;
  }

  const upcomingTasksPromise = prisma.task.findMany({
    where: upcomingTasksWhere,
    orderBy: { dueDate: 'asc' },
    take: 20,
    select: {
      id: true,
      title: true,
      dueDate: true,
      priority: true,
      status: true,
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  // 4b. Upcoming Content Item Deadlines (scriptDeadline, editingDeadline, plannedPublishDate)
  const upcomingContentWhere: Prisma.ContentItemWhereInput = {
    status: { not: WorkflowStatus.PUBLISHED },
    OR: [
      { scriptDeadline: { gte: deadlineStart, lte: deadlineEnd } },
      { editingDeadline: { gte: deadlineStart, lte: deadlineEnd } },
      { plannedPublishDate: { gte: deadlineStart, lte: deadlineEnd } },
    ],
  };
  if (query.clientId) {
    upcomingContentWhere.clientId = query.clientId;
  }
  if (query.assigneeId) {
    upcomingContentWhere.ownerId = query.assigneeId;
  }
  if (query.contentType) {
    upcomingContentWhere.type = query.contentType;
  }

  const upcomingContentPromise = prisma.contentItem.findMany({
    where: upcomingContentWhere,
    take: 30,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      scriptDeadline: true,
      editingDeadline: true,
      plannedPublishDate: true,
      client: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
  });

  // 5. Fetch Scripts Awaiting Review (status = IN_REVIEW)
  const scriptsWhere: Prisma.ScriptWhereInput = {
    status: ScriptStatus.IN_REVIEW,
  };
  const scriptContentItemWhere: Prisma.ContentItemWhereInput = {};
  if (query.clientId) {
    scriptContentItemWhere.clientId = query.clientId;
  }
  if (query.contentType) {
    scriptContentItemWhere.type = query.contentType;
  }
  if (Object.keys(scriptContentItemWhere).length > 0) {
    scriptsWhere.contentItem = {
      is: scriptContentItemWhere,
    };
  }
  if (query.assigneeId) {
    scriptsWhere.OR = [
      { authorId: query.assigneeId },
      { contentItem: { is: { ownerId: query.assigneeId } } },
    ];
  }

  const scriptsPromise = prisma.script.findMany({
    where: scriptsWhere,
    orderBy: { updatedAt: 'asc' },
    take: 20,
    select: {
      id: true,
      currentVersion: true,
      status: true,
      updatedAt: true,
      contentItem: {
        select: {
          id: true,
          title: true,
          type: true,
          plannedShootDate: true,
          plannedPublishDate: true,
          client: { select: { id: true, name: true } },
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // 6. Fetch Upcoming Schedule (plannedShootDate or plannedPublishDate upcoming)
  const scheduleWhere: Prisma.ContentItemWhereInput = {
    status: { not: WorkflowStatus.PUBLISHED },
    OR: [
      { plannedShootDate: { gte: now } },
      { plannedPublishDate: { gte: now } },
    ],
  };
  if (query.clientId) {
    scheduleWhere.clientId = query.clientId;
  }
  if (query.assigneeId) {
    scheduleWhere.ownerId = query.assigneeId;
  }
  if (query.contentType) {
    scheduleWhere.type = query.contentType;
  }

  const schedulePromise = prisma.contentItem.findMany({
    where: scheduleWhere,
    orderBy: [
      { plannedShootDate: 'asc' },
      { plannedPublishDate: 'asc' },
    ],
    take: 20,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      plannedShootDate: true,
      plannedPublishDate: true,
      editingDeadline: true,
      client: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, role: true } },
    },
  });

  // Execute all queries in parallel
  const [
    rawClients,
    rawTasksForSummary,
    rawOverdueTasks,
    upcomingTasks,
    rawUpcomingContent,
    rawScripts,
    rawSchedule,
  ] = await Promise.all([
    clientsPromise,
    taskSummaryPromise,
    overdueTasksPromise,
    upcomingTasksPromise,
    upcomingContentPromise,
    scriptsPromise,
    schedulePromise,
  ]);

  // Process 1: clientWorkload
  const clientWorkload = rawClients.map((c) => {
    const statusMap = ALL_WORKFLOW_STATUSES.reduce(
      (acc, s) => {
        acc[s] = 0;
        return acc;
      },
      {} as Record<WorkflowStatus, number>
    );

    for (const item of c.contentItems) {
      if (statusMap[item.status] !== undefined) {
        statusMap[item.status] += 1;
      }
    }

    const openTasksCount = c.tasks.length;
    const overdueTasksCount = c.tasks.filter((t) => new Date(t.dueDate) < now).length;

    return {
      id: c.id,
      name: c.name,
      category: c.category,
      status: c.status,
      activePlansCount: c.contentPlans.length,
      totalContentItems: c.contentItems.length,
      contentItemsByStatus: statusMap,
      openTasksCount,
      overdueTasksCount,
    };
  });

  // Process 2: taskSummary
  const byStatus = ALL_TASK_STATUSES.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<TaskStatus, number>
  );

  let totalOverdue = 0;
  const assigneeMap = new Map<
    string,
    {
      assigneeId: string;
      assigneeName: string;
      assigneeRole: Role;
      totalTasks: number;
      openTasks: number;
      overdueTasks: number;
    }
  >();

  for (const t of rawTasksForSummary) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    const isOverdue = t.status !== TaskStatus.COMPLETED && new Date(t.dueDate) < now;
    if (isOverdue) totalOverdue += 1;

    let assigneeStats = assigneeMap.get(t.assigneeId);
    if (!assigneeStats) {
      assigneeStats = {
        assigneeId: t.assigneeId,
        assigneeName: t.assignee.name,
        assigneeRole: t.assignee.role,
        totalTasks: 0,
        openTasks: 0,
        overdueTasks: 0,
      };
      assigneeMap.set(t.assigneeId, assigneeStats);
    }
    assigneeStats.totalTasks += 1;
    if (t.status !== TaskStatus.COMPLETED) {
      assigneeStats.openTasks += 1;
    }
    if (isOverdue) {
      assigneeStats.overdueTasks += 1;
    }
  }

  const taskSummary = {
    total: rawTasksForSummary.length,
    overdueCount: totalOverdue,
    byStatus,
    byAssignee: Array.from(assigneeMap.values()).sort((a, b) =>
      b.openTasks - a.openTasks || a.assigneeName.localeCompare(b.assigneeName)
    ),
  };

  // Process 3: overdueTasks with computed daysOverdue and isOverdue
  const overdueTasks = rawOverdueTasks.map((t) => {
    const dueTime = new Date(t.dueDate).getTime();
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueTime) / (1000 * 60 * 60 * 24)));
    return {
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      status: t.status,
      daysOverdue,
      isOverdue: true,
      client: t.client,
      assignee: t.assignee,
      contentItem: t.contentItem,
    };
  });

  // Process 4b: upcoming content items deadline calculation
  const mappedUpcomingContent: Array<{
    id: string;
    title: string;
    type: string;
    status: WorkflowStatus;
    deadlineType: 'scriptDeadline' | 'editingDeadline' | 'plannedPublishDate';
    deadlineDate: Date;
    client: { id: string; name: string };
    owner?: { id: string; name: string } | null;
  }> = [];

  for (const item of rawUpcomingContent) {
    const deadlines: Array<{
      type: 'scriptDeadline' | 'editingDeadline' | 'plannedPublishDate';
      date: Date;
    }> = [];

    if (item.scriptDeadline && item.scriptDeadline >= deadlineStart && item.scriptDeadline <= deadlineEnd) {
      deadlines.push({ type: 'scriptDeadline', date: item.scriptDeadline });
    }
    if (item.editingDeadline && item.editingDeadline >= deadlineStart && item.editingDeadline <= deadlineEnd) {
      deadlines.push({ type: 'editingDeadline', date: item.editingDeadline });
    }
    if (item.plannedPublishDate && item.plannedPublishDate >= deadlineStart && item.plannedPublishDate <= deadlineEnd) {
      deadlines.push({ type: 'plannedPublishDate', date: item.plannedPublishDate });
    }

    // Pick earliest deadline within window
    if (deadlines.length > 0) {
      deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
      mappedUpcomingContent.push({
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        deadlineType: deadlines[0].type,
        deadlineDate: deadlines[0].date,
        client: item.client,
        owner: item.owner,
      });
    }
  }

  mappedUpcomingContent.sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime());

  // Process 5: scriptsAwaitingReview
  const scriptsAwaitingReview = rawScripts.map((s) => ({
    id: s.id,
    currentVersion: s.currentVersion,
    status: s.status,
    submittedAt: s.updatedAt,
    contentItem: {
      id: s.contentItem.id,
      title: s.contentItem.title,
      type: s.contentItem.type,
      plannedShootDate: s.contentItem.plannedShootDate,
      plannedPublishDate: s.contentItem.plannedPublishDate,
    },
    client: s.contentItem.client,
    author: s.author,
  }));

  return {
    clientWorkload,
    taskSummary,
    overdueTasks,
    upcomingDeadlines: {
      tasks: upcomingTasks,
      contentItems: mappedUpcomingContent.slice(0, 20),
    },
    scriptsAwaitingReview,
    upcomingSchedule: rawSchedule,
  };
}
