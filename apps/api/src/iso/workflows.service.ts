import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ClerkSessionIdentity } from './clerk.types';
import { PlatformAuditService } from './platform-audit.service';
import { Audit } from './schemas/audit.schema';
import { TaskEntity } from './schemas/task.schema';
import { WorkflowExecutionEntity } from './schemas/workflow-execution.schema';
import { WorkflowRuleEntity } from './schemas/workflow-rule.schema';
import { TasksDomainService } from './tasks-domain.service';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';

const DEFAULT_WORKFLOW_RULES = [
  {
    code: 'audit-upcoming-v1',
    name: 'Auditoria proxima',
    triggerType: 'audit.upcoming' as const,
    enabled: true,
    cooldownMinutes: 1440,
    config: {
      windowDays: 7,
      taskLeadDays: 1,
    },
    actions: [
      {
        type: 'create-task',
        enabled: true,
        config: {
          priority: 'medium',
        },
      },
      {
        type: 'notify',
        enabled: false,
        config: {},
      },
    ],
  },
  {
    code: 'audit-overdue-finding-v1',
    name: 'Hallazgo vencido',
    triggerType: 'audit.overdue_finding' as const,
    enabled: false,
    cooldownMinutes: 1440,
    config: {
      overdueDays: 0,
    },
    actions: [],
  },
  {
    code: 'contract-overdue-obligation-v1',
    name: 'Obligacion contractual atrasada',
    triggerType: 'contract.overdue_obligation' as const,
    enabled: false,
    cooldownMinutes: 1440,
    config: {
      overdueDays: 0,
    },
    actions: [],
  },
];

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(WorkflowRuleEntity.name)
    private readonly workflowRuleModel: Model<WorkflowRuleEntity>,
    @InjectModel(WorkflowExecutionEntity.name)
    private readonly workflowExecutionModel: Model<WorkflowExecutionEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    private readonly tasksDomainService: TasksDomainService,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  async listRules() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.ensureDefaultRules(tenantId);
    const rules = await this.workflowRuleModel.find({ tenantId }).sort({ name: 1 }).lean();
    return rules.map((rule) => this.serializeRule(rule));
  }

  async listExecutions(limit = 25) {
    const tenantId = await this.resolveEffectiveTenantId();
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 25;
    const executions = await this.workflowExecutionModel
      .find({ tenantId })
      .sort({ startedAt: -1 })
      .limit(safeLimit)
      .lean();

    return executions.map((execution) => this.serializeExecution(execution));
  }

  async runUpcomingAudits(clerkAuth: ClerkSessionIdentity | null) {
    const tenantId = await this.resolveEffectiveTenantId();
    await Promise.all([
      this.ensureDefaultRules(tenantId),
      this.tenantBackfillService.ensureTenantId(this.auditModel, tenantId),
      this.tenantBackfillService.ensureTenantId(this.taskModel, tenantId),
    ]);

    const rule = await this.workflowRuleModel.findOne({
      tenantId,
      triggerType: 'audit.upcoming',
      enabled: true,
    });

    if (!rule) {
      return {
        rule: null,
        processed: 0,
        createdTasks: 0,
        skipped: 0,
        executions: [],
      };
    }

    const windowDays = this.readPositiveInteger(rule.config?.windowDays, 7);
    const leadDays = this.readPositiveInteger(rule.config?.taskLeadDays, 1);
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const actor = await this.platformAuditService.getActorLabel(clerkAuth);

    const audits = await this.auditModel
      .find({
        tenantId,
        status: 'planned',
        date: { $gte: now, $lte: windowEnd },
      })
      .sort({ date: 1 })
      .lean();

    const executions = [] as Array<Record<string, unknown>>;
    let createdTasks = 0;
    let skipped = 0;

    for (const audit of audits) {
      const execution = await this.workflowExecutionModel.create({
        tenantId,
        ruleId: String(rule._id),
        triggerType: 'audit.upcoming',
        resourceType: 'audit',
        resourceId: String(audit._id),
        status: 'started',
        startedAt: new Date(),
        finishedAt: null,
        summary: '',
        metadata: {
          auditDate: audit.date,
          auditType: audit.type,
          standard: audit.standard,
        },
        errorMessage: null,
      });

      await this.platformAuditService.captureFromSession(clerkAuth, {
        action: 'workflow.execution.started',
        resourceType: 'workflow-execution',
        resourceId: String(execution._id),
        status: 'success',
        metadata: {
          triggerType: 'audit.upcoming',
          auditId: String(audit._id),
          tenantId,
        },
      });

      try {
        const existingTask = await this.taskModel.findOne({
          tenantId,
          relatedAuditIds: String(audit._id),
          status: { $in: ['pending', 'in-progress', 'overdue'] },
        });

        if (existingTask) {
          execution.status = 'skipped';
          execution.finishedAt = new Date();
          execution.summary = 'Ya existe una tarea abierta asociada a la auditoría.';
          execution.metadata = {
            ...execution.metadata,
            taskId: String(existingTask._id),
            reason: 'open_task_already_exists',
          };
          await execution.save();
          skipped += 1;

          await this.platformAuditService.captureFromSession(clerkAuth, {
            action: 'workflow.execution.skipped',
            resourceType: 'workflow-execution',
            resourceId: String(execution._id),
            status: 'success',
            metadata: {
              triggerType: 'audit.upcoming',
              auditId: String(audit._id),
              taskId: String(existingTask._id),
              tenantId,
            },
          });
        } else {
          const dueDate = new Date(
            new Date(audit.date).getTime() - leadDays * 24 * 60 * 60 * 1000
          );

          const createdTask = await this.tasksDomainService.createTask(
            {
              title: `Preparar auditoria: ${audit.type} ${audit.standard}`,
              description:
                'Workflow automatico para preparar alcance, evidencias y responsables antes de la auditoria programada.',
              assignedTo: 'Administrador ISO',
              dueDate: dueDate.toISOString(),
              status: 'pending',
              priority: 'medium',
              standard: audit.standard,
              relatedDocuments: [],
              relatedAuditIds: [String(audit._id)],
              relatedFindingIds: [],
              changeSummary: 'Workflow automatico por auditoria proxima.',
            },
            {
              author: actor,
              summary: 'Workflow automatico genero tarea preventiva para auditoria proxima.',
            }
          );

          execution.status = 'succeeded';
          execution.finishedAt = new Date();
          execution.summary = 'Se creó una tarea preventiva para la auditoría próxima.';
          execution.metadata = {
            ...execution.metadata,
            taskId: createdTask.id,
          };
          await execution.save();
          createdTasks += 1;

          await this.platformAuditService.captureFromSession(clerkAuth, {
            action: 'workflow.execution.succeeded',
            resourceType: 'workflow-execution',
            resourceId: String(execution._id),
            status: 'success',
            metadata: {
              triggerType: 'audit.upcoming',
              auditId: String(audit._id),
              taskId: createdTask.id,
              tenantId,
            },
          });
        }
      } catch (error) {
        execution.status = 'failed';
        execution.finishedAt = new Date();
        execution.summary = 'La ejecución del workflow falló.';
        execution.errorMessage =
          error instanceof Error ? error.message : 'Workflow audit.upcoming failed.';
        await execution.save();

        await this.platformAuditService.captureFromSession(clerkAuth, {
          action: 'workflow.execution.failed',
          resourceType: 'workflow-execution',
          resourceId: String(execution._id),
          status: 'failure',
          errorMessage: execution.errorMessage,
          metadata: {
            triggerType: 'audit.upcoming',
            auditId: String(audit._id),
            tenantId,
          },
        });
      }

      executions.push(this.serializeExecution(execution.toObject()));
    }

    return {
      rule: this.serializeRule(rule.toObject()),
      processed: audits.length,
      createdTasks,
      skipped,
      executions,
    };
  }

  private async ensureDefaultRules(tenantId: string) {
    await Promise.all(
      DEFAULT_WORKFLOW_RULES.map((rule) =>
        this.workflowRuleModel.updateOne(
          { tenantId, code: rule.code },
          {
            $setOnInsert: {
              tenantId,
              ...rule,
            },
          },
          { upsert: true }
        )
      )
    );
  }

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private readPositiveInteger(value: unknown, fallback: number) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
  }

  private serializeRule(rule: any) {
    return {
      id: String(rule._id),
      tenantId: rule.tenantId ?? null,
      code: rule.code,
      name: rule.name,
      triggerType: rule.triggerType,
      enabled: Boolean(rule.enabled),
      cooldownMinutes: rule.cooldownMinutes,
      config: rule.config ?? {},
      actions: rule.actions ?? [],
      createdAt: rule.createdAt ?? null,
      updatedAt: rule.updatedAt ?? null,
    };
  }

  private serializeExecution(execution: any) {
    return {
      id: String(execution._id),
      tenantId: execution.tenantId ?? null,
      ruleId: execution.ruleId,
      triggerType: execution.triggerType,
      resourceType: execution.resourceType,
      resourceId: execution.resourceId,
      status: execution.status,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt ?? null,
      summary: execution.summary ?? '',
      metadata: execution.metadata ?? {},
      errorMessage: execution.errorMessage ?? null,
      createdAt: execution.createdAt ?? null,
      updatedAt: execution.updatedAt ?? null,
    };
  }
}
