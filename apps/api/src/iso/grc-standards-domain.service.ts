import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { StandardClausePayload, StandardPayload } from './dto/grc.dto';
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
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class GrcStandardsDomainService implements OnModuleInit {
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
    private readonly correctiveActionModel: Model<CorrectiveActionEntity>,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async listStandards() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.ensureStructuralTenantSeeded(tenantId);
    const standards = await this.standardModel.find({ tenantId }).sort({ code: 1 }).lean();
    const metricsByStandardId = await this.buildStandardMetricsMap(
      tenantId,
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
    const tenantId = await this.resolveEffectiveTenantId();
    await this.ensureStructuralTenantSeeded(tenantId);
    const standard = await this.standardModel.create({
      tenantId,
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

    await this.replaceStandardStructure(
      tenantId,
      String(standard._id),
      payload.sections ?? [],
      payload.appendices ?? []
    );
    return this.getStandardStructure(String(standard._id));
  }

  async updateStandard(standardId: string, payload: StandardPayload) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.ensureStructuralTenantSeeded(tenantId);
    const standard = await this.standardModel.findOne({ _id: standardId, tenantId });
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
      tenantId,
      standardId,
      payload.sections ?? [],
      payload.appendices ?? []
    );

    return this.getStandardStructure(standardId);
  }

  async deleteStandard(standardId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.ensureStructuralTenantSeeded(tenantId);
    const standard = await this.standardModel.findOne({ _id: standardId, tenantId }).lean();
    if (!standard) {
      throw new NotFoundException('Standard not found');
    }

    const [requirements, clauses, checklists] = await Promise.all([
      this.standardRequirementModel.find({ standardId, tenantId }).lean(),
      this.standardClauseModel.find({ standardId, tenantId }).lean(),
      this.auditChecklistModel.find({ standardId, tenantId }).lean(),
    ]);

    await Promise.all([
      this.standardModel.deleteOne({ _id: standardId, tenantId }),
      this.standardSectionModel.deleteMany({ standardId, tenantId }),
      this.standardClauseModel.deleteMany({ standardId, tenantId }),
      this.standardRequirementModel.deleteMany({ standardId, tenantId }),
      this.standardAppendixModel.deleteMany({ standardId, tenantId }),
      this.evidenceModel.deleteMany({
        tenantId,
        $or: [
          { standardId },
          { requirementId: { $in: requirements.map((requirement) => String(requirement._id)) } },
          { clauseId: { $in: clauses.map((clause) => String(clause._id)) } },
        ],
      }),
      this.contractObligationModel.updateMany(
        { standardId, tenantId },
        { $set: { standardId: null } }
      ),
      this.contractModel.updateMany(
        { standardIds: standardId, tenantId },
        { $pull: { standardIds: standardId } }
      ),
      this.correctiveActionModel.updateMany(
        { standardId, tenantId },
        { $set: { standardId: null } }
      ),
      this.auditChecklistModel.deleteMany({ standardId, tenantId }),
      this.auditChecklistItemModel.deleteMany({
        tenantId,
        checklistId: { $in: checklists.map((checklist) => String(checklist._id)) },
      }),
    ]);

    return { success: true };
  }

  async getStandardStructure(standardId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.ensureStructuralTenantSeeded(tenantId);
    const standard = await this.standardModel.findOne({ _id: standardId, tenantId }).lean();
    if (!standard) {
      throw new NotFoundException('Standard not found');
    }

    const [sections, clauses, requirements, appendices, evidences] = await Promise.all([
      this.standardSectionModel.find({ standardId, tenantId }).sort({ order: 1 }).lean(),
      this.standardClauseModel.find({ standardId, tenantId }).sort({ order: 1 }).lean(),
      this.standardRequirementModel.find({ standardId, tenantId }).sort({ order: 1 }).lean(),
      this.standardAppendixModel.find({ standardId, tenantId }).sort({ order: 1 }).lean(),
      this.evidenceModel.find({ standardId, tenantId }).lean(),
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

  async getAuditChecklist(auditId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await Promise.all([
      this.ensureStructuralTenantSeeded(tenantId),
      this.backfillOperationalTenantIds(tenantId),
      this.backfillChecklistTenantIds(tenantId),
    ]);
    const audit = await this.auditModel.findOne({ _id: auditId, tenantId }).lean();
    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    let checklist = await this.auditChecklistModel.findOne({ auditId, tenantId });
    if (!checklist) {
      checklist = await this.buildChecklistFromAudit(tenantId, auditId, audit.standard);
    }

    const items = await this.auditChecklistItemModel
      .find({ checklistId: String(checklist._id), tenantId })
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

  private async replaceStandardStructure(
    tenantId: string,
    standardId: string,
    sections: NonNullable<StandardPayload['sections']>,
    appendices: NonNullable<StandardPayload['appendices']>
  ) {
    await Promise.all([
      this.standardSectionModel.deleteMany({ standardId, tenantId }),
      this.standardClauseModel.deleteMany({ standardId, tenantId }),
      this.standardRequirementModel.deleteMany({ standardId, tenantId }),
      this.standardAppendixModel.deleteMany({ standardId, tenantId }),
    ]);

    for (const [sectionIndex, section] of sections.entries()) {
      const sectionDoc = await this.standardSectionModel.create({
        tenantId,
        standardId,
        code: section.code,
        title: section.title,
        description: section.description ?? '',
        order: sectionIndex + 1,
      });

      await this.createClauseTree(
        tenantId,
        standardId,
        String(sectionDoc._id),
        null,
        section.clauses ?? []
      );
    }

    if (appendices.length > 0) {
      await this.standardAppendixModel.insertMany(
        appendices.map((appendix, index) => ({
          tenantId,
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
    tenantId: string,
    standardId: string,
    sectionId: string,
    parentClauseId: string | null,
    clauses: StandardClausePayload[]
  ) {
    for (const [clauseIndex, clause] of clauses.entries()) {
      const clauseDoc = await this.standardClauseModel.create({
        tenantId,
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
          tenantId,
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
          tenantId,
          standardId,
          sectionId,
          String(clauseDoc._id),
          clause.children ?? []
        );
      }
    }
  }

  private async buildChecklistFromAudit(tenantId: string, auditId: string, standardCode: string) {
    const standard = await this.standardModel.findOne({ code: standardCode, tenantId }).lean();
    if (!standard) {
      return this.auditChecklistModel.create({
        tenantId,
        auditId,
        standardId: standardCode,
        title: `Checklist ${standardCode}`,
        summary: 'Checklist inicial sin estructura normativa asociada.',
        progress: 0,
        itemCount: 0,
      });
    }

    const requirements = await this.standardRequirementModel
      .find({ standardId: String(standard._id), tenantId })
      .sort({ order: 1 })
      .lean();
    const clauses = await this.standardClauseModel
      .find({ standardId: String(standard._id), tenantId })
      .lean();
    const clauseById = new Map(clauses.map((clause) => [String(clause._id), clause] as const));

    const checklist = await this.auditChecklistModel.create({
      tenantId,
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
          tenantId,
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

  private async buildStandardMetricsMap(tenantId: string, standardIds: string[]) {
    if (standardIds.length === 0) {
      return new Map<
        string,
        { requirementsCount: number; evidencedCount: number; complianceRate: number }
      >();
    }

    const [requirements, evidences] = await Promise.all([
      this.standardRequirementModel
        .aggregate<{ _id: string; requirementsCount: number }>([
          { $match: { tenantId, standardId: { $in: standardIds } } },
          { $group: { _id: '$standardId', requirementsCount: { $sum: 1 } } },
        ])
        .exec(),
      this.evidenceModel
        .aggregate<{ _id: string; evidencedRequirements: string[] }>([
          { $match: { tenantId, standardId: { $in: standardIds } } },
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

  private async seedIfEmpty() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.ensureStructuralTenantSeeded(tenantId);
  }

  private async seedDefaultsForTenant(tenantId: string) {
    const created = await this.standardModel.insertMany([
      {
        tenantId,
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
        tenantId,
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
        tenantId,
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
      await this.replaceStandardStructure(
        tenantId,
        String(iso9001._id),
        [
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
                    description:
                      'Definir entradas, salidas, secuencia e interacción de procesos.',
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
                    description:
                      'Definir programa, criterios y reportes de auditoría interna.',
                    intent: 'Verificar conformidad y eficacia del sistema.',
                    criticality: 'high',
                  },
                ],
              },
            ],
          },
        ],
        [
          {
            code: 'A',
            title: 'Anexo A',
            type: 'annex',
            description: 'Correspondencia con la estructura armonizada.',
            content: 'Anexo informativo para homologación de capítulos.',
          },
        ]
      );
    }

    if (iso14001) {
      await this.replaceStandardStructure(
        tenantId,
        String(iso14001._id),
        [
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
                    description:
                      'Determinar aspectos e impactos ambientales significativos.',
                    intent: 'Priorizar controles y cumplimiento ambiental.',
                    criticality: 'high',
                  },
                ],
              },
            ],
          },
        ],
        []
      );
    }

    const requirement = await this.standardRequirementModel.findOne({ tenantId }).lean();
    if (requirement) {
      await this.evidenceModel.create({
        tenantId,
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
      tenantId,
      title: 'Contrato de servicios con operador logístico',
      counterparty: 'Puerto Logística Sur SpA',
      identifier: 'CONT-LOG-2026-04',
      status: 'active',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      standardIds: [String(iso9001?._id ?? '')].filter(Boolean),
      owner: 'Luis Herrera',
      summary:
        'Contrato crítico con obligaciones de seguridad, trazabilidad y continuidad operacional.',
    });

    await this.contractObligationModel.create({
      tenantId,
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

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private async ensureStructuralTenantSeeded(tenantId: string) {
    await Promise.all([
      this.backfillStructuralTenantIds(tenantId),
      this.backfillChecklistTenantIds(tenantId),
    ]);

    const standardsCount = await this.standardModel.countDocuments({ tenantId });
    if (standardsCount === 0) {
      await this.seedDefaultsForTenant(tenantId);
    }
  }

  private async backfillStructuralTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantIdForMany(
      [
        this.standardModel,
        this.standardSectionModel,
        this.standardClauseModel,
        this.standardRequirementModel,
        this.standardAppendixModel,
      ],
      tenantId
    );
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

  private async backfillChecklistTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantIdForMany(
      [this.auditChecklistModel, this.auditChecklistItemModel],
      tenantId
    );
  }
}
