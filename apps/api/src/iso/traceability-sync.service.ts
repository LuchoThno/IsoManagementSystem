import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit } from './schemas/audit.schema';
import { DocumentEntity } from './schemas/document.schema';
import { TaskEntity } from './schemas/task.schema';

type RelationSyncInput = {
  tenantId: string;
  resourceId: string;
  previousAuditIds?: string[];
  nextAuditIds?: string[];
  previousTaskIds?: string[];
  nextTaskIds?: string[];
  previousDocumentIds?: string[];
  nextDocumentIds?: string[];
};

@Injectable()
export class TraceabilitySyncService {
  constructor(
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntity>
  ) {}

  async syncAuditRelations(input: RelationSyncInput) {
    const previousTaskIds = this.normalizeIds(input.previousTaskIds);
    const nextTaskIds = this.normalizeIds(input.nextTaskIds);
    const previousDocumentIds = this.normalizeIds(input.previousDocumentIds);
    const nextDocumentIds = this.normalizeIds(input.nextDocumentIds);

    await this.syncArrayField({
      model: this.taskModel,
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      previousIds: previousTaskIds,
      nextIds: nextTaskIds,
      field: 'relatedAuditIds',
    });

    await this.syncArrayField({
      model: this.documentModel,
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      previousIds: previousDocumentIds,
      nextIds: nextDocumentIds,
      field: 'linkedAuditIds',
    });
  }

  async syncTaskRelations(input: RelationSyncInput) {
    const previousAuditIds = this.normalizeIds(input.previousAuditIds);
    const nextAuditIds = this.normalizeIds(input.nextAuditIds);
    const previousDocumentIds = this.normalizeIds(input.previousDocumentIds);
    const nextDocumentIds = this.normalizeIds(input.nextDocumentIds);

    await this.syncArrayField({
      model: this.auditModel,
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      previousIds: previousAuditIds,
      nextIds: nextAuditIds,
      field: 'relatedTaskIds',
    });

    await this.syncArrayField({
      model: this.documentModel,
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      previousIds: previousDocumentIds,
      nextIds: nextDocumentIds,
      field: 'linkedTaskIds',
    });
  }

  async syncDocumentRelations(input: RelationSyncInput) {
    const previousAuditIds = this.normalizeIds(input.previousAuditIds);
    const nextAuditIds = this.normalizeIds(input.nextAuditIds);
    const previousTaskIds = this.normalizeIds(input.previousTaskIds);
    const nextTaskIds = this.normalizeIds(input.nextTaskIds);

    await this.syncArrayField({
      model: this.auditModel,
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      previousIds: previousAuditIds,
      nextIds: nextAuditIds,
      field: 'relatedDocumentIds',
    });

    await this.syncArrayField({
      model: this.taskModel,
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      previousIds: previousTaskIds,
      nextIds: nextTaskIds,
      field: 'relatedDocuments',
    });
  }

  private async syncArrayField({
    model,
    tenantId,
    resourceId,
    previousIds,
    nextIds,
    field,
  }: {
    model: Model<any>;
    tenantId: string;
    resourceId: string;
    previousIds: string[];
    nextIds: string[];
    field: string;
  }) {
    const idsToAdd = nextIds.filter((id) => !previousIds.includes(id));
    const idsToRemove = previousIds.filter((id) => !nextIds.includes(id));

    if (idsToAdd.length > 0) {
      await model.updateMany(
        { _id: { $in: idsToAdd }, tenantId },
        { $addToSet: { [field]: resourceId } }
      );
    }

    if (idsToRemove.length > 0) {
      await model.updateMany(
        { _id: { $in: idsToRemove }, tenantId },
        { $pull: { [field]: resourceId } }
      );
    }
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
}
