import type { TaskPriority, TaskStatus } from '../domain.constants';

export type CreateTaskDto = {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  standard: string;
  relatedDocuments: string[];
  relatedAuditIds?: string[];
  relatedFindingIds?: string[];
  changeSummary?: string;
};

export type UpdateTaskDto = {
  title?: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  standard?: string;
  relatedDocuments?: string[];
  relatedAuditIds?: string[];
  relatedFindingIds?: string[];
  changeSummary?: string;
};

export type UpdateTaskStatusDto = {
  status: TaskStatus;
};
