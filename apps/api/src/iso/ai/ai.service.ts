import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import {
  AnalyzeDocumentInputDto,
  AnalyzeDocumentResultDto,
  AssistChatThreadInputDto,
  AssistChatThreadResultDto,
  GenerateProcedureInputDto,
  GenerateProcedureResultDto,
  ProposeCorrectiveActionsInputDto,
  ProposeCorrectiveActionsResultDto,
  SummarizeAuditInputDto,
  SummarizeAuditResultDto,
} from '../dto/ai.dto';
import { TenantContextService } from '../tenant-context.service';
import { Audit } from '../schemas/audit.schema';
import { ChatThreadEntity } from '../schemas/chat-thread.schema';
import { DocumentEntity } from '../schemas/document.schema';

@Injectable()
export class AiService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    @InjectModel(ChatThreadEntity.name)
    private readonly chatThreadModel: Model<ChatThreadEntity>,
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

  async assistChatThread(
    input: AssistChatThreadInputDto
  ): Promise<AssistChatThreadResultDto> {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();
    const thread = await this.chatThreadModel.findOne({ _id: input.threadId, tenantId }).lean();

    if (!thread) {
      throw new NotFoundException(
        'No encontramos la conversación solicitada dentro del tenant activo.'
      );
    }

    const recentMessages = (thread.messages ?? []).slice(-5);
    const participantCount = (thread.participantIds ?? []).length;
    const goal = input.goal?.trim();
    const latestMessage = recentMessages[recentMessages.length - 1];

    return {
      id: randomUUID(),
      status: 'success',
      model: 'stub',
      tenantId,
      threadId: String(thread._id),
      participants: thread.participantIds ?? [],
      summary:
        recentMessages.length > 0
          ? `Stub chat summary: conversación ${thread.threadType ?? 'direct'} con ${participantCount} participante(s), ${recentMessages.length} mensaje(s) recientes y foco en "${goal ?? 'coordinación operativa'}". Último mensaje: "${latestMessage?.content ?? 'sin contenido'}".`
          : `Stub chat summary: conversación sin mensajes todavía, preparada para ${goal ?? 'coordinación operativa'}.`,
      suggestedReplies: recentMessages.length > 0
        ? [
            'Propongo cerrar responsables y fecha objetivo en este hilo.',
            'Puedo consolidar los puntos abiertos y dejar el siguiente paso acordado.',
            goal
              ? `Tomando el objetivo "${goal}", sugiero priorizar el entregable pendiente y confirmar dueños.`
              : 'Sugiero validar estado, bloqueo y siguiente acción antes del cierre del día.',
          ]
        : [
            'Abramos el contexto del tema y asignemos responsables iniciales.',
            'Partamos definiendo objetivo, plazo y evidencia esperada para este hilo.',
          ],
      actionItems:
        recentMessages.length > 0
          ? [
              'Identificar responsable principal del hilo.',
              'Confirmar siguiente entregable mencionado en la conversación.',
              latestMessage?.content
                ? `Registrar seguimiento sobre: ${latestMessage.content.slice(0, 80)}`
                : 'Registrar seguimiento del último acuerdo.',
            ]
          : ['Definir propósito del hilo.', 'Invitar participantes clave.', 'Enviar primer acuerdo operativo.'],
    };
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
