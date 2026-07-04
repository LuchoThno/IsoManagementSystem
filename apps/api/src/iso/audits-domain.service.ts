import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CreateAuditDto, UpdateAuditDto } from './dto/audits.dto';
import { Audit, Finding } from './schemas/audit.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class AuditsDomainService {
  constructor(
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async listAudits() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillAuditTenantIds(tenantId);
    const audits = await this.auditModel.find({ tenantId }).sort({ date: 1 }).lean();
    return audits.map((audit) => this.serializeAudit(audit));
  }

  async createAudit(payload: CreateAuditDto) {
    const tenantId = await this.resolveEffectiveTenantId();
    const audit = await this.auditModel.create({
      tenantId,
      ...payload,
      date: new Date(payload.date),
      findings: payload.findings.map((finding) => ({
        ...finding,
        dueDate: new Date(finding.dueDate),
      })),
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
    updates: UpdateAuditDto
  ) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillAuditTenantIds(tenantId);
    const audit = await this.auditModel.findOne({ _id: id, tenantId });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

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

    await audit.save();
    return this.serializeAudit(audit.toObject());
  }

  async deleteAudit(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillAuditTenantIds(tenantId);
    await this.auditModel.findOneAndDelete({ _id: id, tenantId });
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
      findings: (audit.findings ?? []).map((finding: Finding) => ({
        id: finding.id,
        type: finding.type,
        description: finding.description,
        status: finding.status,
        dueDate: finding.dueDate,
        assignedTo: finding.assignedTo,
      })),
    };
  }
}
