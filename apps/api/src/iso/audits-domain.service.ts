import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CreateAuditDto, UpdateAuditDto } from './dto/audits.dto';
import { Audit, Finding } from './schemas/audit.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';
import { TraceabilitySyncService } from './traceability-sync.service';

type ChangeContext = {
  author: string;
  summary?: string;
};

@Injectable()
export class AuditsDomainService {
  constructor(
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService,
    private readonly traceabilitySyncService: TraceabilitySyncService
  ) {}

  async listAudits() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillAuditTenantIds(tenantId);
    const audits = await this.auditModel.find({ tenantId }).sort({ date: 1 }).lean();
    return audits.map((audit) => this.serializeAudit(audit));
  }

  async createAudit(payload: CreateAuditDto, changeContext: ChangeContext) {
    const tenantId = await this.resolveEffectiveTenantId();
    const relatedTaskIds = this.normalizeIds(payload.relatedTaskIds);
    const relatedDocumentIds = this.normalizeIds(payload.relatedDocumentIds);
    const audit = await this.auditModel.create({
      tenantId,
      ...payload,
      date: new Date(payload.date),
      relatedTaskIds,
      relatedDocumentIds,
      findings: payload.findings.map((finding) => ({
        ...finding,
        dueDate: new Date(finding.dueDate),
      })),
      changeLog: [
        this.buildChangeEntry({
          author: changeContext.author,
          action: 'created',
          summary:
            changeContext.summary?.trim() ||
            'Se creó la auditoría y se habilitó su trazabilidad con otros módulos.',
        }),
      ],
    });

    await this.traceabilitySyncService.syncAuditRelations({
      tenantId,
      resourceId: String(audit._id),
      nextTaskIds: relatedTaskIds,
      nextDocumentIds: relatedDocumentIds,
    });

    return this.serializeAudit(audit.toObject());
  }

  async updateAuditStatus(
    id: string,
    status: 'planned' | 'in-progress' | 'completed'
  ) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillAuditTenantIds(tenantId);
    const audit = await this.auditModel.findOneAndUpdate(
      { _id: id, tenantId },
      { status },
      { new: true }
    );

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    return this.serializeAudit(audit.toObject());
  }

  async updateAudit(
    id: string,
    updates: UpdateAuditDto,
    changeContext: ChangeContext
  ) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillAuditTenantIds(tenantId);
    const audit = await this.auditModel.findOne({ _id: id, tenantId });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    const previousTaskIds = this.normalizeIds(audit.relatedTaskIds);
    const previousDocumentIds = this.normalizeIds(audit.relatedDocumentIds);
    if (typeof updates.type === 'string') audit.type = updates.type;
    if (typeof updates.standard === 'string') audit.standard = updates.standard;
    if (typeof updates.date === 'string') audit.date = new Date(updates.date);
    if (typeof updates.status === 'string') audit.status = updates.status;
    if (Array.isArray(updates.findings)) {
      audit.findings = updates.findings.map((finding) => ({
        ...finding,
        dueDate: new Date(finding.dueDate),
      })) as Finding[];
    }
    if (updates.relatedTaskIds !== undefined) {
      audit.relatedTaskIds = this.normalizeIds(updates.relatedTaskIds);
    }
    if (updates.relatedDocumentIds !== undefined) {
      audit.relatedDocumentIds = this.normalizeIds(updates.relatedDocumentIds);
    }

    audit.changeLog = [
      ...(audit.changeLog ?? []),
      this.buildChangeEntry({
        author: changeContext.author,
        action: 'updated',
        summary:
          changeContext.summary?.trim() ||
          'Se actualizaron datos de la auditoría y sus relaciones de seguimiento.',
      }),
    ];

    await audit.save();
    await this.traceabilitySyncService.syncAuditRelations({
      tenantId,
      resourceId: id,
      previousTaskIds,
      nextTaskIds: this.normalizeIds(audit.relatedTaskIds),
      previousDocumentIds,
      nextDocumentIds: this.normalizeIds(audit.relatedDocumentIds),
    });
    return this.serializeAudit(audit.toObject());
  }

  async deleteAudit(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillAuditTenantIds(tenantId);
    const audit = await this.auditModel.findOneAndDelete({ _id: id, tenantId }).lean();
    if (audit) {
      await this.traceabilitySyncService.syncAuditRelations({
        tenantId,
        resourceId: id,
        previousTaskIds: this.normalizeIds(audit.relatedTaskIds),
        nextTaskIds: [],
        previousDocumentIds: this.normalizeIds(audit.relatedDocumentIds),
        nextDocumentIds: [],
      });
    }
    return { success: true };
  }

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private async backfillAuditTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantId(this.auditModel, tenantId);
  }

  private serializeAudit(audit: any) {
    return {
      id: String(audit._id),
      tenantId: audit.tenantId ?? null,
      type: audit.type,
      standard: audit.standard,
      date: audit.date,
      status: audit.status,
      relatedTaskIds: audit.relatedTaskIds ?? [],
      relatedDocumentIds: audit.relatedDocumentIds ?? [],
      findings: (audit.findings ?? []).map((finding: Finding) => ({
        id: finding.id,
        type: finding.type,
        description: finding.description,
        status: finding.status,
        dueDate: finding.dueDate,
        assignedTo: finding.assignedTo,
      })),
      changeLog: (audit.changeLog ?? []).map((entry: any) => ({
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
      id: this.makeId('audit-change'),
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
