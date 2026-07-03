import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AUDIT_STATUS_VALUES,
  AUDIT_TYPE_VALUES,
  FINDING_STATUS_VALUES,
  FINDING_TYPE_VALUES,
} from './domain.constants';
import type {
  CreateAuditDto,
  UpdateAuditDto,
  UpdateAuditStatusDto,
} from './dto/audits.dto';
import { GrcService } from './grc.service';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import {
  ensureEnumValue,
  ensureIsoDateString,
  ensureNonEmptyString,
  ensureOptionalEnumValue,
  ensureOptionalIsoDateString,
  ensureOptionalString,
} from './request-validation';
import type { ClerkSessionIdentity } from './clerk.types';

@Injectable()
export class AuditsOperationsService {
  constructor(
    private readonly isoService: IsoService,
    private readonly grcService: GrcService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  listAudits() {
    return this.isoService.getAudits();
  }

  getAuditChecklist(id: string) {
    return this.grcService.getAuditChecklist(id);
  }

  async createAudit(clerkAuth: ClerkSessionIdentity | null, body: CreateAuditDto) {
    ensureNonEmptyString(body.standard, 'standard');
    ensureEnumValue(body.type, 'type', AUDIT_TYPE_VALUES);
    ensureIsoDateString(body.date, 'date');
    ensureEnumValue(body.status, 'status', AUDIT_STATUS_VALUES);
    this.validateFindings(body.findings);

    const audit = await this.isoService.createAudit(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'audits.create',
      resourceType: 'audit',
      resourceId: audit?.id ?? null,
      status: 'success',
      metadata: {
        type: body.type,
        standard: body.standard,
        statusValue: body.status,
      },
    });
    return audit;
  }

  async updateAudit(id: string, clerkAuth: ClerkSessionIdentity | null, body: UpdateAuditDto) {
    ensureOptionalEnumValue(body.type, 'type', AUDIT_TYPE_VALUES);
    ensureOptionalString(body.standard, 'standard');
    ensureOptionalIsoDateString(body.date, 'date');
    ensureOptionalEnumValue(body.status, 'status', AUDIT_STATUS_VALUES);
    if (body.findings !== undefined) {
      this.validateFindings(body.findings);
    }

    const audit = await this.isoService.updateAudit(id, body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'audits.update',
      resourceType: 'audit',
      resourceId: id,
      status: 'success',
      metadata: {
        type: body.type ?? null,
        standard: body.standard ?? null,
        statusValue: body.status ?? null,
      },
    });
    return audit;
  }

  async updateAuditStatus(
    id: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: UpdateAuditStatusDto
  ) {
    const audit = await this.isoService.updateAuditStatus(id, body.status);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'audits.status.update',
      resourceType: 'audit',
      resourceId: id,
      status: 'success',
      metadata: {
        statusValue: body.status,
      },
    });
    return audit;
  }

  async deleteAudit(id: string, clerkAuth: ClerkSessionIdentity | null) {
    const result = await this.isoService.deleteAudit(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'audits.delete',
      resourceType: 'audit',
      resourceId: id,
      status: 'success',
    });
    return result;
  }

  private validateFindings(findings: CreateAuditDto['findings']) {
    if (!Array.isArray(findings)) {
      throw new BadRequestException('El campo "findings" debe ser un arreglo.');
    }

    findings.forEach((finding, index) => {
      ensureNonEmptyString(finding.id, `findings[${index}].id`);
      ensureEnumValue(finding.type, `findings[${index}].type`, FINDING_TYPE_VALUES);
      ensureNonEmptyString(finding.description, `findings[${index}].description`);
      ensureEnumValue(finding.status, `findings[${index}].status`, FINDING_STATUS_VALUES);
      ensureIsoDateString(finding.dueDate, `findings[${index}].dueDate`);
      ensureNonEmptyString(finding.assignedTo, `findings[${index}].assignedTo`);
    });
  }
}
