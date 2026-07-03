import { Injectable } from '@nestjs/common';
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from './domain.constants';
import type { ClerkSessionIdentity } from './clerk.types';
import type { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/tasks.dto';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import {
  ensureEnumValue,
  ensureIsoDateString,
  ensureNonEmptyString,
  ensureOptionalEnumValue,
  ensureOptionalIsoDateString,
  ensureOptionalString,
  ensureStringArray,
} from './request-validation';

@Injectable()
export class TasksOperationsService {
  constructor(
    private readonly isoService: IsoService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  listTasks() {
    return this.isoService.getTasks();
  }

  async createTask(clerkAuth: ClerkSessionIdentity | null, body: CreateTaskDto) {
    ensureNonEmptyString(body.title, 'title');
    ensureNonEmptyString(body.description, 'description');
    ensureNonEmptyString(body.assignedTo, 'assignedTo');
    ensureIsoDateString(body.dueDate, 'dueDate');
    ensureEnumValue(body.status, 'status', TASK_STATUS_VALUES);
    ensureEnumValue(body.priority, 'priority', TASK_PRIORITY_VALUES);
    ensureNonEmptyString(body.standard, 'standard');
    ensureStringArray(body.relatedDocuments, 'relatedDocuments');

    const task = await this.isoService.createTask(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'tasks.create',
      resourceType: 'task',
      resourceId: task?.id ?? null,
      status: 'success',
      metadata: {
        title: body.title,
        assignedTo: body.assignedTo,
        dueDate: body.dueDate,
      },
    });
    return task;
  }

  async updateTask(id: string, clerkAuth: ClerkSessionIdentity | null, body: UpdateTaskDto) {
    ensureOptionalString(body.title, 'title');
    ensureOptionalString(body.description, 'description');
    ensureOptionalString(body.assignedTo, 'assignedTo');
    ensureOptionalIsoDateString(body.dueDate, 'dueDate');
    ensureOptionalEnumValue(body.status, 'status', TASK_STATUS_VALUES);
    ensureOptionalEnumValue(body.priority, 'priority', TASK_PRIORITY_VALUES);
    ensureOptionalString(body.standard, 'standard');
    if (body.relatedDocuments !== undefined) {
      ensureStringArray(body.relatedDocuments, 'relatedDocuments');
    }

    const task = await this.isoService.updateTask(id, body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'tasks.update',
      resourceType: 'task',
      resourceId: id,
      status: 'success',
      metadata: {
        title: body.title ?? null,
        assignedTo: body.assignedTo ?? null,
        statusValue: body.status ?? null,
      },
    });
    return task;
  }

  async updateTaskStatus(
    id: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: UpdateTaskStatusDto
  ) {
    ensureEnumValue(body.status, 'status', TASK_STATUS_VALUES);

    const task = await this.isoService.updateTaskStatus(id, body.status);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'tasks.status.update',
      resourceType: 'task',
      resourceId: id,
      status: 'success',
      metadata: {
        statusValue: body.status,
      },
    });
    return task;
  }

  async deleteTask(id: string, clerkAuth: ClerkSessionIdentity | null) {
    const result = await this.isoService.deleteTask(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'tasks.delete',
      resourceType: 'task',
      resourceId: id,
      status: 'success',
    });
    return result;
  }
}
