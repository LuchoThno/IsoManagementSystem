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
};

export type UpdateTaskStatusDto = {
  status: TaskStatus;
};
