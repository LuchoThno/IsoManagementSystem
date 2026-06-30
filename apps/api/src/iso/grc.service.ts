import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit } from './schemas/audit.schema';
import { AuditChecklistEntity } from './schemas/audit-checklist.schema';
import { AuditChecklistItemEntity } from './schemas/audit-checklist-item.schema';
import { ContractDocumentEntity } from './schemas/contract-document.schema';
import { ContractObligationEntity } from './schemas/contract-obligation.schema';
import { ContractEntity } from './schemas/contract.schema';
import { CorrectiveActionEntity } from './schemas/corrective-action.schema';
import { EvidenceEntity } from './schemas/evidence.schema';
import { StandardAppendixEntity } from './schemas/standard-appendix.schema';
import { StandardClauseEntity } from './schemas/standard-clause.schema';
import { StandardRequirementEntity } from './schemas/standard-requirement.schema';
import { StandardSectionEntity } from './schemas/standard-section.schema';
import { StandardEntity } from './schemas/standard.schema';

type StandardRequirementPayload = {
  code: string;
  title: string;
  description?: string;
  intent?: string;
  criticality?: 'low' | 'medium' | 'high';
  status?: 'draft' | 'active' | 'obsolete';
};

type StandardClausePayload = {
  code: string;
  title: string;
  description?: string;
  children?: StandardClausePayload[];
  requirements?: StandardRequirementPayload[];
};

type StandardPayload = {
  code: string;
  title: string;
  description?: string;
  category?: 'standard' | 'framework' | 'regulation' | 'contractual';
  status?: 'draft' | 'active' | 'archived';
  version?: string;
  enabled?: boolean;
  owner?: string;
  publishedAt?: string | null;
  sections?: Array<{
    code: string;
    title: string;
    description?: string;
    clauses?: StandardClausePayload[];
  }>;
  appendices?: Array<{
    code: string;
    title: string;
    type?: 'annex' | 'appendix' | 'guide';
    description?: string;
    content?: string;
  }>;
};

type PaginationParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

@Injectable()
export class GrcService implements OnModuleInit {
  constructor(
    @InjectModel(StandardEntity.name)
    private readonly standardModel: Model<StandardEntity>,
    @InjectModel(StandardSectionEntity.name)
    private readonly standardSectionModel: Model<StandardSectionEntity>,
    @InjectModel(StandardClauseEntity.name)
    private readonly standardClauseModel: Model<StandardClauseEntity>,
    @InjectModel(StandardRequirementEntity.name)
    private readonly standardRequirementModel: Model<StandardRequirementEntity>,
    @InjectModel(StandardAppendixEntity.name)
    private readonly standardAppendixModel: Model<StandardAppendixEntity>,
    @InjectModel(EvidenceEntity.name)
    private readonly evidenceModel: Model<EvidenceEntity>,
    @InjectModel(ContractEntity.name)
    private readonly contractModel: Model<ContractEntity>,
    @InjectModel(ContractObligationEntity.name)
    private readonly contractObligationModel: Model<ContractObligationEntity>,
    @InjectModel(ContractDocumentEntity.name)
    private readonly contractDocumentModel: Model<ContractDocumentEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    @InjectModel(AuditChecklistEntity.name)
    private readonly auditChecklistModel: Model<AuditChecklistEntity>,
    @InjectModel(AuditChecklistItemEntity.name)
    private readonly auditChecklistItemModel: Model<AuditChecklistItemEntity>,
    @InjectModel(CorrectiveActionEntity.name)
    private readonly correctiveActionModel: Model<CorrectiveActionEntity>
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async listStandards() {
    const standards = await this.standardModel.find().sort({ code: 1 }).lean();
    const metricsByStandardId = await this.buildStandardMetricsMap(
      standards.map((standard) => String(standard._id))
    );

    return standards.map((standard) =>
      this.serializeStandardSummaryWithMetrics(
        standard,
        metricsByStandardId.get(String(standard._id))
      )
    );
  }

  async createStandard(payload: StandardPayload) {
    const standard = await this.standardModel.create({
      code: payload.code.trim(),
      title: payload.title.trim(),
      description: payload.description?.trim() ?? '',
      category: payload.category ?? 'standard',
      status: payload.status ?? 'active',
      version: payload.version?.trim() || '1.0',
      enabled: payload.enabled ?? true,
      owner: payload.owner?.trim() || 'Administrador ISO',
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null,
    });

    await this.replaceStandardStructure(String(standard._id), payload.sections ?? [], payload.appendices ?? []);
    return this.getStandardStructure(String(standard._id));
  }

  async updateStandard(standardId: string, payload: StandardPayload) {
    const standard = await this.standardModel.findById(standardId);
    if (!standard) {
      throw new NotFoundException('Standard not found');
    }

    standard.code = payload.code.trim();
    standard.title = payload.title.trim();
    standard.description = payload.description?.trim() ?? '';
    standard.category = payload.category ?? standard.category ?? 'standard';
    standard.status = payload.status ?? standard.status ?? 'active';
    standard.version = payload.version?.trim() || standard.version || '1.0';
    standard.enabled = payload.enabled ?? standard.enabled ?? true;
    standard.owner = payload.owner?.trim() || standard.owner || 'Administrador ISO';
    standard.publishedAt = payload.publishedAt ? new Date(payload.publishedAt) : null;
    await standard.save();

    await this.replaceStandardStructure(
      standardId,
      payload.sections ?? [],
      payload.appendices ?? []
    );

    return this.getStandardStructure(standardId);
  }

  async deleteStandard(standardId: string) {
    const standard = await this.standardModel.findById(standardId).lean();
    if (!standard) {
      throw new NotFoundException('Standard not found');
    }

    const [requirements, clauses, checklists] = await Promise.all([
      this.standardRequirementModel.find({ standardId }).lean(),
      this.standardClauseModel.find({ standardId }).lean(),
      this.auditChecklistModel.find({ standardId }).lean(),
    ]);

    await Promise.all([
      this.standardModel.deleteOne({ _id: standardId }),
      this.standardSectionModel.deleteMany({ standardId }),
      this.standardClauseModel.deleteMany({ standardId }),
      this.standardRequirementModel.deleteMany({ standardId }),
      this.standardAppendixModel.deleteMany({ standardId }),
      this.evidenceModel.deleteMany({
        $or: [
          { standardId },
          { requirementId: { $in: requirements.map((requirement) => String(requirement._id)) } },
          { clauseId: { $in: clauses.map((clause) => String(clause._id)) } },
        ],
      }),
      this.contractObligationModel.updateMany(
        { standardId },
        { $set: { standardId: null } }
      ),
      this.contractModel.updateMany(
        { standardIds: standardId },
        { $pull: { standardIds: standardId } }
      ),
      this.correctiveActionModel.updateMany(
        { standardId },
        { $set: { standardId: null } }
      ),
      this.auditChecklistModel.deleteMany({ standardId }),
      this.auditChecklistItemModel.deleteMany({
        checklistId: { $in: checklists.map((checklist) => String(checklist._id)) },
      }),
    ]);

    return { success: true };
  }

  async getStandardStructure(standardId: string) {
    const standard = await this.standardModel.findById(standardId).lean();
    if (!standard) {
      throw new NotFoundException('Standard not found');
    }

    const [sections, clauses, requirements, appendices, evidences] = await Promise.all([
      this.standardSectionModel.find({ standardId }).sort({ order: 1 }).lean(),
      this.standardClauseModel.find({ standardId }).sort({ order: 1 }).lean(),
      this.standardRequirementModel.find({ standardId }).sort({ order: 1 }).lean(),
      this.standardAppendixModel.find({ standardId }).sort({ order: 1 }).lean(),
      this.evidenceModel.find({ standardId }).lean(),
    ]);

    const evidenceCountByRequirementId = new Map<string, number>();
    evidences.forEach((evidence) => {
      evidenceCountByRequirementId.set(
        evidence.requirementId,
        (evidenceCountByRequirementId.get(evidence.requirementId) ?? 0) + 1
      );
    });

    const requirementsByClause = new Map<string, any[]>();
    requirements.forEach((requirement) => {
      const bucket = requirementsByClause.get(requirement.clauseId) ?? [];
      bucket.push(
        this.serializeRequirement(
          requirement,
          evidenceCountByRequirementId.get(String(requirement._id)) ?? 0
        )
      );
      requirementsByClause.set(requirement.clauseId, bucket);
    });

    const clausesByParent = new Map<string, any[]>();
    clauses.forEach((clause) => {
      const parentKey = clause.parentClauseId ?? `section:${clause.sectionId}`;
      const bucket = clausesByParent.get(parentKey) ?? [];
      bucket.push(clause);
      clausesByParent.set(parentKey, bucket);
    });

    const buildClauseTree = (parentKey: string): any[] =>
      (clausesByParent.get(parentKey) ?? [])
        .sort((left, right) => left.order - right.order)
        .map((clause) => {
          const clauseRequirements = (requirementsByClause.get(String(clause._id)) ?? []).sort(
            (left, right) => left.order - right.order
          );
          const children = buildClauseTree(String(clause._id));
          const evidenceCount =
            clauseRequirements.reduce(
              (total, requirement) => total + (requirement.evidenceCount ?? 0),
              0
            ) +
            children.reduce((total, child) => total + (child.evidenceCount ?? 0), 0);

          return {
            ...this.serializeClause(clause),
            requirements: clauseRequirements,
            children,
            evidenceCount,
          };
        });

    const evidencedRequirementIds = new Set(evidences.map((evidence) => evidence.requirementId));
    const totalRequirements = requirements.length;

    return {
      standard: await this.serializeStandardSummaryWithMetrics(standard),
      sections: sections.map((section) => ({
        ...this.serializeSection(section),
        clauses: buildClauseTree(`section:${String(section._id)}`),
      })),
      appendices: appendices.map((appendix) => this.serializeAppendix(appendix)),
      metrics: {
        totalClauses: clauses.length,
        totalRequirements,
        evidencedRequirements: evidencedRequirementIds.size,
        complianceRate: totalRequirements
          ? Math.round((evidencedRequirementIds.size / totalRequirements) * 100)
          : 0,
      },
    };
  }

  async listRequirementEvidences(requirementId: string) {
    const evidences = await this.evidenceModel
      .find({ requirementId })
      .sort({ updatedAt: -1 })
      .lean();
    return evidences.map((evidence) => this.serializeEvidence(evidence));
  }

  async createEvidence(payload: {
    title: string;
    description?: string;
    standardId?: string | null;
    requirementId: string;
    clauseId?: string | null;
    status?: 'missing' | 'pending' | 'approved' | 'expired';
    objectiveType?: 'document' | 'record' | 'interview' | 'observation' | 'contract';
    owner?: string;
    sourceDocumentId?: string | null;
    documentIds?: string[];
    linkedAuditIds?: string[];
    dueDate?: string | null;
    collectedAt?: string | null;
    notes?: string;
  }) {
    const evidence = await this.evidenceModel.create({
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
    const { page, pageSize, search } = this.resolvePaginationParams(params);
    const filter = this.buildSearchFilter(search, ['title', 'description', 'owner', 'notes']);

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
    const { page, pageSize, search } = this.resolvePaginationParams(params);
    const filter = this.buildSearchFilter(search, [
      'title',
      'counterparty',
      'identifier',
      'owner',
      'summary',
    ]);

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
        .find({ contractId: { $in: contractIds } })
        .sort({ dueDate: 1, createdAt: 1 })
        .lean(),
      this.contractDocumentModel.find({ contractId: { $in: contractIds } }).lean(),
    ]);

    const obligationsByContractId = new Map<string, ReturnType<typeof this.serializeContractObligation>[]>();
    obligations.forEach((obligation) => {
      const key = obligation.contractId;
      const bucket = obligationsByContractId.get(key) ?? [];
      bucket.push(this.serializeContractObligation(obligation));
      obligationsByContractId.set(key, bucket);
    });

    const documentsByContractId = new Map<string, Array<{
      id: string;
      contractId: string;
      title: string;
      kind: 'contract' | 'annex' | 'policy' | 'evidence';
      fileName: string;
      mimeType: string;
      url: string;
      uploadedAt: Date;
    }>>();
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

  async createContract(payload: {
    title: string;
    counterparty: string;
    identifier: string;
    status?: 'draft' | 'active' | 'expired' | 'closed';
    startDate?: string | null;
    endDate?: string | null;
    standardIds?: string[];
    owner?: string;
    summary?: string;
    obligations?: Array<{
      standardId?: string | null;
      title: string;
      description?: string;
      sourceClause?: string;
      dueDate?: string | null;
      status?: 'open' | 'in-progress' | 'fulfilled' | 'overdue';
      priority?: 'low' | 'medium' | 'high';
      owner?: string;
      evidenceIds?: string[];
    }>;
    documents?: Array<{
      title: string;
      kind?: 'contract' | 'annex' | 'policy' | 'evidence';
      fileName: string;
      mimeType: string;
      url: string;
      uploadedAt?: string;
    }>;
  }) {
    const contract = await this.contractModel.create({
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
    const contract = await this.contractModel.findById(contractId).lean();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const obligations = await this.contractObligationModel
      .find({ contractId })
      .sort({ dueDate: 1, createdAt: 1 })
      .lean();
    return obligations.map((obligation) => this.serializeContractObligation(obligation));
  }

  async getAuditChecklist(auditId: string) {
    const audit = await this.auditModel.findById(auditId).lean();
    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    let checklist = await this.auditChecklistModel.findOne({ auditId });
    if (!checklist) {
      checklist = await this.buildChecklistFromAudit(auditId, audit.standard);
    }

    const items = await this.auditChecklistItemModel
      .find({ checklistId: String(checklist._id) })
      .sort({ order: 1 })
      .lean();

    return {
      id: String(checklist._id),
      auditId: checklist.auditId,
      standardId: checklist.standardId,
      title: checklist.title,
      summary: checklist.summary,
      progress: checklist.progress,
      itemCount: checklist.itemCount,
      items: items.map((item) => this.serializeChecklistItem(item)),
    };
  }

  async listCorrectiveActions() {
    const actions = await this.correctiveActionModel.find().sort({ updatedAt: -1 }).lean();
    return actions.map((action) => this.serializeCorrectiveAction(action));
  }

  async getOverview() {
    const [
      standardsCount,
      evidencesCount,
      contractsCount,
      correctiveActionsCount,
      openCorrectiveActions,
      approvedEvidences,
    ] =
      await Promise.all([
        this.standardModel.countDocuments(),
        this.evidenceModel.countDocuments(),
        this.contractModel.countDocuments(),
        this.correctiveActionModel.countDocuments(),
        this.correctiveActionModel.countDocuments({ status: { $ne: 'closed' } }),
        this.evidenceModel.countDocuments({ status: 'approved' }),
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

  async createCorrectiveAction(payload: {
    title: string;
    description?: string;
    sourceType: 'finding' | 'audit' | 'contract' | 'requirement' | 'evidence';
    sourceId: string;
    standardId?: string | null;
    auditId?: string | null;
    assignedTo?: string;
    dueDate?: string | null;
    status?: 'open' | 'in-progress' | 'verified' | 'closed';
    priority?: 'low' | 'medium' | 'high';
    evidenceIds?: string[];
    verificationNotes?: string;
  }) {
    const action = await this.correctiveActionModel.create({
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

  private async replaceStandardStructure(
    standardId: string,
    sections: NonNullable<StandardPayload['sections']>,
    appendices: NonNullable<StandardPayload['appendices']>
  ) {
    await Promise.all([
      this.standardSectionModel.deleteMany({ standardId }),
      this.standardClauseModel.deleteMany({ standardId }),
      this.standardRequirementModel.deleteMany({ standardId }),
      this.standardAppendixModel.deleteMany({ standardId }),
    ]);

    for (const [sectionIndex, section] of sections.entries()) {
      const sectionDoc = await this.standardSectionModel.create({
        standardId,
        code: section.code,
        title: section.title,
        description: section.description ?? '',
        order: sectionIndex + 1,
      });

      await this.createClauseTree(
        standardId,
        String(sectionDoc._id),
        null,
        section.clauses ?? []
      );
    }

    if (appendices.length > 0) {
      await this.standardAppendixModel.insertMany(
        appendices.map((appendix, index) => ({
          standardId,
          code: appendix.code,
          title: appendix.title,
          type: appendix.type ?? 'annex',
          description: appendix.description ?? '',
          content: appendix.content ?? '',
          order: index + 1,
        }))
      );
    }
  }

  private async createClauseTree(
    standardId: string,
    sectionId: string,
    parentClauseId: string | null,
    clauses: StandardClausePayload[]
  ) {
    for (const [clauseIndex, clause] of clauses.entries()) {
      const clauseDoc = await this.standardClauseModel.create({
        standardId,
        sectionId,
        parentClauseId,
        code: clause.code,
        title: clause.title,
        description: clause.description ?? '',
        order: clauseIndex + 1,
      });

      for (const [requirementIndex, requirement] of (clause.requirements ?? []).entries()) {
        await this.standardRequirementModel.create({
          standardId,
          sectionId,
          clauseId: String(clauseDoc._id),
          code: requirement.code,
          title: requirement.title,
          description: requirement.description ?? '',
          intent: requirement.intent ?? '',
          order: requirementIndex + 1,
          criticality: requirement.criticality ?? 'medium',
          status: requirement.status ?? 'active',
        });
      }

      if ((clause.children?.length ?? 0) > 0) {
        await this.createClauseTree(
          standardId,
          sectionId,
          String(clauseDoc._id),
          clause.children ?? []
        );
      }
    }
  }

  private async buildChecklistFromAudit(auditId: string, standardCode: string) {
    const standard = await this.standardModel.findOne({ code: standardCode }).lean();
    if (!standard) {
      return this.auditChecklistModel.create({
        auditId,
        standardId: standardCode,
        title: `Checklist ${standardCode}`,
        summary: 'Checklist inicial sin estructura normativa asociada.',
        progress: 0,
        itemCount: 0,
      });
    }

    const requirements = await this.standardRequirementModel
      .find({ standardId: String(standard._id) })
      .sort({ order: 1 })
      .lean();
    const clauses = await this.standardClauseModel.find({ standardId: String(standard._id) }).lean();
    const clauseById = new Map(clauses.map((clause) => [String(clause._id), clause] as const));

    const checklist = await this.auditChecklistModel.create({
      auditId,
      standardId: String(standard._id),
      title: `Checklist ${standard.code}`,
      summary: `Checklist generado automaticamente a partir de ${standard.title}.`,
      progress: 0,
      itemCount: requirements.length,
    });

    if (requirements.length > 0) {
      await this.auditChecklistItemModel.insertMany(
        requirements.map((requirement, index) => ({
          checklistId: String(checklist._id),
          auditId,
          requirementId: String(requirement._id),
          clauseId: requirement.clauseId,
          clauseCode: clauseById.get(requirement.clauseId)?.code ?? '',
          title: requirement.title,
          prompt: requirement.description || requirement.intent || requirement.title,
          status: 'pending',
          evidenceIds: [],
          notes: '',
          order: index + 1,
        }))
      );
    }

    return checklist;
  }

  private async listContractDocuments(contractId: string) {
    const documents = await this.contractDocumentModel.find({ contractId }).lean();
    return documents.map((document) => ({
      id: String(document._id),
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

  private async buildStandardMetricsMap(standardIds: string[]) {
    if (standardIds.length === 0) {
      return new Map<string, { requirementsCount: number; evidencedCount: number; complianceRate: number }>();
    }

    const [requirements, evidences] = await Promise.all([
      this.standardRequirementModel
        .aggregate<{ _id: string; requirementsCount: number }>([
          { $match: { standardId: { $in: standardIds } } },
          { $group: { _id: '$standardId', requirementsCount: { $sum: 1 } } },
        ])
        .exec(),
      this.evidenceModel
        .aggregate<{ _id: string; evidencedRequirements: string[] }>([
          { $match: { standardId: { $in: standardIds } } },
          { $group: { _id: '$standardId', evidencedRequirements: { $addToSet: '$requirementId' } } },
        ])
        .exec(),
    ]);

    const metricsByStandardId = new Map<
      string,
      { requirementsCount: number; evidencedCount: number; complianceRate: number }
    >();

    requirements.forEach((item) => {
      metricsByStandardId.set(item._id, {
        requirementsCount: item.requirementsCount,
        evidencedCount: 0,
        complianceRate: 0,
      });
    });

    evidences.forEach((item) => {
      const current = metricsByStandardId.get(item._id) ?? {
        requirementsCount: 0,
        evidencedCount: 0,
        complianceRate: 0,
      };
      const evidencedCount = item.evidencedRequirements.length;
      metricsByStandardId.set(item._id, {
        requirementsCount: current.requirementsCount,
        evidencedCount,
        complianceRate: current.requirementsCount
          ? Math.round((evidencedCount / current.requirementsCount) * 100)
          : 0,
      });
    });

    return metricsByStandardId;
  }

  private serializeStandardSummaryWithMetrics(
    standard: any,
    metrics?: { requirementsCount: number; evidencedCount: number; complianceRate: number }
  ) {
    const resolvedMetrics = metrics ?? {
      requirementsCount: 0,
      evidencedCount: 0,
      complianceRate: 0,
    };

    return {
      id: String(standard._id),
      code: standard.code,
      title: standard.title,
      version: standard.version,
      description: standard.description ?? '',
      category: standard.category,
      status: standard.status,
      enabled: standard.enabled ?? true,
      owner: standard.owner ?? 'Administrador ISO',
      publishedAt: standard.publishedAt ?? null,
      createdAt: standard.createdAt,
      updatedAt: standard.updatedAt,
      metrics: resolvedMetrics,
    };
  }

  private serializeSection(section: any) {
    return {
      id: String(section._id),
      standardId: section.standardId,
      code: section.code,
      title: section.title,
      description: section.description ?? '',
      order: section.order ?? 0,
    };
  }

  private serializeClause(clause: any) {
    return {
      id: String(clause._id),
      standardId: clause.standardId,
      sectionId: clause.sectionId,
      parentClauseId: clause.parentClauseId ?? null,
      code: clause.code,
      title: clause.title,
      description: clause.description ?? '',
      order: clause.order ?? 0,
    };
  }

  private serializeRequirement(requirement: any, evidenceCount = 0) {
    return {
      id: String(requirement._id),
      standardId: requirement.standardId,
      sectionId: requirement.sectionId ?? null,
      clauseId: requirement.clauseId,
      code: requirement.code,
      title: requirement.title,
      description: requirement.description ?? '',
      intent: requirement.intent ?? '',
      order: requirement.order ?? 0,
      criticality: requirement.criticality ?? 'medium',
      status: requirement.status ?? 'active',
      evidenceCount,
    };
  }

  private serializeAppendix(appendix: any) {
    return {
      id: String(appendix._id),
      standardId: appendix.standardId,
      code: appendix.code,
      title: appendix.title,
      type: appendix.type,
      description: appendix.description ?? '',
      content: appendix.content ?? '',
      order: appendix.order ?? 0,
    };
  }

  private serializeEvidence(evidence: any) {
    return {
      id: String(evidence._id),
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

  private serializeChecklistItem(item: any) {
    return {
      id: String(item._id),
      checklistId: item.checklistId,
      auditId: item.auditId,
      requirementId: item.requirementId ?? null,
      clauseId: item.clauseId ?? null,
      clauseCode: item.clauseCode ?? '',
      title: item.title,
      prompt: item.prompt ?? '',
      status: item.status,
      evidenceIds: item.evidenceIds ?? [],
      notes: item.notes ?? '',
      order: item.order ?? 0,
    };
  }

  private serializeCorrectiveAction(action: any) {
    return {
      id: String(action._id),
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

  private async seedIfEmpty() {
    const standardsCount = await this.standardModel.countDocuments();
    if (standardsCount > 0) {
      return;
    }

    const created = await this.standardModel.insertMany([
      {
        code: 'ISO9001',
        title: 'ISO 9001:2015',
        description: 'Sistema de gestión de la calidad.',
        category: 'standard',
        status: 'active',
        version: '2015',
        enabled: true,
        owner: 'Administrador ISO',
        publishedAt: new Date('2015-09-15'),
      },
      {
        code: 'ISO14001',
        title: 'ISO 14001:2015',
        description: 'Sistema de gestión ambiental.',
        category: 'standard',
        status: 'active',
        version: '2015',
        enabled: true,
        owner: 'Administrador ISO',
        publishedAt: new Date('2015-09-15'),
      },
      {
        code: 'ISO45001',
        title: 'ISO 45001:2018',
        description: 'Sistema de gestión de seguridad y salud en el trabajo.',
        category: 'standard',
        status: 'active',
        version: '2018',
        enabled: true,
        owner: 'Administrador ISO',
        publishedAt: new Date('2018-03-12'),
      },
    ]);

    const iso9001 = created.find((item) => item.code === 'ISO9001');
    const iso14001 = created.find((item) => item.code === 'ISO14001');

    if (iso9001) {
      await this.replaceStandardStructure(String(iso9001._id), [
        {
          code: '4',
          title: 'Contexto de la organización',
          clauses: [
            {
              code: '4.4',
              title: 'Sistema de gestión de la calidad y sus procesos',
              requirements: [
                {
                  code: '4.4.1',
                  title: 'Determinar procesos y sus interacciones',
                  description: 'Definir entradas, salidas, secuencia e interacción de procesos.',
                  intent: 'Asegurar control y coherencia del sistema.',
                  criticality: 'high',
                },
              ],
            },
          ],
        },
        {
          code: '9',
          title: 'Evaluación del desempeño',
          clauses: [
            {
              code: '9.2',
              title: 'Auditoría interna',
              requirements: [
                {
                  code: '9.2.2',
                  title: 'Planificar y ejecutar auditorías',
                  description: 'Definir programa, criterios y reportes de auditoría interna.',
                  intent: 'Verificar conformidad y eficacia del sistema.',
                  criticality: 'high',
                },
              ],
            },
          ],
        },
      ], [
        {
          code: 'A',
          title: 'Anexo A',
          type: 'annex',
          description: 'Correspondencia con la estructura armonizada.',
          content: 'Anexo informativo para homologación de capítulos.',
        },
      ]);
    }

    if (iso14001) {
      await this.replaceStandardStructure(String(iso14001._id), [
        {
          code: '6',
          title: 'Planificación',
          clauses: [
            {
              code: '6.1',
              title: 'Acciones para abordar riesgos y oportunidades',
              requirements: [
                {
                  code: '6.1.2',
                  title: 'Aspectos ambientales',
                  description: 'Determinar aspectos e impactos ambientales significativos.',
                  intent: 'Priorizar controles y cumplimiento ambiental.',
                  criticality: 'high',
                },
              ],
            },
          ],
        },
      ], []);
    }

    const requirement = await this.standardRequirementModel.findOne().lean();
    if (requirement) {
      await this.evidenceModel.create({
        title: 'Mapa de procesos aprobado',
        description: 'Mapa vigente firmado por la gerencia.',
        standardId: requirement.standardId,
        requirementId: String(requirement._id),
        clauseId: requirement.clauseId,
        status: 'approved',
        objectiveType: 'document',
        owner: 'Ana Torres',
        documentIds: [],
        linkedAuditIds: [],
        collectedAt: new Date(),
        notes: 'Evidencia utilizada en la última auditoría interna.',
      });
    }

    const contract = await this.contractModel.create({
      title: 'Contrato de servicios con operador logístico',
      counterparty: 'Puerto Logística Sur SpA',
      identifier: 'CONT-LOG-2026-04',
      status: 'active',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      standardIds: [String(iso9001?._id ?? '')].filter(Boolean),
      owner: 'Luis Herrera',
      summary: 'Contrato crítico con obligaciones de seguridad, trazabilidad y continuidad operacional.',
    });

    await this.contractObligationModel.create({
      contractId: String(contract._id),
      standardId: iso9001 ? String(iso9001._id) : null,
      title: 'Reportar indicadores mensuales de servicio',
      description: 'Entrega de KPI de tiempos, incidentes y desviaciones documentadas.',
      sourceClause: 'Cláusula 7.4 del contrato',
      dueDate: new Date('2026-07-15'),
      status: 'open',
      priority: 'high',
      owner: 'Luis Herrera',
      evidenceIds: [],
    });
  }
}
