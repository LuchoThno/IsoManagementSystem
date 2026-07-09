import { BadRequestException, Injectable } from '@nestjs/common';
import {
  APPENDIX_TYPE_VALUES,
  CONTRACT_DOCUMENT_KIND_VALUES,
  CONTRACT_OBLIGATION_STATUS_VALUES,
  CONTRACT_STATUS_VALUES,
  CORRECTIVE_SOURCE_TYPE_VALUES,
  CORRECTIVE_STATUS_VALUES,
  EVIDENCE_OBJECTIVE_TYPE_VALUES,
  EVIDENCE_STATUS_VALUES,
  FINDING_STATUS_VALUES,
  REQUIREMENT_CRITICALITY_VALUES,
  REQUIREMENT_STATUS_VALUES,
  STANDARD_CATEGORY_VALUES,
  STANDARD_STATUS_VALUES,
  TASK_PRIORITY_VALUES,
} from './domain.constants';
import type {
  CreateContractDto,
  CreateCorrectiveActionDto,
  CreateEvidenceDto,
  PaginationParams,
  StandardClausePayload,
  StandardPayload,
  StandardRequirementPayload,
  UpdateEvidenceDto,
} from './dto/grc.dto';
import { GrcOperationalDomainService } from './grc-operational-domain.service';
import { GrcStandardsDomainService } from './grc-standards-domain.service';
import { PlatformAuditService } from './platform-audit.service';
import {
  ensureArray,
  ensureEnumValue,
  ensureIntegerInRange,
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
export class GrcOperationsService {
  constructor(
    private readonly grcStandardsDomainService: GrcStandardsDomainService,
    private readonly grcOperationalDomainService: GrcOperationalDomainService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  listStandards() {
    return this.grcStandardsDomainService.listStandards();
  }

  async createStandard(clerkAuth: ClerkSessionIdentity | null, body: StandardPayload) {
    this.validateStandardPayload(body);
    const standard = await this.grcStandardsDomainService.createStandard(body);
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

  async updateStandard(
    id: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: StandardPayload
  ) {
    this.validateStandardPayload(body);
    const standard = await this.grcStandardsDomainService.updateStandard(id, body);
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

  async deleteStandard(id: string, clerkAuth: ClerkSessionIdentity | null) {
    const result = await this.grcStandardsDomainService.deleteStandard(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'standards.delete',
      resourceType: 'standard',
      resourceId: id,
      status: 'success',
    });
    return result;
  }

  getStandardStructure(id: string) {
    return this.grcStandardsDomainService.getStandardStructure(id);
  }

  getRequirementEvidences(id: string) {
    return this.grcOperationalDomainService.listRequirementEvidences(id);
  }

  getEvidences(params: PaginationParams) {
    return this.grcOperationalDomainService.listEvidences(params);
  }

  async createEvidence(clerkAuth: ClerkSessionIdentity | null, body: CreateEvidenceDto) {
    this.validateEvidencePayload(body);
    const evidence = await this.grcOperationalDomainService.createEvidence(body);
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

  async updateEvidence(
    id: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: UpdateEvidenceDto
  ) {
    ensureNonEmptyString(id, 'id');
    this.validateEvidenceUpdatePayload(body);
    const evidence = await this.grcOperationalDomainService.updateEvidence(
      id,
      body,
      await this.platformAuditService.getActorLabel(clerkAuth)
    );
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'evidences.update',
      resourceType: 'evidence',
      resourceId: id,
      status: 'success',
      metadata: {
        title: body.title ?? null,
        statusValue: body.status ?? null,
        findingId: body.findingId ?? null,
      },
    });
    return evidence;
  }

  async deleteEvidence(id: string, clerkAuth: ClerkSessionIdentity | null) {
    ensureNonEmptyString(id, 'id');
    const result = await this.grcOperationalDomainService.deleteEvidence(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'evidences.delete',
      resourceType: 'evidence',
      resourceId: id,
      status: 'success',
    });
    return result;
  }

  getContracts(params: PaginationParams) {
    return this.grcOperationalDomainService.listContracts(params);
  }

  async createContract(clerkAuth: ClerkSessionIdentity | null, body: CreateContractDto) {
    this.validateContractPayload(body);
    const contract = await this.grcOperationalDomainService.createContract(body);
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

  getContractObligations(id: string) {
    return this.grcOperationalDomainService.listContractObligations(id);
  }

  getCorrectiveActions() {
    return this.grcOperationalDomainService.listCorrectiveActions();
  }

  async createCorrectiveAction(
    clerkAuth: ClerkSessionIdentity | null,
    body: CreateCorrectiveActionDto
  ) {
    this.validateCorrectiveActionPayload(body);
    const action = await this.grcOperationalDomainService.createCorrectiveAction(body);
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

  getGrcSummary() {
    return this.grcOperationalDomainService.getOverview();
  }

  getAuditExecutionReport(auditId: string) {
    ensureNonEmptyString(auditId, 'auditId');
    return this.grcOperationalDomainService.getAuditExecutionReport(auditId);
  }

  private validateStandardPayload(body: StandardPayload) {
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

      body.sections.forEach((section, sectionIndex) => {
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

      body.appendices.forEach((appendix, appendixIndex) => {
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

  private validateClauseTree(clauses: StandardClausePayload[], field: string) {
    ensureArray(clauses, field);

    clauses.forEach((clause: StandardClausePayload, clauseIndex: number) => {
      const clauseField = `${field}[${clauseIndex}]`;
      ensureNonEmptyString(clause?.code, `${clauseField}.code`);
      ensureNonEmptyString(clause?.title, `${clauseField}.title`);
      ensureOptionalString(clause?.description, `${clauseField}.description`);

      if (clause?.requirements !== undefined) {
        ensureArray(clause.requirements, `${clauseField}.requirements`);

        clause.requirements.forEach(
          (requirement: StandardRequirementPayload, requirementIndex: number) => {
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
          }
        );
      }

      if (clause?.children !== undefined) {
        this.validateClauseTree(clause.children, `${clauseField}.children`);
      }
    });
  }

  private validateEvidencePayload(body: CreateEvidenceDto) {
    ensureObject(body, 'body');
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
    ensureOptionalString(body?.findingId, 'findingId');
    if (body?.linkedTaskIds !== undefined) ensureStringArray(body.linkedTaskIds, 'linkedTaskIds');
    ensureOptionalString(body?.fulfillmentSummary, 'fulfillmentSummary');
    if (body?.completionPercentage !== undefined) {
      ensureIntegerInRange(body.completionPercentage, 'completionPercentage', { min: 0, max: 100 });
    }
    ensureOptionalIsoDateString(body?.dueDate, 'dueDate');
    ensureOptionalIsoDateString(body?.collectedAt, 'collectedAt');
    ensureOptionalString(body?.notes, 'notes');
    ensureOptionalString(body?.changeSummary, 'changeSummary');
  }

  private validateEvidenceUpdatePayload(body: UpdateEvidenceDto) {
    ensureObject(body, 'body');
    ensureOptionalString(body?.title, 'title');
    ensureOptionalString(body?.description, 'description');
    ensureOptionalString(body?.standardId, 'standardId');
    ensureOptionalString(body?.requirementId, 'requirementId');
    ensureOptionalString(body?.clauseId, 'clauseId');
    ensureOptionalEnumValue(body?.status, 'status', EVIDENCE_STATUS_VALUES);
    ensureOptionalEnumValue(body?.objectiveType, 'objectiveType', EVIDENCE_OBJECTIVE_TYPE_VALUES);
    ensureOptionalString(body?.owner, 'owner');
    ensureOptionalString(body?.sourceDocumentId, 'sourceDocumentId');
    if (body?.documentIds !== undefined) ensureStringArray(body.documentIds, 'documentIds');
    if (body?.linkedAuditIds !== undefined) ensureStringArray(body.linkedAuditIds, 'linkedAuditIds');
    ensureOptionalString(body?.findingId, 'findingId');
    if (body?.linkedTaskIds !== undefined) ensureStringArray(body.linkedTaskIds, 'linkedTaskIds');
    ensureOptionalString(body?.fulfillmentSummary, 'fulfillmentSummary');
    if (body?.completionPercentage !== undefined) {
      ensureIntegerInRange(body.completionPercentage, 'completionPercentage', { min: 0, max: 100 });
    }
    ensureOptionalIsoDateString(body?.dueDate, 'dueDate');
    ensureOptionalIsoDateString(body?.collectedAt, 'collectedAt');
    ensureOptionalString(body?.notes, 'notes');
    ensureOptionalString(body?.changeSummary, 'changeSummary');
  }

  private validateContractPayload(body: CreateContractDto) {
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

      body.obligations.forEach((obligation, obligationIndex) => {
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

      body.documents.forEach((document, documentIndex) => {
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

  private validateCorrectiveActionPayload(body: CreateCorrectiveActionDto) {
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
