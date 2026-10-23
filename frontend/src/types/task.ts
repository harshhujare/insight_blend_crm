export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'ON_HOLD';

export interface TaskClientSummary {
  id: string;
  name: string;
  category: string;
  status: string;
}

export interface TaskContentItemSummary {
  id: string;
  title: string;
  type: 'REEL' | 'STATIC_POST';
  status: string;
}

export interface TaskAssigneeSummary {
  id: string;
  name: string;
  email: string;
  role: 'MANAGER' | 'STRATEGIST' | 'WRITER';
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  clientId: string;
  client: TaskClientSummary;
  contentItemId?: string | null;
  contentItem?: TaskContentItemSummary | null;
  assigneeId: string;
  assignee: TaskAssigneeSummary;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
}

export interface TaskFormData {
  title: string;
  description: string;
  clientId: string;
  contentItemId: string;
  assigneeId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD format for HTML date input
}

export interface TaskQueryFilters {
  clientId?: string;
  assigneeId?: string;
  status?: TaskStatus | 'ALL';
  priority?: TaskPriority | 'ALL';
  overdue?: boolean;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}
