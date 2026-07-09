import { Injectable } from '@nestjs/common';
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from './domain.constants';
import type { ClerkSessionIdentity } from './clerk.types';
import type { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/tasks.dto';
import { PlatformAuditService } from './platform-audit.service';
import {
  ensureEnumValue,
  ensureIsoDateString,
  ensureNonEmptyString,
  ensureObject,
  ensureOptionalEnumValue,
  ensureOptionalIsoDateString,
  ensureOptionalString,
  ensureStringArray,
} from './request-validation';
import { TasksDomainService } from './tasks-domain.service';

@Injectable()
export class TasksOperationsService {
  constructor(
    private readonly tasksDomainService: TasksDomainService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  listTasks() {
    return this.tasksDomainService.listTasks();
  }

  async createTask(clerkAuth: ClerkSessionIdentity | null, body: CreateTaskDto) {
    ensureObject(body, 'body');
    ensureNonEmptyString(body.title, 'title');
    ensureNonEmptyString(body.description, 'description');
    ensureNonEmptyString(body.assignedTo, 'assignedTo');
    ensureIsoDateString(body.dueDate, 'dueDate');
    ensureEnumValue(body.status, 'status', TASK_STATUS_VALUES);
    ensureEnumValue(body.priority, 'priority', TASK_PRIORITY_VALUES);
    ensureNonEmptyString(body.standard, 'standard');
    ensureStringArray(body.relatedDocuments, 'relatedDocuments');
    if (body.relatedAuditIds !== undefined) ensureStringArray(body.relatedAuditIds, 'relatedAuditIds');
    if (body.relatedFindingIds !== undefined) {
      ensureStringArray(body.relatedFindingIds, 'relatedFindingIds');
    }
    ensureOptionalString(body.changeSummary, 'changeSummary');

    const task = await this.tasksDomainService.createTask(body, {
      author: await this.platformAuditService.getActorLabel(clerkAuth),
      summary: body.changeSummary,
    });
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
    ensureNonEmptyString(id, 'id');
    ensureObject(body, 'body');
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
    if (body.relatedAuditIds !== undefined) {
      ensureStringArray(body.relatedAuditIds, 'relatedAuditIds');
    }
    if (body.relatedFindingIds !== undefined) {
      ensureStringArray(body.relatedFindingIds, 'relatedFindingIds');
    }
    ensureOptionalString(body.changeSummary, 'changeSummary');

    const task = await this.tasksDomainService.updateTask(id, body, {
      author: await this.platformAuditService.getActorLabel(clerkAuth),
      summary: body.changeSummary,
    });
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
    ensureNonEmptyString(id, 'id');
    ensureObject(body, 'body');
    ensureEnumValue(body.status, 'status', TASK_STATUS_VALUES);

    const task = await this.tasksDomainService.updateTaskStatus(id, body.status);
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
    ensureNonEmptyString(id, 'id');
    const result = await this.tasksDomainService.deleteTask(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'tasks.delete',
      resourceType: 'task',
      resourceId: id,
      status: 'success',
    });
    return result;
  }
}
