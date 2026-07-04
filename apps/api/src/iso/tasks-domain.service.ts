import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { TaskStatus } from './domain.constants';
import type { CreateTaskDto, UpdateTaskDto } from './dto/tasks.dto';
import { TaskEntity } from './schemas/task.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TasksDomainService {
  constructor(
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async listTasks() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillTaskTenantIds(tenantId);
    const tasks = await this.taskModel.find({ tenantId }).sort({ dueDate: 1 }).lean();
    return tasks.map((task) => this.serializeTask(task));
  }

  async createTask(payload: CreateTaskDto) {
    const tenantId = await this.resolveEffectiveTenantId();
    const task = await this.taskModel.create({
      tenantId,
      ...payload,
      dueDate: new Date(payload.dueDate),
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
    updates: UpdateTaskDto
  ) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillTaskTenantIds(tenantId);
    const task = await this.taskModel.findOne({ _id: id, tenantId });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (typeof updates.title === 'string') task.title = updates.title;
    if (typeof updates.description === 'string') task.description = updates.description;
    if (typeof updates.assignedTo === 'string') task.assignedTo = updates.assignedTo;
    if (typeof updates.dueDate === 'string') task.dueDate = new Date(updates.dueDate);
    if (typeof updates.status === 'string') task.status = updates.status;
    if (typeof updates.priority === 'string') task.priority = updates.priority;
    if (typeof updates.standard === 'string') task.standard = updates.standard;
    if (Array.isArray(updates.relatedDocuments)) task.relatedDocuments = updates.relatedDocuments;

    await task.save();
    return this.serializeTask(task.toObject());
  }

  async deleteTask(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillTaskTenantIds(tenantId);
    await this.taskModel.findOneAndDelete({ _id: id, tenantId });
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
    };
  }
}
