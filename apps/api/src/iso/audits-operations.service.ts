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
import { AuditsDomainService } from './audits-domain.service';
import { GrcStandardsDomainService } from './grc-standards-domain.service';
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
import type { ClerkSessionIdentity } from './clerk.types';

@Injectable()
export class AuditsOperationsService {
  constructor(
    private readonly auditsDomainService: AuditsDomainService,
    private readonly grcStandardsDomainService: GrcStandardsDomainService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  listAudits() {
    return this.auditsDomainService.listAudits();
  }

  getAuditChecklist(id: string) {
    ensureNonEmptyString(id, 'id');
    return this.grcStandardsDomainService.getAuditChecklist(id);
  }

  async createAudit(clerkAuth: ClerkSessionIdentity | null, body: CreateAuditDto) {
    ensureObject(body, 'body');
    ensureNonEmptyString(body.standard, 'standard');
    ensureEnumValue(body.type, 'type', AUDIT_TYPE_VALUES);
    ensureIsoDateString(body.date, 'date');
    ensureEnumValue(body.status, 'status', AUDIT_STATUS_VALUES);
    if (body.relatedTaskIds !== undefined) ensureStringArray(body.relatedTaskIds, 'relatedTaskIds');
    if (body.relatedDocumentIds !== undefined) {
      ensureStringArray(body.relatedDocumentIds, 'relatedDocumentIds');
    }
    ensureOptionalString(body.changeSummary, 'changeSummary');
    this.validateFindings(body.findings);

    const audit = await this.auditsDomainService.createAudit(body, {
      author: await this.platformAuditService.getActorLabel(clerkAuth),
      summary: body.changeSummary,
    });
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
    ensureNonEmptyString(id, 'id');
    ensureObject(body, 'body');
    ensureOptionalEnumValue(body.type, 'type', AUDIT_TYPE_VALUES);
    ensureOptionalString(body.standard, 'standard');
    ensureOptionalIsoDateString(body.date, 'date');
    ensureOptionalEnumValue(body.status, 'status', AUDIT_STATUS_VALUES);
    if (body.relatedTaskIds !== undefined) ensureStringArray(body.relatedTaskIds, 'relatedTaskIds');
    if (body.relatedDocumentIds !== undefined) {
      ensureStringArray(body.relatedDocumentIds, 'relatedDocumentIds');
    }
    ensureOptionalString(body.changeSummary, 'changeSummary');
    if (body.findings !== undefined) {
      this.validateFindings(body.findings);
    }

    const audit = await this.auditsDomainService.updateAudit(id, body, {
      author: await this.platformAuditService.getActorLabel(clerkAuth),
      summary: body.changeSummary,
    });
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
    ensureNonEmptyString(id, 'id');
    ensureObject(body, 'body');
    ensureEnumValue(body.status, 'status', AUDIT_STATUS_VALUES);
    const audit = await this.auditsDomainService.updateAuditStatus(id, body.status);
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
    ensureNonEmptyString(id, 'id');
    const result = await this.auditsDomainService.deleteAudit(id);
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
