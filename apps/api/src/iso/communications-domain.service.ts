import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  CreateEmailTemplateDto,
  DeliverPdfArtifactDto,
  SendBulkTaskReminderCampaignDto,
  StorePdfArtifactDto,
  UpdateCommunicationSettingsDto,
  UpdateEmailTemplateDto,
} from './dto/communications.dto';
import { EmailDeliveryService } from './email-delivery.service';
import { GoogleDriveService } from './google-drive.service';
import { EmailCampaignEntity } from './schemas/email-campaign.schema';
import { EmailTemplateEntity } from './schemas/email-template.schema';
import { TaskEntity } from './schemas/task.schema';
import { SettingsDocumentService } from './settings-document.service';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class CommunicationsDomainService {
  constructor(
    @InjectModel(EmailTemplateEntity.name)
    private readonly emailTemplateModel: Model<EmailTemplateEntity>,
    @InjectModel(EmailCampaignEntity.name)
    private readonly emailCampaignModel: Model<EmailCampaignEntity>,
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    private readonly settingsDocumentService: SettingsDocumentService,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService,
    private readonly emailDeliveryService: EmailDeliveryService,
    private readonly googleDriveService: GoogleDriveService
  ) {}

  async listEmailTemplates() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillCommunicationTenantIds(tenantId);
    const templates = await this.emailTemplateModel.find({ tenantId }).sort({ updatedAt: -1 }).lean();
    return templates.map((template) => this.serializeEmailTemplate(template));
  }

  async listEmailCampaigns() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillCommunicationTenantIds(tenantId);
    const campaigns = await this.emailCampaignModel.find({ tenantId }).sort({ createdAt: -1 }).lean();
    return campaigns.map((campaign) => this.serializeEmailCampaign(campaign));
  }

  async getCommunicationSettings() {
    const settings = await this.settingsDocumentService.getSettingsDocument();
    return this.settingsDocumentService.normalizeCommunicationSettings(
      settings.communicationSettings
    );
  }

  async createEmailTemplate(payload: CreateEmailTemplateDto) {
    const tenantId = await this.resolveEffectiveTenantId();
    const template = await this.emailTemplateModel.create({
      tenantId,
      ...payload,
    });
    return this.serializeEmailTemplate(template.toObject());
  }

  async updateEmailTemplate(id: string, updates: UpdateEmailTemplateDto) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillCommunicationTenantIds(tenantId);
    const template = await this.emailTemplateModel.findOne({ _id: id, tenantId });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (typeof updates.name === 'string') template.name = updates.name;
    if (typeof updates.subject === 'string') template.subject = updates.subject;
    if (typeof updates.content === 'string') template.content = updates.content;
    await template.save();

    return this.serializeEmailTemplate(template.toObject());
  }

  async deleteEmailTemplate(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillCommunicationTenantIds(tenantId);
    await this.emailTemplateModel.findOneAndDelete({ _id: id, tenantId });
    return { success: true };
  }

  async sendBulkTaskReminderCampaign(payload: SendBulkTaskReminderCampaignDto) {
    const tenantId = await this.resolveEffectiveTenantId();
    await Promise.all([
      this.backfillCommunicationTenantIds(tenantId),
      this.backfillTaskTenantIds(tenantId),
    ]);
    const template = await this.emailTemplateModel.findOne({ _id: payload.templateId, tenantId }).lean();
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const settings = await this.settingsDocumentService.getSettingsDocument();
    const tasks = await this.taskModel.find({ tenantId }).lean();
    const now = Date.now();
    const maxDate = now + payload.daysAhead * 24 * 60 * 60 * 1000;
    const matchingTasks = tasks.filter(
      (task) =>
        task.status !== 'completed' &&
        new Date(task.dueDate).getTime() >= now &&
        new Date(task.dueDate).getTime() <= maxDate &&
        payload.recipientNames.includes(task.assignedTo)
    );

    const dueSummary = matchingTasks.map((task) => `${task.title} (${task.assignedTo})`).join(', ');
    const rendered = this.renderTemplate(this.serializeEmailTemplate(template), {
      companyName: settings.companyName,
      userName: payload.recipientNames.join(', '),
      taskCount: matchingTasks.length,
      daysAhead: payload.daysAhead,
      dueSummary: dueSummary || 'Sin tareas por vencer en este rango.',
      taskTable:
        matchingTasks.length > 0
          ? `<ul>${matchingTasks
              .map(
                (task) =>
                  `<li><strong>${task.title}</strong> - ${task.assignedTo} - ${new Date(
                    task.dueDate
                  ).toLocaleDateString('es-CL')}</li>`
              )
              .join('')}</ul>`
          : '<p>No hay tareas por vencer.</p>',
    });

    try {
      const delivery = await this.emailDeliveryService.sendEmail({
        settings: settings.communicationSettings,
        recipients: payload.recipientEmails,
        subject: rendered.subject,
        html: rendered.body,
      });

      const campaign = await this.emailCampaignModel.create({
        tenantId,
        name: payload.name,
        templateId: String(template._id),
        templateName: template.name,
        subject: rendered.subject,
        body: rendered.body,
        recipientIds: payload.recipientIds,
        recipientCount: payload.recipientIds.length,
        taskIds: matchingTasks.map((task) => String(task._id)),
        taskCount: matchingTasks.length,
        daysAhead: payload.daysAhead,
        status: 'sent',
        deliveryProvider: delivery.provider,
        deliveryReference: delivery.reference,
        errorMessage: null,
        sentAt: new Date(),
      });

      return this.serializeEmailCampaign(campaign.toObject());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al enviar';
      const failedCampaign = await this.emailCampaignModel.create({
        tenantId,
        name: payload.name,
        templateId: String(template._id),
        templateName: template.name,
        subject: rendered.subject,
        body: rendered.body,
        recipientIds: payload.recipientIds,
        recipientCount: payload.recipientIds.length,
        taskIds: matchingTasks.map((task) => String(task._id)),
        taskCount: matchingTasks.length,
        daysAhead: payload.daysAhead,
        status: 'failed',
        deliveryProvider: settings.communicationSettings.providerType || 'custom',
        deliveryReference: null,
        errorMessage: message,
        sentAt: null,
      });

      return this.serializeEmailCampaign(failedCampaign.toObject());
    }
  }

  async getCommunicationCompatibility() {
    const settings = await this.settingsDocumentService.getSettingsDocument();
    return this.emailDeliveryService.getCompatibility(settings.communicationSettings);
  }

  async storePdfArtifact(payload: StorePdfArtifactDto) {
    return this.googleDriveService.uploadPdfArtifact({
      fileName: payload.fileName,
      pdfBytes: Buffer.from(payload.pdfBase64, 'base64'),
    });
  }

  async deliverPdfArtifact(payload: DeliverPdfArtifactDto) {
    const settings = await this.settingsDocumentService.getSettingsDocument();
    const recipients = Array.from(
      new Set(
        payload.recipientEmails
          .map((recipient) => recipient.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const html = [
      `<h2>${payload.title}</h2>`,
      `<p>Documento generado por <strong>${payload.generatedByName}</strong> (${payload.generatedByEmail}).</p>`,
      `<p>Fuente: ${payload.sourceType} · ${payload.sourceId}</p>`,
      `<p>Checksum: <code>${payload.checksum}</code></p>`,
      `<p>Generado: ${new Date(payload.generatedAtIso).toLocaleString('es-CL')}</p>`,
      payload.fileUrl
        ? `<p>Disponible en Drive: <a href="${payload.fileUrl}">${payload.fileUrl}</a></p>`
        : `<p>Almacenamiento: ${payload.storageLabel || 'No informado'}</p>`,
    ].join('');

    const delivery = await this.emailDeliveryService.sendEmail({
      settings: settings.communicationSettings,
      recipients,
      subject: payload.subject,
      html,
      attachments: [
        {
          filename: payload.fileName,
          contentBase64: payload.pdfBase64,
          contentType: 'application/pdf',
        },
      ],
    });

    return {
      provider: delivery.provider,
      delivered: true,
      reference: delivery.reference,
      detail: `Documento enviado a ${recipients.length} destinatario(s).`,
    };
  }

  async updateCommunicationSettings(communicationSettings: UpdateCommunicationSettingsDto) {
    const current = await this.settingsDocumentService.getSettingsDocument();
    current.communicationSettings =
      this.settingsDocumentService.normalizeCommunicationSettings(communicationSettings);
    current.markModified('communicationSettings');
    await current.save();

    return current.communicationSettings;
  }

  async seedEmailTemplatesIfEmpty() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillCommunicationTenantIds(tenantId);
    const templateCount = await this.emailTemplateModel.countDocuments();

    if (templateCount === 0) {
      await this.emailTemplateModel.create({
        tenantId,
        name: 'Recordatorio de tareas por vencer',
        subject: 'Acciones por vencer en {{daysAhead}} dias - {{companyName}}',
        content:
          '<h2>Hola {{userName}}</h2><p>Tienes <strong>{{taskCount}}</strong> tarea(s) por vencer.</p><p>{{dueSummary}}</p><div>{{taskTable}}</div><p>Por favor actualiza su estado antes del cierre del periodo.</p>',
      });
    }
  }

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private async backfillCommunicationTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantIdForMany(
      [this.emailTemplateModel, this.emailCampaignModel],
      tenantId
    );
  }

  private async backfillTaskTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantId(this.taskModel, tenantId);
  }

  private renderTemplate(
    template: {
      subject: string;
      content: string;
    },
    context: Record<string, string | number>
  ) {
    const replace = (value: string) =>
      Object.entries(context).reduce(
        (content, [key, replacement]) =>
          content.replaceAll(`{{${key}}}`, String(replacement)),
        value
      );

    return {
      subject: replace(template.subject),
      body: replace(template.content),
    };
  }

  private serializeEmailTemplate(template: {
    _id?: unknown;
    id?: string;
    tenantId?: string | null;
    name: string;
    subject: string;
    content: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  }) {
    return {
      id: template.id ?? String(template._id),
      tenantId: template.tenantId ?? null,
      name: template.name,
      subject: template.subject,
      content: template.content,
      createdAt: new Date(template.createdAt ?? Date.now()).toISOString(),
      updatedAt: new Date(template.updatedAt ?? Date.now()).toISOString(),
    };
  }

  private serializeEmailCampaign(campaign: {
    _id?: unknown;
    id?: string;
    tenantId?: string | null;
    name: string;
    templateId: string;
    templateName: string;
    subject: string;
    body: string;
    recipientIds: string[];
    recipientCount: number;
    taskIds: string[];
    taskCount: number;
    daysAhead: number;
    status: 'draft' | 'sent' | 'failed';
    deliveryProvider?: string;
    deliveryReference?: string | null;
    errorMessage?: string | null;
    createdAt?: Date | string;
    sentAt?: Date | string | null;
  }) {
    return {
      id: campaign.id ?? String(campaign._id),
      tenantId: campaign.tenantId ?? null,
      name: campaign.name,
      templateId: campaign.templateId,
      templateName: campaign.templateName,
      subject: campaign.subject,
      body: campaign.body,
      recipientIds: campaign.recipientIds,
      recipientCount: campaign.recipientCount,
      taskIds: campaign.taskIds,
      taskCount: campaign.taskCount,
      daysAhead: campaign.daysAhead,
      status: campaign.status,
      deliveryProvider: campaign.deliveryProvider ?? 'custom',
      deliveryReference: campaign.deliveryReference ?? null,
      errorMessage: campaign.errorMessage ?? null,
      createdAt: new Date(campaign.createdAt ?? Date.now()).toISOString(),
      sentAt: campaign.sentAt ? new Date(campaign.sentAt).toISOString() : null,
    };
  }
}
