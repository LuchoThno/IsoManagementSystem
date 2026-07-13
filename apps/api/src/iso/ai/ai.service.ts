import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import {
  AnalyzeDocumentInputDto,
  AnalyzeDocumentResultDto,
  GenerateProcedureInputDto,
  GenerateProcedureResultDto,
  ProposeCorrectiveActionsInputDto,
  ProposeCorrectiveActionsResultDto,
  SummarizeAuditInputDto,
  SummarizeAuditResultDto,
} from '../dto/ai.dto';
import { TenantContextService } from '../tenant-context.service';
import { Audit } from '../schemas/audit.schema';
import { DocumentEntity } from '../schemas/document.schema';

@Injectable()
export class AiService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    private readonly tenantContextService: TenantContextService
  ) {}

  async analyzeDocument(input: AnalyzeDocumentInputDto): Promise<AnalyzeDocumentResultDto> {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();
    const document = await this.documentModel
      .findOne({ _id: input.documentId, tenantId })
      .lean();

    if (!document) {
      throw new NotFoundException('No encontramos el documento solicitado dentro del tenant activo.');
    }

    const requestedVersion = input.documentVersionId?.trim();
    const matchedVersion = requestedVersion
      ? document.versionHistory.find((entry) => entry.id === requestedVersion)
      : null;

    if (requestedVersion && !matchedVersion && document.version !== requestedVersion) {
      throw new NotFoundException(
        'La versión solicitada no existe para ese documento dentro del tenant activo.'
      );
    }

    return {
      id: randomUUID(),
      status: 'success',
      model: 'stub',
      tenantId,
      documentId: String(document._id),
      documentVersionId: requestedVersion,
      focus: input.focus,
      sources: [
        {
          type: 'document',
          id: requestedVersion ?? String(document._id),
          excerpt: input.focus
            ? `Stub excerpt for ${document.title} enfocado en: ${input.focus}`
            : undefined,
        },
      ],
      extractedFacts: [
        { label: 'tenantId', value: tenantId },
        { label: 'documentTitle', value: document.title },
        { label: 'documentStandard', value: document.standard },
      ],
      generatedProcedures: [
        'Stub procedure: revisar requisitos aplicables y evidencias asociadas.',
        'Stub procedure: validar cumplimiento y registrar hallazgos en auditoría.',
      ],
      auditSummary: {
        auditType: null,
        auditStatus: null,
        summary: `Stub summary for ${document.title} (LLM not integrated yet).`,
        keyFindings: ['Stub finding 1', 'Stub finding 2'],
      },
      proposedCorrectiveActions: [
        'Stub corrective action: implementar plan de acción con responsables y fechas.',
      ],
      recommendations: [
        'Stub recommendation: asegurar versionado y trazabilidad por tenant.',
      ],
    };
  }

  async generateProcedure(input: GenerateProcedureInputDto): Promise<GenerateProcedureResultDto> {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();

    if (input.documentId) {
      const document = await this.documentModel
        .findOne({ _id: input.documentId, tenantId })
        .lean();

      if (!document) {
        throw new NotFoundException(
          'No encontramos el documento base para generar el procedimiento dentro del tenant activo.'
        );
      }
    }

    return {
      id: randomUUID(),
      status: 'success',
      model: 'stub',
      tenantId,
      topic: input.topic,
      steps: [
        { step: 1, instruction: 'Stub step 1: recopilar fuentes y contexto relevante.' },
        { step: 2, instruction: 'Stub step 2: generar un procedimiento verificable.' },
        { step: 3, instruction: 'Stub step 3: registrar cambios y evidencias asociadas.' },
      ],
    };
  }

  async summarizeAudit(input: SummarizeAuditInputDto): Promise<SummarizeAuditResultDto> {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();
    const audit = await this.auditModel.findOne({ _id: input.auditId, tenantId }).lean();

    if (!audit) {
      throw new NotFoundException('No encontramos la auditoría solicitada dentro del tenant activo.');
    }

    return {
      id: randomUUID(),
      status: 'success',
      model: 'stub',
      tenantId,
      auditId: String(audit._id),
      summary: `Stub audit summary for ${audit.standard} (${audit.type}).`,
      keyFindings:
        audit.findings.length > 0
          ? audit.findings.slice(0, 3).map((finding) => finding.description)
          : ['Stub key finding A', 'Stub key finding B'],
    };
  }

  proposeCorrectiveActions(
    input: ProposeCorrectiveActionsInputDto
  ): Promise<ProposeCorrectiveActionsResultDto> {
    return this.buildCorrectiveActionsResult(input);
  }

  private async buildCorrectiveActionsResult(
    input: ProposeCorrectiveActionsInputDto
  ): Promise<ProposeCorrectiveActionsResultDto> {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();
    let audit: Audit | null = null;

    if (input.auditId) {
      audit = await this.auditModel.findOne({ _id: input.auditId, tenantId }).lean();

      if (!audit) {
        throw new NotFoundException(
          'No encontramos la auditoría base para proponer acciones dentro del tenant activo.'
        );
      }
    }

    const auditDrivenActions =
      audit?.findings.map(
        (finding) =>
          `Mitigar ${finding.type}: ${finding.description}. Responsable sugerido: ${finding.assignedTo}.`
      ) ?? [];

    return {
      id: randomUUID(),
      status: 'success',
      model: 'stub',
      tenantId,
      auditId: input.auditId,
      actions:
        auditDrivenActions.length > 0
          ? auditDrivenActions
          : [
              'Stub corrective action 1',
              'Stub corrective action 2',
              ...(input.riskContext
                ? [`Contextual stub action for risk: ${input.riskContext}`]
                : []),
            ],
    };
  }
}
