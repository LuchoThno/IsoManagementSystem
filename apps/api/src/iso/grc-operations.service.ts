import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
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
  UploadEvidenceDocumentDto,
  UpdateEvidenceDto,
} from './dto/grc.dto';
import { DocumentsDomainService } from './documents-domain.service';
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

type ExportValidationPayload = {
  version: '1.0';
  exportId: string;
  sourceType: 'audit' | 'evidence';
  sourceId: string;
  generatedAtIso: string;
  generatedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  checksum: string;
};

@Injectable()
export class GrcOperationsService {
  constructor(
    private readonly grcStandardsDomainService: GrcStandardsDomainService,
    private readonly grcOperationalDomainService: GrcOperationalDomainService,
    private readonly platformAuditService: PlatformAuditService,
    private readonly documentsDomainService: DocumentsDomainService
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

  async createAuditExportBundle(auditId: string, clerkAuth: ClerkSessionIdentity | null) {
    ensureNonEmptyString(auditId, 'auditId');
    const bundle = await this.grcOperationalDomainService.getAuditExportBundle(auditId);
    const validation = await this.buildExportValidation({
      clerkAuth,
      sourceType: 'audit',
      sourceId: auditId,
      content: bundle,
    });

    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'audits.export',
      resourceType: 'audit',
      resourceId: auditId,
      status: 'success',
      metadata: validation,
    });

    return {
      ...bundle,
      validation,
    };
  }

  async createEvidenceExportBundle(evidenceId: string, clerkAuth: ClerkSessionIdentity | null) {
    ensureNonEmptyString(evidenceId, 'evidenceId');
    const bundle = await this.grcOperationalDomainService.getEvidenceExportBundle(evidenceId);
    const validation = await this.buildExportValidation({
      clerkAuth,
      sourceType: 'evidence',
      sourceId: evidenceId,
      content: bundle,
    });

    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'evidences.export',
      resourceType: 'evidence',
      resourceId: evidenceId,
      status: 'success',
      metadata: validation,
    });

    return {
      ...bundle,
      validation,
    };
  }

  async uploadEvidenceDocument(
    evidenceId: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: UploadEvidenceDocumentDto
  ) {
    ensureNonEmptyString(evidenceId, 'evidenceId');
    this.validateEvidenceDocumentPayload(body);

    const actorLabel = await this.platformAuditService.getActorLabel(clerkAuth);
    const context = await this.grcOperationalDomainService.getEvidenceDocumentContext(evidenceId);
    const document = await this.documentsDomainService.createDocument(
      {
        title: body.title,
        topic: body.topic?.trim() || 'Evidencias',
        type: body.type ?? 'record',
        format: body.format,
        standard: context.standardLabel,
        version: body.version?.trim() || '1.0',
        fileName: body.fileName,
        mimeType: body.mimeType,
        fileContentUrl: body.fileContentUrl,
        storageMode: 'google-drive',
        linkedAuditIds: context.linkedAuditIds,
        changeSummary:
          body.changeSummary?.trim() || `Carga de evidencia documental para ${context.evidence.title}`,
      },
      {
        author: actorLabel,
        summary: body.changeSummary,
      }
    );

    const evidence = await this.grcOperationalDomainService.attachDocumentToEvidence(
      evidenceId,
      document.id,
      actorLabel
    );

    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'evidences.document-upload',
      resourceType: 'evidence',
      resourceId: evidenceId,
      status: 'success',
      metadata: {
        documentId: document.id,
        documentTitle: document.title,
      },
    });

    return {
      evidence,
      document,
    };
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

  private validateEvidenceDocumentPayload(body: UploadEvidenceDocumentDto) {
    ensureObject(body, 'body');
    ensureNonEmptyString(body?.title, 'title');
    ensureOptionalString(body?.topic, 'topic');
    ensureOptionalEnumValue(body?.type, 'type', ['manual', 'procedure', 'record'] as const);
    ensureEnumValue(body?.format, 'format', [
      'PDF',
      'DOCX',
      'XLSX',
      'PPTX',
      'TXT',
      'PNG',
      'JPG',
      'WEBP',
      'GIF',
    ] as const);
    ensureOptionalString(body?.version, 'version');
    ensureNonEmptyString(body?.fileName, 'fileName');
    ensureNonEmptyString(body?.mimeType, 'mimeType');
    ensureNonEmptyString(body?.fileContentUrl, 'fileContentUrl');
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

  private async buildExportValidation({
    clerkAuth,
    sourceType,
    sourceId,
    content,
  }: {
    clerkAuth: ClerkSessionIdentity | null;
    sourceType: 'audit' | 'evidence';
    sourceId: string;
    content: unknown;
  }): Promise<ExportValidationPayload> {
    const actor = await this.platformAuditService.getActorDetails(clerkAuth);
    const generatedAtIso = new Date().toISOString();

    return {
      version: '1.0',
      exportId: `EXP-${randomUUID().slice(0, 8).toUpperCase()}`,
      sourceType,
      sourceId,
      generatedAtIso,
      generatedBy: {
        id: actor.actorId ?? 'anonymous',
        name: actor.actorName ?? actor.actorEmail ?? actor.actorId ?? 'Sistema ISO',
        email: actor.actorEmail ?? 'sin-correo',
        role: actor.actorRole ?? 'unknown',
      },
      checksum: `SHA256-${createHash('sha256')
        .update(
          this.serializeForHash({
            sourceType,
            sourceId,
            generatedAtIso,
            generatedBy: {
              id: actor.actorId ?? 'anonymous',
              email: actor.actorEmail ?? 'sin-correo',
            },
            content,
          })
        )
        .digest('hex')
        .slice(0, 24)
        .toUpperCase()}`,
    };
  }

  private serializeForHash(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.serializeForHash(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right)
      );

      return `{${entries
        .map(([key, item]) => `${JSON.stringify(key)}:${this.serializeForHash(item)}`)
        .join(',')}}`;
    }

    return JSON.stringify(value ?? null);
  }
}
