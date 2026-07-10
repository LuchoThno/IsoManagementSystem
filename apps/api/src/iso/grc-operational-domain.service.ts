import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  CreateContractDto,
  CreateCorrectiveActionDto,
  CreateEvidenceDto,
  PaginationParams,
  UpdateEvidenceDto,
} from './dto/grc.dto';
import { ContractDocumentEntity } from './schemas/contract-document.schema';
import { ContractObligationEntity } from './schemas/contract-obligation.schema';
import { ContractEntity } from './schemas/contract.schema';
import { CorrectiveActionEntity } from './schemas/corrective-action.schema';
import { EvidenceEntity } from './schemas/evidence.schema';
import { Audit } from './schemas/audit.schema';
import { StandardEntity } from './schemas/standard.schema';
import { TaskEntity } from './schemas/task.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class GrcOperationalDomainService {
  constructor(
    @InjectModel(EvidenceEntity.name)
    private readonly evidenceModel: Model<EvidenceEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    @InjectModel(ContractEntity.name)
    private readonly contractModel: Model<ContractEntity>,
    @InjectModel(ContractObligationEntity.name)
    private readonly contractObligationModel: Model<ContractObligationEntity>,
    @InjectModel(ContractDocumentEntity.name)
    private readonly contractDocumentModel: Model<ContractDocumentEntity>,
    @InjectModel(CorrectiveActionEntity.name)
    private readonly correctiveActionModel: Model<CorrectiveActionEntity>,
    @InjectModel(StandardEntity.name)
    private readonly standardModel: Model<StandardEntity>,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async listRequirementEvidences(requirementId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const evidences = await this.evidenceModel
      .find({ requirementId, tenantId })
      .sort({ updatedAt: -1 })
      .lean();
    return evidences.map((evidence) => this.serializeEvidence(evidence));
  }

  async createEvidence(payload: CreateEvidenceDto) {
    const tenantId = await this.resolveEffectiveTenantId();
    const linkedAuditIds = this.normalizeIds(payload.linkedAuditIds);
    const linkedTaskIds = this.normalizeIds(payload.linkedTaskIds);
    const findingId = payload.findingId?.trim() || null;
    const evidence = await this.evidenceModel.create({
      tenantId,
      title: payload.title,
      description: payload.description ?? '',
      standardId: payload.standardId ?? null,
      requirementId: payload.requirementId,
      clauseId: payload.clauseId ?? null,
      status: payload.status ?? 'pending',
      objectiveType: payload.objectiveType ?? 'document',
      owner: payload.owner ?? 'Administrador ISO',
      sourceDocumentId: payload.sourceDocumentId ?? null,
      documentIds: payload.documentIds ?? [],
      linkedAuditIds,
      findingId,
      linkedTaskIds,
      fulfillmentSummary: payload.fulfillmentSummary ?? '',
      completionPercentage: payload.completionPercentage ?? 0,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      collectedAt: payload.collectedAt ? new Date(payload.collectedAt) : null,
      notes: payload.notes ?? '',
      activityLog: [
        this.buildEvidenceActivity({
          author: payload.owner ?? 'Administrador ISO',
          action: 'created',
          details:
            payload.changeSummary?.trim() ||
            'Se creó la evidencia para seguimiento de cumplimiento del hallazgo.',
          status: payload.status ?? 'pending',
        }),
      ],
    });

    return this.serializeEvidence(evidence.toObject());
  }

  async updateEvidence(id: string, payload: UpdateEvidenceDto, author: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const evidence = await this.evidenceModel.findOne({ _id: id, tenantId });
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    if (typeof payload.title === 'string') evidence.title = payload.title;
    if (typeof payload.description === 'string') evidence.description = payload.description;
    if (payload.standardId !== undefined) evidence.standardId = payload.standardId ?? null;
    if (typeof payload.requirementId === 'string') evidence.requirementId = payload.requirementId;
    if (payload.clauseId !== undefined) evidence.clauseId = payload.clauseId ?? null;
    if (typeof payload.status === 'string') evidence.status = payload.status;
    if (typeof payload.objectiveType === 'string') evidence.objectiveType = payload.objectiveType;
    if (typeof payload.owner === 'string') evidence.owner = payload.owner;
    if (payload.sourceDocumentId !== undefined) {
      evidence.sourceDocumentId = payload.sourceDocumentId ?? null;
    }
    if (Array.isArray(payload.documentIds)) evidence.documentIds = this.normalizeIds(payload.documentIds);
    if (Array.isArray(payload.linkedAuditIds)) {
      evidence.linkedAuditIds = this.normalizeIds(payload.linkedAuditIds);
    }
    if (payload.findingId !== undefined) {
      evidence.findingId = payload.findingId?.trim() || null;
    }
    if (Array.isArray(payload.linkedTaskIds)) {
      evidence.linkedTaskIds = this.normalizeIds(payload.linkedTaskIds);
    }
    if (typeof payload.fulfillmentSummary === 'string') {
      evidence.fulfillmentSummary = payload.fulfillmentSummary;
    }
    if (typeof payload.completionPercentage === 'number') {
      evidence.completionPercentage = Math.max(0, Math.min(100, payload.completionPercentage));
    }
    if (payload.dueDate !== undefined) {
      evidence.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
    }
    if (payload.collectedAt !== undefined) {
      evidence.collectedAt = payload.collectedAt ? new Date(payload.collectedAt) : null;
    }
    if (typeof payload.notes === 'string') evidence.notes = payload.notes;

    evidence.activityLog = [
      ...(evidence.activityLog ?? []),
      this.buildEvidenceActivity({
        author,
        action: 'updated',
        details:
          payload.changeSummary?.trim() ||
          'Se actualizaron los avances de cumplimiento y la trazabilidad de la evidencia.',
        status: evidence.status,
      }),
    ];

    await evidence.save();
    return this.serializeEvidence(evidence.toObject());
  }

  async deleteEvidence(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    await this.evidenceModel.findOneAndDelete({ _id: id, tenantId });
    return { success: true };
  }

  async listEvidences(params: PaginationParams = {}) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const { page, pageSize, search } = this.resolvePaginationParams(params);
    const filter = {
      tenantId,
      ...(params.auditId ? { linkedAuditIds: params.auditId } : {}),
      ...(params.findingId ? { findingId: params.findingId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...this.buildSearchFilter(search, ['title', 'description', 'owner', 'notes']),
    };

    const [evidences, total] = await Promise.all([
      this.evidenceModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.evidenceModel.countDocuments(filter),
    ]);

    return {
      items: evidences.map((evidence) => this.serializeEvidence(evidence)),
      total,
      page,
      pageSize,
    };
  }

  async listContracts(params: PaginationParams = {}) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const { page, pageSize, search } = this.resolvePaginationParams(params);
    const filter = {
      tenantId,
      ...this.buildSearchFilter(search, [
        'title',
        'counterparty',
        'identifier',
        'owner',
        'summary',
      ]),
    };

    const [contracts, total] = await Promise.all([
      this.contractModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.contractModel.countDocuments(filter),
    ]);
    const contractIds = contracts.map((contract) => String(contract._id));
    if (contractIds.length === 0) {
      return {
        items: [],
        total,
        page,
        pageSize,
      };
    }

    const [obligations, documents] = await Promise.all([
      this.contractObligationModel
        .find({ contractId: { $in: contractIds }, tenantId })
        .sort({ dueDate: 1, createdAt: 1 })
        .lean(),
      this.contractDocumentModel.find({ contractId: { $in: contractIds }, tenantId }).lean(),
    ]);

    const obligationsByContractId = new Map<
      string,
      ReturnType<typeof this.serializeContractObligation>[]
    >();
    obligations.forEach((obligation) => {
      const key = obligation.contractId;
      const bucket = obligationsByContractId.get(key) ?? [];
      bucket.push(this.serializeContractObligation(obligation));
      obligationsByContractId.set(key, bucket);
    });

    const documentsByContractId = new Map<
      string,
      Array<{
        id: string;
        contractId: string;
        title: string;
        kind: 'contract' | 'annex' | 'policy' | 'evidence';
        fileName: string;
        mimeType: string;
        url: string;
        uploadedAt: Date;
      }>
    >();
    documents.forEach((document) => {
      const key = document.contractId;
      const bucket = documentsByContractId.get(key) ?? [];
      bucket.push({
        id: String(document._id),
        contractId: document.contractId,
        title: document.title,
        kind: document.kind,
        fileName: document.fileName,
        mimeType: document.mimeType,
        url: document.url,
        uploadedAt: document.uploadedAt,
      });
      documentsByContractId.set(key, bucket);
    });

    return {
      items: contracts.map((contract) => {
        const contractId = String(contract._id);
        return {
          ...this.serializeContract(contract),
          obligations: obligationsByContractId.get(contractId) ?? [],
          documents: documentsByContractId.get(contractId) ?? [],
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  async createContract(payload: CreateContractDto) {
    const tenantId = await this.resolveEffectiveTenantId();
    const contract = await this.contractModel.create({
      tenantId,
      title: payload.title,
      counterparty: payload.counterparty,
      identifier: payload.identifier,
      status: payload.status ?? 'draft',
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      endDate: payload.endDate ? new Date(payload.endDate) : null,
      standardIds: payload.standardIds ?? [],
      owner: payload.owner ?? 'Administrador ISO',
      summary: payload.summary ?? '',
    });

    const contractId = String(contract._id);
    await Promise.all([
      (payload.obligations?.length ?? 0) > 0
        ? this.contractObligationModel.insertMany(
            payload.obligations!.map((obligation) => ({
              tenantId,
              contractId,
              standardId: obligation.standardId ?? null,
              title: obligation.title,
              description: obligation.description ?? '',
              sourceClause: obligation.sourceClause ?? '',
              dueDate: obligation.dueDate ? new Date(obligation.dueDate) : null,
              status: obligation.status ?? 'open',
              priority: obligation.priority ?? 'medium',
              owner: obligation.owner ?? payload.owner ?? 'Administrador ISO',
              evidenceIds: obligation.evidenceIds ?? [],
            }))
          )
        : Promise.resolve(),
      (payload.documents?.length ?? 0) > 0
        ? this.contractDocumentModel.insertMany(
            payload.documents!.map((document) => ({
              tenantId,
              contractId,
              title: document.title,
              kind: document.kind ?? 'contract',
              fileName: document.fileName,
              mimeType: document.mimeType,
              url: document.url,
              uploadedAt: document.uploadedAt ? new Date(document.uploadedAt) : new Date(),
            }))
          )
        : Promise.resolve(),
    ]);

    return {
      ...this.serializeContract(contract.toObject()),
      obligations: await this.listContractObligations(contractId),
      documents: await this.listContractDocuments(contractId),
    };
  }

  async listContractObligations(contractId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const contract = await this.contractModel.findOne({ _id: contractId, tenantId }).lean();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const obligations = await this.contractObligationModel
      .find({ contractId, tenantId })
      .sort({ dueDate: 1, createdAt: 1 })
      .lean();
    return obligations.map((obligation) => this.serializeContractObligation(obligation));
  }

  async listCorrectiveActions() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const actions = await this.correctiveActionModel.find({ tenantId }).sort({ updatedAt: -1 }).lean();
    return actions.map((action) => this.serializeCorrectiveAction(action));
  }

  async getOverview() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const [
      standardsCount,
      evidencesCount,
      contractsCount,
      correctiveActionsCount,
      openCorrectiveActions,
      approvedEvidences,
    ] = await Promise.all([
      this.standardModel.countDocuments({ tenantId }),
      this.evidenceModel.countDocuments({ tenantId }),
      this.contractModel.countDocuments({ tenantId }),
      this.correctiveActionModel.countDocuments({ tenantId }),
      this.correctiveActionModel.countDocuments({ tenantId, status: { $ne: 'closed' } }),
      this.evidenceModel.countDocuments({ tenantId, status: 'approved' }),
    ]);

    return {
      standardsCount,
      evidencesCount,
      contractsCount,
      correctiveActionsCount,
      openCorrectiveActions,
      approvedEvidences,
    };
  }

  async createCorrectiveAction(payload: CreateCorrectiveActionDto) {
    const tenantId = await this.resolveEffectiveTenantId();
    const action = await this.correctiveActionModel.create({
      tenantId,
      title: payload.title,
      description: payload.description ?? '',
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      standardId: payload.standardId ?? null,
      auditId: payload.auditId ?? null,
      assignedTo: payload.assignedTo ?? 'Administrador ISO',
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      status: payload.status ?? 'open',
      priority: payload.priority ?? 'medium',
      evidenceIds: payload.evidenceIds ?? [],
      verificationNotes: payload.verificationNotes ?? '',
    });

    return this.serializeCorrectiveAction(action.toObject());
  }

  async getAuditExecutionReport(auditId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);

    const [evidences, tasks] = await Promise.all([
      this.evidenceModel.find({ tenantId, linkedAuditIds: auditId }).sort({ updatedAt: -1 }).lean(),
      this.taskModel.find({ tenantId, relatedAuditIds: auditId }).sort({ dueDate: 1 }).lean(),
    ]);

    return {
      evidences: evidences.map((evidence) => this.serializeEvidence(evidence)),
      tasks: tasks.map((task) => ({
        id: String(task._id),
        title: task.title,
        description: task.description,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
        status: task.status,
        priority: task.priority,
        standard: task.standard,
        relatedFindingIds: task.relatedFindingIds ?? [],
      })),
    };
  }

  async getAuditExportBundle(auditId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const audit = await this.auditModel.findOne({ _id: auditId, tenantId }).lean();
    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    return {
      audit: this.serializeAudit(audit),
      report: await this.getAuditExecutionReport(auditId),
    };
  }

  async getEvidenceExportBundle(evidenceId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const evidence = await this.evidenceModel.findOne({ _id: evidenceId, tenantId }).lean();
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    const primaryAuditId = evidence.linkedAuditIds?.[0] ?? null;
    const linkedAudit = primaryAuditId
      ? await this.auditModel.findOne({ _id: primaryAuditId, tenantId }).lean()
      : null;
    const findingLabel = evidence.findingId
      ? linkedAudit?.findings.find((finding) => finding.id === evidence.findingId)?.description ??
        evidence.findingId
      : 'Sin hallazgo asociado';

    return {
      evidence: this.serializeEvidence(evidence),
      auditLabel: linkedAudit
        ? `${linkedAudit.type === 'internal' ? 'Interna' : 'Externa'} · ${linkedAudit.standard}`
        : 'Auditoría no encontrada',
      findingLabel,
    };
  }

  async getEvidenceDocumentContext(evidenceId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const evidence = await this.evidenceModel.findOne({ _id: evidenceId, tenantId }).lean();
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    const [standard, audit] = await Promise.all([
      evidence.standardId
        ? this.standardModel.findOne({ _id: evidence.standardId, tenantId }).lean()
        : null,
      evidence.linkedAuditIds?.[0]
        ? this.auditModel.findOne({ _id: evidence.linkedAuditIds[0], tenantId }).lean()
        : null,
    ]);

    return {
      evidence: this.serializeEvidence(evidence),
      standardLabel: standard ? `${standard.code} ${standard.title}` : audit?.standard ?? 'General',
      linkedAuditIds: this.normalizeIds(evidence.linkedAuditIds),
    };
  }

  async attachDocumentToEvidence(evidenceId: string, documentId: string, author: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const evidence = await this.evidenceModel.findOne({ _id: evidenceId, tenantId });
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    evidence.documentIds = this.normalizeIds([...(evidence.documentIds ?? []), documentId]);
    if (!evidence.sourceDocumentId) {
      evidence.sourceDocumentId = documentId;
    }
    if (!evidence.collectedAt) {
      evidence.collectedAt = new Date();
    }
    evidence.activityLog = [
      ...(evidence.activityLog ?? []),
      this.buildEvidenceActivity({
        author,
        action: 'document-attached',
        details: 'Se adjunto evidencia documental y se sincronizo con Google Drive.',
        status: evidence.status,
      }),
    ];

    await evidence.save();
    return this.serializeEvidence(evidence.toObject());
  }

  private async listContractDocuments(contractId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    const documents = await this.contractDocumentModel.find({ contractId, tenantId }).lean();
    return documents.map((document) => ({
      id: String(document._id),
      tenantId: document.tenantId ?? null,
      contractId: document.contractId,
      title: document.title,
      kind: document.kind,
      fileName: document.fileName,
      mimeType: document.mimeType,
      url: document.url,
      uploadedAt: document.uploadedAt,
    }));
  }

  private resolvePaginationParams(params: PaginationParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(params.pageSize) || 12));
    const search = params.search?.trim() ?? '';

    return { page, pageSize, search };
  }

  private buildSearchFilter(search: string, fields: string[]) {
    if (!search) {
      return {};
    }

    const regex = new RegExp(this.escapeRegex(search), 'i');
    return {
      $or: fields.map((field) => ({ [field]: regex })),
    };
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private async backfillOperationalTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantIdForMany(
      [
        this.evidenceModel,
        this.taskModel,
        this.contractModel,
        this.contractObligationModel,
        this.contractDocumentModel,
        this.correctiveActionModel,
      ],
      tenantId
    );
  }

  private serializeEvidence(evidence: any) {
    return {
      id: String(evidence._id),
      tenantId: evidence.tenantId ?? null,
      title: evidence.title,
      description: evidence.description ?? '',
      standardId: evidence.standardId ?? null,
      requirementId: evidence.requirementId,
      clauseId: evidence.clauseId ?? null,
      status: evidence.status,
      objectiveType: evidence.objectiveType,
      owner: evidence.owner,
      sourceDocumentId: evidence.sourceDocumentId ?? null,
      documentIds: evidence.documentIds ?? [],
      linkedAuditIds: evidence.linkedAuditIds ?? [],
      findingId: evidence.findingId ?? null,
      linkedTaskIds: evidence.linkedTaskIds ?? [],
      fulfillmentSummary: evidence.fulfillmentSummary ?? '',
      completionPercentage: evidence.completionPercentage ?? 0,
      dueDate: evidence.dueDate ?? null,
      collectedAt: evidence.collectedAt ?? null,
      notes: evidence.notes ?? '',
      activityLog: (evidence.activityLog ?? []).map((entry: any) => ({
        id: entry.id,
        date: entry.date,
        author: entry.author,
        action: entry.action,
        details: entry.details,
        status: entry.status,
      })),
      createdAt: evidence.createdAt,
      updatedAt: evidence.updatedAt,
    };
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
      findings: (audit.findings ?? []).map((finding: any) => ({
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

  private buildEvidenceActivity({
    author,
    action,
    details,
    status,
  }: {
    author: string;
    action: string;
    details: string;
    status: string;
  }) {
    return {
      id: this.makeId('evidence-activity'),
      date: new Date(),
      author,
      action,
      details,
      status,
    };
  }

  private makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private serializeContract(contract: any) {
    return {
      id: String(contract._id),
      tenantId: contract.tenantId ?? null,
      title: contract.title,
      counterparty: contract.counterparty,
      identifier: contract.identifier,
      status: contract.status,
      startDate: contract.startDate ?? null,
      endDate: contract.endDate ?? null,
      standardIds: contract.standardIds ?? [],
      owner: contract.owner,
      summary: contract.summary ?? '',
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }

  private serializeContractObligation(obligation: any) {
    return {
      id: String(obligation._id),
      tenantId: obligation.tenantId ?? null,
      contractId: obligation.contractId,
      standardId: obligation.standardId ?? null,
      title: obligation.title,
      description: obligation.description ?? '',
      sourceClause: obligation.sourceClause ?? '',
      dueDate: obligation.dueDate ?? null,
      status: obligation.status,
      priority: obligation.priority,
      owner: obligation.owner,
      evidenceIds: obligation.evidenceIds ?? [],
      createdAt: obligation.createdAt,
      updatedAt: obligation.updatedAt,
    };
  }

  private serializeCorrectiveAction(action: any) {
    return {
      id: String(action._id),
      tenantId: action.tenantId ?? null,
      title: action.title,
      description: action.description ?? '',
      sourceType: action.sourceType,
      sourceId: action.sourceId,
      standardId: action.standardId ?? null,
      auditId: action.auditId ?? null,
      assignedTo: action.assignedTo,
      dueDate: action.dueDate ?? null,
      status: action.status,
      priority: action.priority,
      evidenceIds: action.evidenceIds ?? [],
      verificationNotes: action.verificationNotes ?? '',
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
    };
  }
}
