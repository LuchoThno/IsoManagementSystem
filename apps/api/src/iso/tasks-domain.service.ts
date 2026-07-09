import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { TaskStatus } from './domain.constants';
import type { CreateTaskDto, UpdateTaskDto } from './dto/tasks.dto';
import { TaskEntity } from './schemas/task.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';
import { TraceabilitySyncService } from './traceability-sync.service';

type ChangeContext = {
  author: string;
  summary?: string;
};

@Injectable()
export class TasksDomainService {
  constructor(
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService,
    private readonly traceabilitySyncService: TraceabilitySyncService
  ) {}

  async listTasks() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillTaskTenantIds(tenantId);
    const tasks = await this.taskModel.find({ tenantId }).sort({ dueDate: 1 }).lean();
    return tasks.map((task) => this.serializeTask(task));
  }

  async createTask(payload: CreateTaskDto, changeContext: ChangeContext) {
    const tenantId = await this.resolveEffectiveTenantId();
    const relatedDocuments = this.normalizeIds(payload.relatedDocuments);
    const relatedAuditIds = this.normalizeIds(payload.relatedAuditIds);
    const relatedFindingIds = this.normalizeIds(payload.relatedFindingIds);
    const task = await this.taskModel.create({
      tenantId,
      ...payload,
      dueDate: new Date(payload.dueDate),
      relatedDocuments,
      relatedAuditIds,
      relatedFindingIds,
      changeLog: [
        this.buildChangeEntry({
          author: changeContext.author,
          action: 'created',
          summary:
            changeContext.summary?.trim() ||
            'Se creó la tarea y quedó enlazada para seguimiento de auditoría.',
        }),
      ],
    });

    await this.traceabilitySyncService.syncTaskRelations({
      tenantId,
      resourceId: String(task._id),
      nextAuditIds: relatedAuditIds,
      nextDocumentIds: relatedDocuments,
    });

    return this.serializeTask(task.toObject());
  }

  async updateTaskStatus(
    id: string,
    status: TaskStatus
  ) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillTaskTenantIds(tenantId);
    const task = await this.taskModel.findOneAndUpdate(
      { _id: id, tenantId },
      { status },
      { new: true }
    );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.serializeTask(task.toObject());
  }

  async updateTask(
    id: string,
    updates: UpdateTaskDto,
    changeContext: ChangeContext
  ) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillTaskTenantIds(tenantId);
    const task = await this.taskModel.findOne({ _id: id, tenantId });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const previousAuditIds = this.normalizeIds(task.relatedAuditIds);
    const previousDocumentIds = this.normalizeIds(task.relatedDocuments);
    if (typeof updates.title === 'string') task.title = updates.title;
    if (typeof updates.description === 'string') task.description = updates.description;
    if (typeof updates.assignedTo === 'string') task.assignedTo = updates.assignedTo;
    if (typeof updates.dueDate === 'string') task.dueDate = new Date(updates.dueDate);
    if (typeof updates.status === 'string') task.status = updates.status;
    if (typeof updates.priority === 'string') task.priority = updates.priority;
    if (typeof updates.standard === 'string') task.standard = updates.standard;
    if (Array.isArray(updates.relatedDocuments)) {
      task.relatedDocuments = this.normalizeIds(updates.relatedDocuments);
    }
    if (Array.isArray(updates.relatedAuditIds)) {
      task.relatedAuditIds = this.normalizeIds(updates.relatedAuditIds);
    }
    if (Array.isArray(updates.relatedFindingIds)) {
      task.relatedFindingIds = this.normalizeIds(updates.relatedFindingIds);
    }

    task.changeLog = [
      ...(task.changeLog ?? []),
      this.buildChangeEntry({
        author: changeContext.author,
        action: 'updated',
        summary:
          changeContext.summary?.trim() ||
          'Se actualizaron datos de la tarea y sus vínculos de trazabilidad.',
      }),
    ];

    await task.save();
    await this.traceabilitySyncService.syncTaskRelations({
      tenantId,
      resourceId: id,
      previousAuditIds,
      nextAuditIds: this.normalizeIds(task.relatedAuditIds),
      previousDocumentIds,
      nextDocumentIds: this.normalizeIds(task.relatedDocuments),
    });
    return this.serializeTask(task.toObject());
  }

  async deleteTask(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillTaskTenantIds(tenantId);
    const task = await this.taskModel.findOneAndDelete({ _id: id, tenantId }).lean();
    if (task) {
      await this.traceabilitySyncService.syncTaskRelations({
        tenantId,
        resourceId: id,
        previousAuditIds: this.normalizeIds(task.relatedAuditIds),
        nextAuditIds: [],
        previousDocumentIds: this.normalizeIds(task.relatedDocuments),
        nextDocumentIds: [],
      });
    }
    return { success: true };
  }

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private async backfillTaskTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantId(this.taskModel, tenantId);
  }

  private serializeTask(task: any) {
    return {
      id: String(task._id),
      tenantId: task.tenantId ?? null,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      standard: task.standard,
      relatedDocuments: task.relatedDocuments ?? [],
      relatedAuditIds: task.relatedAuditIds ?? [],
      relatedFindingIds: task.relatedFindingIds ?? [],
      changeLog: (task.changeLog ?? []).map((entry: any) => ({
        id: entry.id,
        date: entry.date,
        author: entry.author,
        action: entry.action,
        summary: entry.summary,
      })),
    };
  }

  private normalizeIds(ids?: string[]) {
    return Array.from(
      new Set(
        (ids ?? [])
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      )
    );
  }

  private buildChangeEntry({
    author,
    action,
    summary,
  }: {
    author: string;
    action: string;
    summary: string;
  }) {
    return {
      id: this.makeId('task-change'),
      date: new Date(),
      author,
      action,
      summary,
    };
  }

  private makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
