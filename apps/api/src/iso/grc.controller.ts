import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  APPENDIX_TYPE_VALUES,
  CONTRACT_DOCUMENT_KIND_VALUES,
  CONTRACT_OBLIGATION_STATUS_VALUES,
  CONTRACT_STATUS_VALUES,
  CORRECTIVE_SOURCE_TYPE_VALUES,
  CORRECTIVE_STATUS_VALUES,
  EVIDENCE_OBJECTIVE_TYPE_VALUES,
  EVIDENCE_STATUS_VALUES,
  TASK_PRIORITY_VALUES,
  REQUIREMENT_CRITICALITY_VALUES,
  REQUIREMENT_STATUS_VALUES,
  STANDARD_CATEGORY_VALUES,
  STANDARD_STATUS_VALUES,
} from './domain.constants';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import type {
  CreateContractDto,
  CreateCorrectiveActionDto,
  CreateEvidenceDto,
  StandardPayload,
} from './dto/grc.dto';
import { GrcService } from './grc.service';
import { PlatformAuditService } from './platform-audit.service';
import {
  ensureArray,
  ensureEnumValue,
  ensureIsoDateString,
  ensureNonEmptyString,
  ensureOptionalEnumValue,
  ensureOptionalIsoDateString,
  ensureOptionalString,
  ensureStringArray,
} from './request-validation';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class GrcController {
  constructor(
    private readonly grcService: GrcService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  @Get('standards')
  getStandards() {
    return this.grcService.listStandards();
  }

  @Post('standards')
  @Roles('admin', 'manager')
  async createStandard(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: StandardPayload
  ) {
    this.validateStandardPayload(body);
    const standard = await this.grcService.createStandard(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'standards.create',
      resourceType: 'standard',
      resourceId: standard?.standard?.id ?? null,
      status: 'success',
      metadata: {
        code: body?.code ?? null,
      },
    });
    return standard;
  }

  @Put('standards/:id')
  @Roles('admin', 'manager')
  async updateStandard(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: StandardPayload
  ) {
    this.validateStandardPayload(body);
    const standard = await this.grcService.updateStandard(id, body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'standards.update',
      resourceType: 'standard',
      resourceId: standard?.standard?.id ?? id,
      status: 'success',
      metadata: {
        code: body?.code ?? null,
      },
    });
    return standard;
  }

  @Delete('standards/:id')
  @Roles('admin')
  async deleteStandard(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    const result = await this.grcService.deleteStandard(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'standards.delete',
      resourceType: 'standard',
      resourceId: id,
      status: 'success',
    });
    return result;
  }

  @Get('standards/:id/structure')
  getStandardStructure(@Param('id') id: string) {
    return this.grcService.getStandardStructure(id);
  }

  @Get('requirements/:id/evidences')
  getRequirementEvidences(@Param('id') id: string) {
    return this.grcService.listRequirementEvidences(id);
  }

  @Get('evidences')
  getEvidences(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string
  ) {
    return this.grcService.listEvidences({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
    });
  }

  @Post('evidences')
  @Roles('admin', 'manager', 'auditor')
  async createEvidence(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: CreateEvidenceDto
  ) {
    this.validateEvidencePayload(body);
    const evidence = await this.grcService.createEvidence(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'evidences.create',
      resourceType: 'evidence',
      resourceId: evidence?.id ?? null,
      status: 'success',
      metadata: {
        title: body.title,
        requirementId: body.requirementId,
      },
    });
    return evidence;
  }

  @Get('contracts')
  getContracts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string
  ) {
    return this.grcService.listContracts({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
    });
  }

  @Post('contracts')
  @Roles('admin', 'manager')
  async createContract(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: CreateContractDto
  ) {
    this.validateContractPayload(body);
    const contract = await this.grcService.createContract(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'contracts.create',
      resourceType: 'contract',
      resourceId: contract?.id ?? null,
      status: 'success',
      metadata: {
        title: body.title,
        identifier: body.identifier,
      },
    });
    return contract;
  }

  @Get('contracts/:id/obligations')
  getContractObligations(@Param('id') id: string) {
    return this.grcService.listContractObligations(id);
  }

  @Get('corrective-actions')
  getCorrectiveActions() {
    return this.grcService.listCorrectiveActions();
  }

  @Post('corrective-actions')
  @Roles('admin', 'manager', 'auditor')
  async createCorrectiveAction(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: CreateCorrectiveActionDto
  ) {
    this.validateCorrectiveActionPayload(body);
    const action = await this.grcService.createCorrectiveAction(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'corrective-actions.create',
      resourceType: 'corrective-action',
      resourceId: action?.id ?? null,
      status: 'success',
      metadata: {
        title: body.title,
        sourceType: body.sourceType,
      },
    });
    return action;
  }

  @Get('grc/summary')
  getGrcSummary() {
    return this.grcService.getOverview();
  }

  private validateStandardPayload(body: any) {
    ensureNonEmptyString(body?.code, 'code');
    ensureNonEmptyString(body?.title, 'title');
    ensureOptionalString(body?.description, 'description');
    ensureOptionalEnumValue(body?.category, 'category', STANDARD_CATEGORY_VALUES);
    ensureOptionalEnumValue(body?.status, 'status', STANDARD_STATUS_VALUES);
    ensureOptionalString(body?.version, 'version');
    ensureOptionalString(body?.owner, 'owner');
    ensureOptionalIsoDateString(body?.publishedAt, 'publishedAt');

    if (body?.sections !== undefined) {
      ensureArray(body.sections, 'sections');

      body.sections.forEach((section: any, sectionIndex: number) => {
        ensureNonEmptyString(section?.code, `sections[${sectionIndex}].code`);
        ensureNonEmptyString(section?.title, `sections[${sectionIndex}].title`);
        ensureOptionalString(section?.description, `sections[${sectionIndex}].description`);

        if (section?.clauses !== undefined) {
          this.validateClauseTree(section.clauses, `sections[${sectionIndex}].clauses`);
        }
      });
    }

    if (body?.appendices !== undefined) {
      ensureArray(body.appendices, 'appendices');

      body.appendices.forEach((appendix: any, appendixIndex: number) => {
        ensureNonEmptyString(appendix?.code, `appendices[${appendixIndex}].code`);
        ensureNonEmptyString(appendix?.title, `appendices[${appendixIndex}].title`);
        ensureOptionalEnumValue(
          appendix?.type,
          `appendices[${appendixIndex}].type`,
          APPENDIX_TYPE_VALUES
        );
        ensureOptionalString(appendix?.description, `appendices[${appendixIndex}].description`);
        ensureOptionalString(appendix?.content, `appendices[${appendixIndex}].content`);
      });
    }
  }

  private validateClauseTree(clauses: any, field: string) {
    ensureArray(clauses, field);

    clauses.forEach((clause: any, clauseIndex: number) => {
      const clauseField = `${field}[${clauseIndex}]`;
      ensureNonEmptyString(clause?.code, `${clauseField}.code`);
      ensureNonEmptyString(clause?.title, `${clauseField}.title`);
      ensureOptionalString(clause?.description, `${clauseField}.description`);

      if (clause?.requirements !== undefined) {
        ensureArray(clause.requirements, `${clauseField}.requirements`);

        clause.requirements.forEach((requirement: any, requirementIndex: number) => {
          const requirementField = `${clauseField}.requirements[${requirementIndex}]`;
          ensureNonEmptyString(requirement?.code, `${requirementField}.code`);
          ensureNonEmptyString(requirement?.title, `${requirementField}.title`);
          ensureOptionalString(requirement?.description, `${requirementField}.description`);
          ensureOptionalString(requirement?.intent, `${requirementField}.intent`);
          ensureOptionalEnumValue(
            requirement?.criticality,
            `${requirementField}.criticality`,
            REQUIREMENT_CRITICALITY_VALUES
          );
          ensureOptionalEnumValue(
            requirement?.status,
            `${requirementField}.status`,
            REQUIREMENT_STATUS_VALUES
          );
        });
      }

      if (clause?.children !== undefined) {
        this.validateClauseTree(clause.children, `${clauseField}.children`);
      }
    });
  }

  private validateEvidencePayload(body: any) {
    ensureNonEmptyString(body?.title, 'title');
    ensureOptionalString(body?.description, 'description');
    ensureOptionalString(body?.standardId, 'standardId');
    ensureNonEmptyString(body?.requirementId, 'requirementId');
    ensureOptionalString(body?.clauseId, 'clauseId');
    ensureOptionalEnumValue(body?.status, 'status', EVIDENCE_STATUS_VALUES);
    ensureOptionalEnumValue(body?.objectiveType, 'objectiveType', EVIDENCE_OBJECTIVE_TYPE_VALUES);
    ensureOptionalString(body?.owner, 'owner');
    ensureOptionalString(body?.sourceDocumentId, 'sourceDocumentId');
    if (body?.documentIds !== undefined) ensureStringArray(body.documentIds, 'documentIds');
    if (body?.linkedAuditIds !== undefined) ensureStringArray(body.linkedAuditIds, 'linkedAuditIds');
    ensureOptionalIsoDateString(body?.dueDate, 'dueDate');
    ensureOptionalIsoDateString(body?.collectedAt, 'collectedAt');
    ensureOptionalString(body?.notes, 'notes');
  }

  private validateContractPayload(body: any) {
    ensureNonEmptyString(body?.title, 'title');
    ensureNonEmptyString(body?.counterparty, 'counterparty');
    ensureNonEmptyString(body?.identifier, 'identifier');
    ensureOptionalEnumValue(body?.status, 'status', CONTRACT_STATUS_VALUES);
    ensureOptionalIsoDateString(body?.startDate, 'startDate');
    ensureOptionalIsoDateString(body?.endDate, 'endDate');
    if (body?.standardIds !== undefined) ensureStringArray(body.standardIds, 'standardIds');
    ensureOptionalString(body?.owner, 'owner');
    ensureOptionalString(body?.summary, 'summary');

    if (body?.obligations !== undefined) {
      ensureArray(body.obligations, 'obligations');

      body.obligations.forEach((obligation: any, obligationIndex: number) => {
        ensureOptionalString(obligation?.standardId, `obligations[${obligationIndex}].standardId`);
        ensureNonEmptyString(obligation?.title, `obligations[${obligationIndex}].title`);
        ensureOptionalString(obligation?.description, `obligations[${obligationIndex}].description`);
        ensureOptionalString(obligation?.sourceClause, `obligations[${obligationIndex}].sourceClause`);
        ensureOptionalIsoDateString(obligation?.dueDate, `obligations[${obligationIndex}].dueDate`);
        ensureOptionalEnumValue(
          obligation?.status,
          `obligations[${obligationIndex}].status`,
          CONTRACT_OBLIGATION_STATUS_VALUES
        );
        ensureOptionalEnumValue(
          obligation?.priority,
          `obligations[${obligationIndex}].priority`,
          TASK_PRIORITY_VALUES
        );
        ensureOptionalString(obligation?.owner, `obligations[${obligationIndex}].owner`);
        if (obligation?.evidenceIds !== undefined) {
          ensureStringArray(obligation.evidenceIds, `obligations[${obligationIndex}].evidenceIds`);
        }
      });
    }

    if (body?.documents !== undefined) {
      ensureArray(body.documents, 'documents');

      body.documents.forEach((document: any, documentIndex: number) => {
        ensureNonEmptyString(document?.title, `documents[${documentIndex}].title`);
        ensureOptionalEnumValue(
          document?.kind,
          `documents[${documentIndex}].kind`,
          CONTRACT_DOCUMENT_KIND_VALUES
        );
        ensureNonEmptyString(document?.fileName, `documents[${documentIndex}].fileName`);
        ensureNonEmptyString(document?.mimeType, `documents[${documentIndex}].mimeType`);
        ensureNonEmptyString(document?.url, `documents[${documentIndex}].url`);
        ensureOptionalIsoDateString(document?.uploadedAt, `documents[${documentIndex}].uploadedAt`);
      });
    }
  }

  private validateCorrectiveActionPayload(body: any) {
    ensureNonEmptyString(body?.title, 'title');
    ensureOptionalString(body?.description, 'description');
    ensureEnumValue(body?.sourceType, 'sourceType', CORRECTIVE_SOURCE_TYPE_VALUES);
    ensureNonEmptyString(body?.sourceId, 'sourceId');
    ensureOptionalString(body?.standardId, 'standardId');
    ensureOptionalString(body?.auditId, 'auditId');
    ensureOptionalString(body?.assignedTo, 'assignedTo');
    ensureOptionalIsoDateString(body?.dueDate, 'dueDate');
    ensureOptionalEnumValue(body?.status, 'status', CORRECTIVE_STATUS_VALUES);
    ensureOptionalEnumValue(body?.priority, 'priority', TASK_PRIORITY_VALUES);
    if (body?.evidenceIds !== undefined) ensureStringArray(body.evidenceIds, 'evidenceIds');
    ensureOptionalString(body?.verificationNotes, 'verificationNotes');
  }
}
