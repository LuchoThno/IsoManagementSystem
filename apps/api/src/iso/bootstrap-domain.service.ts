import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditsDomainService } from './audits-domain.service';
import { CommunicationsDomainService } from './communications-domain.service';
import { DocumentsDomainService } from './documents-domain.service';
import { GrcStandardsDomainService } from './grc-standards-domain.service';
import { SettingsDocumentService } from './settings-document.service';
import { Audit, Finding } from './schemas/audit.schema';
import { TaskEntity } from './schemas/task.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';
import { TasksDomainService } from './tasks-domain.service';

@Injectable()
export class BootstrapDomainService {
  constructor(
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    private readonly documentsDomainService: DocumentsDomainService,
    private readonly tasksDomainService: TasksDomainService,
    private readonly auditsDomainService: AuditsDomainService,
    private readonly communicationsDomainService: CommunicationsDomainService,
    private readonly settingsDocumentService: SettingsDocumentService,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService,
    private readonly grcStandardsDomainService: GrcStandardsDomainService
  ) {}

  async getBootstrap() {
    const tenantId = await this.resolveEffectiveTenantId();
    await Promise.all([
      this.backfillAuditTenantIds(tenantId),
      this.backfillTaskTenantIds(tenantId),
    ]);
    const [documents, tasks, audits, emailTemplates, emailCampaigns, settings, standards] =
      await Promise.all([
        this.documentsDomainService.listDocumentSummaries(),
        this.tasksDomainService.listTasks(),
        this.auditsDomainService.listAudits(),
        this.communicationsDomainService.listEmailTemplates(),
        this.communicationsDomainService.listEmailCampaigns(),
        this.settingsDocumentService.getSettingsDocument(),
        this.grcStandardsDomainService.listStandards(),
      ]);

    const alerts = this.buildAlerts(tasks, audits);
    const dashboard = this.buildDashboard(documents, tasks, audits);

    return {
      dashboard,
      documents,
      tasks,
      audits,
      standards,
      alerts,
      settings: {
        companyName: settings.companyName,
        standards: settings.standards,
        defaultLanguage: settings.defaultLanguage,
        timezone: settings.timezone,
      },
      notifications: this.settingsDocumentService.normalizeNotifications(settings.notifications),
      emailTemplates,
      emailCampaigns,
      communicationSettings: this.settingsDocumentService.normalizeCommunicationSettings(
        settings.communicationSettings
      ),
    };
  }

  async getBootstrapShell() {
    const tenantId = await this.resolveEffectiveTenantId();
    await Promise.all([
      this.backfillAuditTenantIds(tenantId),
      this.backfillTaskTenantIds(tenantId),
    ]);
    const [documents, tasks, audits, emailTemplates, emailCampaigns, settings, standards] =
      await Promise.all([
        this.documentsDomainService.listDocumentSummaries(),
        this.taskModel.find({ tenantId }).sort({ dueDate: 1 }).lean(),
        this.auditModel.find({ tenantId }).sort({ date: 1 }).lean(),
        this.communicationsDomainService.listEmailTemplates(),
        this.communicationsDomainService.listEmailCampaigns(),
        this.settingsDocumentService.getSettingsDocument(),
        this.grcStandardsDomainService.listStandards(),
      ]);

    const alerts = this.buildAlerts(tasks, audits);
    const dashboard = this.buildDashboard(documents, tasks, audits);

    return {
      dashboard,
      standards,
      alerts,
      settings: {
        companyName: settings.companyName,
        standards: settings.standards,
        defaultLanguage: settings.defaultLanguage,
        timezone: settings.timezone,
      },
      notifications: this.settingsDocumentService.normalizeNotifications(settings.notifications),
      emailTemplates,
      emailCampaigns,
      communicationSettings: this.settingsDocumentService.normalizeCommunicationSettings(
        settings.communicationSettings
      ),
    };
  }

  private buildAlerts(tasks: any[], audits: any[]) {
    const now = Date.now();
    const alerts = [
      ...tasks
        .filter((task) => task.status === 'overdue')
        .map((task) => ({
          id: `task-${task.id ?? String(task._id)}`,
          title: `Tarea vencida: ${task.title}`,
          description: `${task.assignedTo} debe atender esta tarea inmediatamente.`,
          type: 'task' as const,
          priority: 'high' as const,
          date: task.dueDate,
          relatedId: task.id ?? String(task._id),
        })),
      ...audits
        .filter((audit) => {
          const distance = new Date(audit.date).getTime() - now;
          return distance > 0 && distance <= 14 * 24 * 60 * 60 * 1000;
        })
        .map((audit) => ({
          id: `audit-${audit.id ?? String(audit._id)}`,
          title: `Auditoria proxima: ${audit.type} ${audit.standard}`,
          description: 'Revisa plan, alcance y evidencias antes de la fecha comprometida.',
          type: 'audit' as const,
          priority: 'medium' as const,
          date: audit.date,
          relatedId: audit.id ?? String(audit._id),
        })),
    ];

    return alerts.sort(
      (first, second) => new Date(first.date).getTime() - new Date(second.date).getTime()
    );
  }

  private buildDashboard(documents: any[], tasks: any[], audits: any[]) {
    const activeDocuments = documents.filter((document) => document.status === 'active').length;
    const pendingTasks = tasks.filter((task) => task.status !== 'completed').length;
    const upcomingAudits = audits.filter(
      (audit) => new Date(audit.date).getTime() > Date.now()
    ).length;
    const openFindings = audits.reduce(
      (total, audit) =>
        total +
        (audit.findings ?? []).filter((finding: Finding) => finding.status !== 'closed').length,
      0
    );

    const completedTasks = tasks.filter((task) => task.status === 'completed').length;
    const complianceRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 100;

    return {
      stats: [
        {
          label: 'Active Documents',
          value: activeDocuments,
          trend: 'Controlados y publicados',
          tone: 'primary' as const,
        },
        {
          label: 'Pending Tasks',
          value: pendingTasks,
          trend: 'Acciones abiertas del sistema',
          tone: 'warning' as const,
        },
        {
          label: 'Upcoming Audits',
          value: upcomingAudits,
          trend: 'Auditorias con plan vigente',
          tone: 'success' as const,
        },
        {
          label: 'Open Findings',
          value: openFindings,
          trend: 'Hallazgos en seguimiento',
          tone: 'danger' as const,
        },
      ],
      complianceRate,
      overdueTasks: tasks.filter((task) => task.status === 'overdue').length,
      upcomingAudits,
      recentActivity: [
        {
          id: 'activity-1',
          title: 'Documentacion revisada',
          description: 'Se actualizo el manual de calidad y se notifico a los responsables.',
          timestamp: 'Hace 2 horas',
        },
        {
          id: 'activity-2',
          title: 'Seguimiento de no conformidad',
          description: 'Se registro avance en el cierre de la NC-12.',
          timestamp: 'Hace 5 horas',
        },
        {
          id: 'activity-3',
          title: 'Auditoria programada',
          description: 'La auditoria interna ISO9001 ya cuenta con fecha y alcance.',
          timestamp: 'Ayer',
        },
      ],
    };
  }

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private async backfillAuditTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantId(this.auditModel, tenantId);
  }

  private async backfillTaskTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantId(this.taskModel, tenantId);
  }
}
