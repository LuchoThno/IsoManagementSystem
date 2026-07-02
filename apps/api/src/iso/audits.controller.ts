import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  AUDIT_STATUS_VALUES,
  AUDIT_TYPE_VALUES,
  FINDING_STATUS_VALUES,
  FINDING_TYPE_VALUES,
} from './domain.constants';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { GrcService } from './grc.service';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import type { CreateAuditDto, UpdateAuditDto, UpdateAuditStatusDto } from './dto/audits.dto';
import {
  ensureEnumValue,
  ensureIsoDateString,
  ensureNonEmptyString,
  ensureOptionalEnumValue,
  ensureOptionalIsoDateString,
  ensureOptionalString,
} from './request-validation';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class AuditsController {
  constructor(
    private readonly isoService: IsoService,
    private readonly grcService: GrcService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  @Get('audits')
  getAudits() {
    return this.isoService.getAudits();
  }

  @Get('audits/:id/checklist')
  getAuditChecklist(@Param('id') id: string) {
    return this.grcService.getAuditChecklist(id);
  }

  @Post('audits')
  @Roles('admin', 'manager', 'auditor')
  async createAudit(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: CreateAuditDto
  ) {
    ensureNonEmptyString(body.standard, 'standard');
    ensureEnumValue(body.type, 'type', AUDIT_TYPE_VALUES);
    ensureIsoDateString(body.date, 'date');
    ensureEnumValue(body.status, 'status', AUDIT_STATUS_VALUES);
    if (!Array.isArray(body.findings)) {
      throw new BadRequestException('El campo "findings" debe ser un arreglo.');
    }
    body.findings.forEach((finding, index) => {
      ensureNonEmptyString(finding.id, `findings[${index}].id`);
      ensureEnumValue(finding.type, `findings[${index}].type`, FINDING_TYPE_VALUES);
      ensureNonEmptyString(finding.description, `findings[${index}].description`);
      ensureEnumValue(finding.status, `findings[${index}].status`, FINDING_STATUS_VALUES);
      ensureIsoDateString(finding.dueDate, `findings[${index}].dueDate`);
      ensureNonEmptyString(finding.assignedTo, `findings[${index}].assignedTo`);
    });

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

  @Patch('audits/:id')
  @Roles('admin', 'manager', 'auditor')
  async updateAudit(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateAuditDto
  ) {
    ensureOptionalEnumValue(body.type, 'type', AUDIT_TYPE_VALUES);
    ensureOptionalString(body.standard, 'standard');
    ensureOptionalIsoDateString(body.date, 'date');
    ensureOptionalEnumValue(body.status, 'status', AUDIT_STATUS_VALUES);
    if (body.findings !== undefined) {
      if (!Array.isArray(body.findings)) {
        throw new BadRequestException('El campo "findings" debe ser un arreglo.');
      }
      body.findings.forEach((finding, index) => {
        ensureNonEmptyString(finding.id, `findings[${index}].id`);
        ensureEnumValue(finding.type, `findings[${index}].type`, FINDING_TYPE_VALUES);
        ensureNonEmptyString(finding.description, `findings[${index}].description`);
        ensureEnumValue(finding.status, `findings[${index}].status`, FINDING_STATUS_VALUES);
        ensureIsoDateString(finding.dueDate, `findings[${index}].dueDate`);
        ensureNonEmptyString(finding.assignedTo, `findings[${index}].assignedTo`);
      });
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

  @Patch('audits/:id/status')
  @Roles('admin', 'manager', 'auditor')
  async updateAuditStatus(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: UpdateAuditStatusDto
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

  @Patch('audits/:id/delete')
  @Roles('admin', 'manager')
  async deleteAudit(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    const result = await this.isoService.deleteAudit(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'audits.delete',
      resourceType: 'audit',
      resourceId: id,
      status: 'success',
    });
    return result;
  }
}
