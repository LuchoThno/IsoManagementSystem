import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  CreateContractDto,
  CreateCorrectiveActionDto,
  CreateEvidenceDto,
  PaginationParams,
} from './dto/grc.dto';
import { ContractDocumentEntity } from './schemas/contract-document.schema';
import { ContractObligationEntity } from './schemas/contract-obligation.schema';
import { ContractEntity } from './schemas/contract.schema';
import { CorrectiveActionEntity } from './schemas/corrective-action.schema';
import { EvidenceEntity } from './schemas/evidence.schema';
import { StandardEntity } from './schemas/standard.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class GrcOperationalDomainService {
  constructor(
    @InjectModel(EvidenceEntity.name)
    private readonly evidenceModel: Model<EvidenceEntity>,
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
      linkedAuditIds: payload.linkedAuditIds ?? [],
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      collectedAt: payload.collectedAt ? new Date(payload.collectedAt) : null,
      notes: payload.notes ?? '',
    });

    return this.serializeEvidence(evidence.toObject());
  }

  async listEvidences(params: PaginationParams = {}) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillOperationalTenantIds(tenantId);
    const { page, pageSize, search } = this.resolvePaginationParams(params);
    const filter = {
      tenantId,
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
      dueDate: evidence.dueDate ?? null,
      collectedAt: evidence.collectedAt ?? null,
      notes: evidence.notes ?? '',
      createdAt: evidence.createdAt,
      updatedAt: evidence.updatedAt,
    };
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
