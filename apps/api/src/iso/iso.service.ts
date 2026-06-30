import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, Finding } from './schemas/audit.schema';
import { ChatThreadEntity } from './schemas/chat-thread.schema';
import { DocumentEntity } from './schemas/document.schema';
import { EmailDeliveryService } from './email-delivery.service';
import { EmailCampaignEntity } from './schemas/email-campaign.schema';
import { EmailTemplateEntity } from './schemas/email-template.schema';
import { SettingsEntity } from './schemas/settings.schema';
import { TaskEntity } from './schemas/task.schema';

type Standard = 'ISO9001' | 'ISO14001' | 'ISO45001';
type DocumentFormat =
  | 'PDF'
  | 'DOCX'
  | 'XLSX'
  | 'PPTX'
  | 'TXT'
  | 'PNG'
  | 'JPG'
  | 'WEBP'
  | 'GIF';
type DocumentStatus = 'draft' | 'active' | 'archived';

@Injectable()
export class IsoService implements OnModuleInit {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntity>,
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    @InjectModel(ChatThreadEntity.name)
    private readonly chatThreadModel: Model<ChatThreadEntity>,
    @InjectModel(EmailTemplateEntity.name)
    private readonly emailTemplateModel: Model<EmailTemplateEntity>,
    @InjectModel(EmailCampaignEntity.name)
    private readonly emailCampaignModel: Model<EmailCampaignEntity>,
    @InjectModel(SettingsEntity.name)
    private readonly settingsModel: Model<SettingsEntity>,
    private readonly emailDeliveryService: EmailDeliveryService
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async getDocuments() {
    const documents = await this.documentModel.find().sort({ updatedAt: -1 }).lean();
    return documents.map((document) => this.serializeDocumentSummary(document));
  }

  async getTasks() {
    const tasks = await this.taskModel.find().sort({ dueDate: 1 }).lean();
    return tasks.map((task) => this.serializeTask(task));
  }

  async getAudits() {
    const audits = await this.auditModel.find().sort({ date: 1 }).lean();
    return audits.map((audit) => this.serializeAudit(audit));
  }

  async getBootstrap() {
    const [documents, tasks, audits, emailTemplates, emailCampaigns, settings] = await Promise.all([
      this.documentModel.find().sort({ updatedAt: -1 }).lean(),
      this.taskModel.find().sort({ dueDate: 1 }).lean(),
      this.auditModel.find().sort({ date: 1 }).lean(),
      this.emailTemplateModel.find().sort({ updatedAt: -1 }).lean(),
      this.emailCampaignModel.find().sort({ createdAt: -1 }).lean(),
      this.getSettingsDocument(),
    ]);

    const alerts = this.buildAlerts(tasks, audits);
    const dashboard = this.buildDashboard(documents, tasks, audits);

    return {
      dashboard,
      documents: documents.map((document) => this.serializeDocumentSummary(document)),
      tasks: tasks.map((task) => this.serializeTask(task)),
      audits: audits.map((audit) => this.serializeAudit(audit)),
      alerts,
      settings: {
        companyName: settings.companyName,
        standards: settings.standards,
        defaultLanguage: settings.defaultLanguage,
        timezone: settings.timezone,
      },
      notifications: this.normalizeNotifications(settings.notifications),
      emailTemplates: emailTemplates.map((template) => this.serializeEmailTemplate(template)),
      emailCampaigns: emailCampaigns.map((campaign) => this.serializeEmailCampaign(campaign)),
      communicationSettings: this.normalizeCommunicationSettings(settings.communicationSettings),
    };
  }

  async getBootstrapShell() {
    const [documents, tasks, audits, emailTemplates, emailCampaigns, settings] = await Promise.all([
      this.documentModel.find().sort({ updatedAt: -1 }).lean(),
      this.taskModel.find().sort({ dueDate: 1 }).lean(),
      this.auditModel.find().sort({ date: 1 }).lean(),
      this.emailTemplateModel.find().sort({ updatedAt: -1 }).lean(),
      this.emailCampaignModel.find().sort({ createdAt: -1 }).lean(),
      this.getSettingsDocument(),
    ]);

    const alerts = this.buildAlerts(tasks, audits);
    const dashboard = this.buildDashboard(documents, tasks, audits);

    return {
      dashboard,
      alerts,
      settings: {
        companyName: settings.companyName,
        standards: settings.standards,
        defaultLanguage: settings.defaultLanguage,
        timezone: settings.timezone,
      },
      notifications: this.normalizeNotifications(settings.notifications),
      emailTemplates: emailTemplates.map((template) => this.serializeEmailTemplate(template)),
      emailCampaigns: emailCampaigns.map((campaign) => this.serializeEmailCampaign(campaign)),
      communicationSettings: this.normalizeCommunicationSettings(settings.communicationSettings),
    };
  }

  async createEmailTemplate(payload: {
    name: string;
    subject: string;
    content: string;
  }) {
    const template = await this.emailTemplateModel.create(payload);
    return this.serializeEmailTemplate(template.toObject());
  }

  async updateEmailTemplate(
    id: string,
    updates: Partial<{
      name: string;
      subject: string;
      content: string;
    }>
  ) {
    const template = await this.emailTemplateModel.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    if (typeof updates.name === 'string') template.name = updates.name;
    if (typeof updates.subject === 'string') template.subject = updates.subject;
    if (typeof updates.content === 'string') template.content = updates.content;
    await template.save();

    return this.serializeEmailTemplate(template.toObject());
  }

  async deleteEmailTemplate(id: string) {
    await this.emailTemplateModel.findByIdAndDelete(id);
    return { success: true };
  }

  async sendBulkTaskReminderCampaign(payload: {
    name: string;
    templateId: string;
    daysAhead: number;
    recipientIds: string[];
    recipientNames: string[];
    recipientEmails: string[];
  }) {
    const template = await this.emailTemplateModel.findById(payload.templateId).lean();
    if (!template) {
      throw new Error('Template not found');
    }

    const settings = await this.getSettingsDocument();
    const tasks = await this.taskModel.find().lean();
    const now = Date.now();
    const maxDate = now + payload.daysAhead * 24 * 60 * 60 * 1000;
    const matchingTasks = tasks.filter(
      (task) =>
        task.status !== 'completed' &&
        new Date(task.dueDate).getTime() >= now &&
        new Date(task.dueDate).getTime() <= maxDate &&
        payload.recipientNames.includes(task.assignedTo)
    );

    const dueSummary = matchingTasks
      .map((task) => `${task.title} (${task.assignedTo})`)
      .join(', ');

    const rendered = this.renderTemplate(
      this.serializeEmailTemplate(template),
      {
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
      }
    );

    try {
      const delivery = await this.emailDeliveryService.sendEmail({
        settings: settings.communicationSettings,
        recipients: payload.recipientEmails,
        subject: rendered.subject,
        html: rendered.body,
      });

      const campaign = await this.emailCampaignModel.create({
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
    const settings = await this.getSettingsDocument();
    return this.emailDeliveryService.getCompatibility(settings.communicationSettings);
  }

  async getChatThreads(userId: string) {
    const threads = await this.chatThreadModel
      .find({ participantIds: userId })
      .sort({ updatedAt: -1 })
      .lean();

    return threads.map((thread) => this.serializeChatThread(thread));
  }

  async openDirectThread(participantIds: string[]) {
    const uniqueParticipants = Array.from(
      new Set(participantIds.map((participantId) => participantId.trim()).filter(Boolean))
    ).sort();

    if (uniqueParticipants.length < 2) {
      throw new BadRequestException('At least two participants are required');
    }

    const existingThreads = await this.chatThreadModel
      .find({
        participantIds: { $all: uniqueParticipants },
      })
      .lean();

    const existing = existingThreads.find((thread) => {
      const currentParticipants = [...(thread.participantIds ?? [])].sort();
      return (
        currentParticipants.length === uniqueParticipants.length &&
        currentParticipants.every(
          (participantId, index) => participantId === uniqueParticipants[index]
        )
      );
    });

    if (existing) {
      return this.serializeChatThread(existing);
    }

    const thread = await this.chatThreadModel.create({
      participantIds: uniqueParticipants,
      messages: [],
      updatedAt: new Date(),
    });

    return this.serializeChatThread(thread.toObject());
  }

  async sendChatMessage(threadId: string, authorId: string, content: string) {
    const thread = await this.chatThreadModel.findById(threadId);

    if (!thread) {
      throw new NotFoundException('Conversation not found');
    }

    this.assertThreadParticipant(thread.participantIds, authorId);

    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException('Message content is required');
    }

    const nextMessage = {
      id: this.makeId('msg'),
      authorId,
      content: normalizedContent,
      createdAt: new Date(),
      readBy: [authorId],
    };

    thread.messages = [...(thread.messages ?? []), nextMessage];
    thread.updatedAt = nextMessage.createdAt;
    await thread.save();

    return this.serializeChatThread(thread.toObject());
  }

  async markThreadAsRead(threadId: string, userId: string) {
    const thread = await this.chatThreadModel.findById(threadId);

    if (!thread) {
      throw new NotFoundException('Conversation not found');
    }

    this.assertThreadParticipant(thread.participantIds, userId);

    thread.messages = (thread.messages ?? []).map((message) => ({
      ...message,
      readBy: message.readBy.includes(userId)
        ? message.readBy
        : [...message.readBy, userId],
    }));

    await thread.save();
    return this.serializeChatThread(thread.toObject());
  }

  async createDocument(payload: {
    title: string;
    topic: string;
    type: 'manual' | 'procedure' | 'record';
    format: DocumentFormat;
    standard: Standard;
    version: string;
    fileName: string;
    mimeType: string;
    fileContentUrl: string;
  }) {
    const now = new Date();
    const document = await this.documentModel.create({
      title: payload.title,
      topic: payload.topic,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      type: payload.type,
      format: payload.format,
      standard: payload.standard,
      version: payload.version || '1.0',
      status: 'draft',
      url: payload.fileContentUrl,
      versionHistory: [
        {
          id: this.makeId('doc-version'),
          version: payload.version || '1.0',
          date: now,
          author: 'Administrador ISO',
          notes: `Carga inicial del archivo ${payload.fileName}`,
        },
      ],
      auditTrail: [
        {
          id: this.makeId('doc-audit'),
          action: 'created',
          date: now,
          author: 'Administrador ISO',
          details: `Documento creado con formato ${payload.format}`,
        },
      ],
    });

    return this.serializeDocument(document.toObject());
  }

  async getDocumentContent(id: string) {
    const document = await this.documentModel.findById(id).lean();
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return {
      url: document.url,
      fileName: document.fileName ?? undefined,
      mimeType: document.mimeType ?? undefined,
    };
  }

  async updateDocument(
    id: string,
    updates: {
      title?: string;
      topic?: string;
      format?: DocumentFormat;
      version?: string;
      status?: DocumentStatus;
    }
  ) {
    const document = await this.documentModel.findById(id);

    if (!document) {
      throw new Error('Document not found');
    }

    const previousVersion = document.version;
    if (typeof updates.title === 'string') document.title = updates.title;
    if (typeof updates.topic === 'string') document.topic = updates.topic;
    if (typeof updates.format === 'string') document.format = updates.format;
    if (typeof updates.status === 'string') document.status = updates.status;
    if (typeof updates.version === 'string') document.version = updates.version;

    document.auditTrail = [
      ...(document.auditTrail ?? []),
      {
        id: this.makeId('doc-audit'),
        action: 'updated',
        date: new Date(),
        author: 'Administrador ISO',
        details: `Se actualizo el documento${updates.version ? ` a la version ${updates.version}` : ''}`,
      },
    ];

    if (updates.version && updates.version !== previousVersion) {
      document.versionHistory = [
        ...(document.versionHistory ?? []),
        {
          id: this.makeId('doc-version'),
          version: updates.version,
          date: new Date(),
          author: 'Administrador ISO',
          notes: `Cambio de version desde ${previousVersion}`,
        },
      ];
    }

    await document.save();
    return this.serializeDocument(document.toObject());
  }

  async registerDocumentView(id: string) {
    const document = await this.documentModel.findById(id);

    if (!document) {
      throw new Error('Document not found');
    }

    document.auditTrail = [
      ...(document.auditTrail ?? []),
      {
        id: this.makeId('doc-audit'),
        action: 'viewed',
        date: new Date(),
        author: 'Administrador ISO',
        details: 'Se consulto la vista del documento',
      },
    ];

    await document.save();
    return this.serializeDocument(document.toObject());
  }

  async deleteDocument(id: string) {
    await this.documentModel.findByIdAndDelete(id);
    return { success: true };
  }

  async createTask(payload: {
    title: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
    priority: 'low' | 'medium' | 'high';
    standard: Standard;
    relatedDocuments: string[];
  }) {
    const task = await this.taskModel.create({
      ...payload,
      dueDate: new Date(payload.dueDate),
    });

    return this.serializeTask(task.toObject());
  }

  async updateTaskStatus(
    id: string,
    status: 'pending' | 'in-progress' | 'completed' | 'overdue'
  ) {
    const task = await this.taskModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!task) {
      throw new Error('Task not found');
    }

    return this.serializeTask(task.toObject());
  }

  async updateTask(
    id: string,
    updates: {
      title?: string;
      description?: string;
      assignedTo?: string;
      dueDate?: string;
      status?: 'pending' | 'in-progress' | 'completed' | 'overdue';
      priority?: 'low' | 'medium' | 'high';
      standard?: Standard;
      relatedDocuments?: string[];
    }
  ) {
    const task = await this.taskModel.findById(id);

    if (!task) {
      throw new Error('Task not found');
    }

    if (typeof updates.title === 'string') task.title = updates.title;
    if (typeof updates.description === 'string') task.description = updates.description;
    if (typeof updates.assignedTo === 'string') task.assignedTo = updates.assignedTo;
    if (typeof updates.dueDate === 'string') task.dueDate = new Date(updates.dueDate);
    if (typeof updates.status === 'string') task.status = updates.status;
    if (typeof updates.priority === 'string') task.priority = updates.priority;
    if (typeof updates.standard === 'string') task.standard = updates.standard;
    if (Array.isArray(updates.relatedDocuments)) task.relatedDocuments = updates.relatedDocuments;

    await task.save();
    return this.serializeTask(task.toObject());
  }

  async deleteTask(id: string) {
    await this.taskModel.findByIdAndDelete(id);
    return { success: true };
  }

  async createAudit(payload: {
    type: 'internal' | 'external';
    standard: Standard;
    date: string;
    status: 'planned' | 'in-progress' | 'completed';
    findings: Array<{
      id: string;
      type: Finding['type'];
      description: string;
      status: Finding['status'];
      dueDate: string;
      assignedTo: string;
    }>;
  }) {
    const audit = await this.auditModel.create({
      ...payload,
      date: new Date(payload.date),
      findings: payload.findings.map((finding) => ({
        ...finding,
        dueDate: new Date(finding.dueDate),
      })),
    });

    return this.serializeAudit(audit.toObject());
  }

  async updateAuditStatus(
    id: string,
    status: 'planned' | 'in-progress' | 'completed'
  ) {
    const audit = await this.auditModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!audit) {
      throw new Error('Audit not found');
    }

    return this.serializeAudit(audit.toObject());
  }

  async updateAudit(
    id: string,
    updates: {
      type?: 'internal' | 'external';
      standard?: Standard;
      date?: string;
      status?: 'planned' | 'in-progress' | 'completed';
      findings?: Array<{
        id: string;
        type: Finding['type'];
        description: string;
        status: Finding['status'];
        dueDate: string;
        assignedTo: string;
      }>;
    }
  ) {
    const audit = await this.auditModel.findById(id);

    if (!audit) {
      throw new Error('Audit not found');
    }

    if (typeof updates.type === 'string') audit.type = updates.type;
    if (typeof updates.standard === 'string') audit.standard = updates.standard;
    if (typeof updates.date === 'string') audit.date = new Date(updates.date);
    if (typeof updates.status === 'string') audit.status = updates.status;
    if (Array.isArray(updates.findings)) {
      audit.findings = updates.findings.map((finding) => ({
        ...finding,
        dueDate: new Date(finding.dueDate),
      })) as Finding[];
    }

    await audit.save();
    return this.serializeAudit(audit.toObject());
  }

  async deleteAudit(id: string) {
    await this.auditModel.findByIdAndDelete(id);
    return { success: true };
  }

  async updateSettings(
    settings: {
      companyName: string;
      standards: {
        ISO9001: boolean;
        ISO14001: boolean;
        ISO45001: boolean;
      };
      defaultLanguage: string;
      timezone: string;
    },
    notifications: SettingsEntity['notifications']
  ) {
    const current = await this.getSettingsDocument();
    current.companyName = settings.companyName;
    current.standards = settings.standards;
    current.defaultLanguage = settings.defaultLanguage;
    current.timezone = settings.timezone;
    current.notifications = this.normalizeNotifications(notifications);
    current.markModified('notifications');
    await current.save();

    return {
      settings,
      notifications: this.normalizeNotifications(current.notifications),
    };
  }

  async updateCommunicationSettings(
    communicationSettings: SettingsEntity['communicationSettings']
  ) {
    const current = await this.getSettingsDocument();
    current.communicationSettings = this.normalizeCommunicationSettings(communicationSettings);
    current.markModified('communicationSettings');
    await current.save();

    return current.communicationSettings;
  }

  private async getSettingsDocument() {
    let settings = await this.settingsModel.findOne();

    if (!settings) {
      settings = await this.settingsModel.create({
        companyName: 'ISO Manager',
        standards: {
          ISO9001: true,
          ISO14001: true,
          ISO45001: true,
        },
        defaultLanguage: 'es',
        timezone: 'America/Santiago',
        notifications: {
          email: {
            enabled: true,
            taskReminders: true,
            auditReminders: true,
            documentUpdates: true,
          },
          inApp: {
            enabled: true,
            taskReminders: true,
            auditReminders: true,
            documentUpdates: true,
          },
          desktop: {
            enabled: true,
            chatMessages: true,
            connectionAlerts: true,
          },
        },
        communicationSettings: {
          enabled: true,
          providerType: 'custom',
          providerName: 'Proveedor SMTP',
          senderName: 'Sistema ISO',
          senderEmail: 'notificaciones@servasmar.cl',
          replyTo: 'calidad@servasmar.cl',
          apiBaseUrl: 'https://api.servasmar.cl/communications/send',
          apiKeyHint: 'configurado-en-servidor',
        },
      });
    }

    const normalizedNotifications = this.normalizeNotifications(settings.notifications);
    const normalizedCommunicationSettings = this.normalizeCommunicationSettings(
      settings.communicationSettings
    );
    let shouldSave = false;

    if (JSON.stringify(settings.notifications) !== JSON.stringify(normalizedNotifications)) {
      settings.notifications = normalizedNotifications;
      settings.markModified('notifications');
      shouldSave = true;
    }

    if (
      JSON.stringify(settings.communicationSettings) !==
      JSON.stringify(normalizedCommunicationSettings)
    ) {
      settings.communicationSettings = normalizedCommunicationSettings;
      settings.markModified('communicationSettings');
      shouldSave = true;
    }

    if (shouldSave) {
      await settings.save();
    }

    return settings;
  }

  private normalizeNotifications(
    notifications: Partial<SettingsEntity['notifications']> | undefined
  ): SettingsEntity['notifications'] {
    return {
      email: {
        enabled: notifications?.email?.enabled ?? true,
        taskReminders: notifications?.email?.taskReminders ?? true,
        auditReminders: notifications?.email?.auditReminders ?? true,
        documentUpdates: notifications?.email?.documentUpdates ?? true,
      },
      inApp: {
        enabled: notifications?.inApp?.enabled ?? true,
        taskReminders: notifications?.inApp?.taskReminders ?? true,
        auditReminders: notifications?.inApp?.auditReminders ?? true,
        documentUpdates: notifications?.inApp?.documentUpdates ?? true,
      },
      desktop: {
        enabled: notifications?.desktop?.enabled ?? true,
        chatMessages: notifications?.desktop?.chatMessages ?? true,
        connectionAlerts: notifications?.desktop?.connectionAlerts ?? true,
      },
    };
  }

  private normalizeCommunicationSettings(
    communicationSettings: Partial<SettingsEntity['communicationSettings']> | undefined
  ): SettingsEntity['communicationSettings'] {
    return {
      enabled: communicationSettings?.enabled ?? true,
      providerType: communicationSettings?.providerType ?? 'custom',
      providerName: communicationSettings?.providerName ?? 'Proveedor SMTP',
      senderName: communicationSettings?.senderName ?? 'Sistema ISO',
      senderEmail: communicationSettings?.senderEmail ?? 'notificaciones@servasmar.cl',
      replyTo: communicationSettings?.replyTo ?? 'calidad@servasmar.cl',
      apiBaseUrl:
        communicationSettings?.apiBaseUrl ?? 'https://api.servasmar.cl/communications/send',
      apiKeyHint: communicationSettings?.apiKeyHint ?? 'configurado-en-servidor',
    };
  }

  private async seedIfEmpty() {
    const [documentCount, taskCount, auditCount, chatThreadCount] = await Promise.all([
      this.documentModel.countDocuments(),
      this.taskModel.countDocuments(),
      this.auditModel.countDocuments(),
      this.chatThreadModel.countDocuments(),
    ]);

    await this.getSettingsDocument();
    await this.seedEmailTemplatesIfEmpty();

    if (documentCount === 0) {
      await this.documentModel.insertMany([
        {
          title: 'Manual de Calidad',
          topic: 'Gobierno del sistema',
          fileName: 'manual-calidad.pdf',
          mimeType: 'application/pdf',
          type: 'manual',
          format: 'PDF',
          standard: 'ISO9001',
          version: '2.1',
          status: 'active',
          url: 'https://iso.servasmar.cl/documents/manual-calidad.pdf',
          versionHistory: [
            {
              id: this.makeId('doc-version'),
              version: '2.1',
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              author: 'Administrador ISO',
              notes: 'Ajuste de politica y alcance.',
            },
          ],
          auditTrail: [
            {
              id: this.makeId('doc-audit'),
              action: 'created',
              date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              author: 'Administrador ISO',
              details: 'Documento incorporado al sistema',
            },
          ],
        },
        {
          title: 'Procedimiento de Auditoria Interna',
          topic: 'Control documental',
          fileName: 'auditoria-interna.pdf',
          mimeType: 'application/pdf',
          type: 'procedure',
          format: 'PDF',
          standard: 'ISO19011',
          version: '1.4',
          status: 'active',
          url: 'https://iso.servasmar.cl/documents/auditoria-interna.pdf',
          versionHistory: [
            {
              id: this.makeId('doc-version'),
              version: '1.4',
              date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
              author: 'Marcela Castro',
              notes: 'Actualizacion de responsables y alcance.',
            },
          ],
          auditTrail: [
            {
              id: this.makeId('doc-audit'),
              action: 'created',
              date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
              author: 'Administrador ISO',
              details: 'Documento creado en la base documental',
            },
          ],
        },
        {
          title: 'Registro de Acciones Correctivas',
          topic: 'Seguridad operacional',
          fileName: 'acciones-correctivas.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          type: 'record',
          format: 'XLSX',
          standard: 'ISO45001',
          version: '3.0',
          status: 'draft',
          url: 'https://iso.servasmar.cl/documents/acciones-correctivas.xlsx',
          versionHistory: [
            {
              id: this.makeId('doc-version'),
              version: '3.0',
              date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              author: 'Pedro Salinas',
              notes: 'Borrador preparado para revision final.',
            },
          ],
          auditTrail: [
            {
              id: this.makeId('doc-audit'),
              action: 'created',
              date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
              author: 'Pedro Salinas',
              details: 'Registro creado para seguimiento de acciones.',
            },
          ],
        },
      ].map((document) => ({
        ...document,
        standard:
          document.standard === 'ISO19011' ? 'ISO9001' : (document.standard as Standard),
      })));
    }

    if (taskCount === 0) {
      await this.taskModel.insertMany([
        {
          title: 'Actualizar matriz de riesgos',
          description: 'Revisar criticidad de hallazgos del ultimo trimestre.',
          assignedTo: 'Ana Torres',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: 'in-progress',
          priority: 'high',
          standard: 'ISO45001',
          relatedDocuments: [],
        },
        {
          title: 'Cerrar no conformidad NC-12',
          description: 'Validar evidencia y emitir cierre formal.',
          assignedTo: 'Luis Herrera',
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'overdue',
          priority: 'high',
          standard: 'ISO9001',
          relatedDocuments: [],
        },
        {
          title: 'Capacitacion en control documental',
          description: 'Ejecutar sesion para lideres de proceso.',
          assignedTo: 'Maria Soto',
          dueDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
          status: 'pending',
          priority: 'medium',
          standard: 'ISO14001',
          relatedDocuments: [],
        },
      ]);
    }

    if (auditCount === 0) {
      await this.auditModel.insertMany([
        {
          type: 'internal',
          standard: 'ISO9001',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'planned',
          findings: [
            {
              id: 'finding-1',
              type: 'observation',
              description: 'Formalizar seguimiento de indicadores de proceso.',
              status: 'open',
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              assignedTo: 'Carlos Ruiz',
            },
          ],
        },
        {
          type: 'external',
          standard: 'ISO14001',
          date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          status: 'planned',
          findings: [
            {
              id: 'finding-2',
              type: 'opportunity',
              description: 'Mejorar trazabilidad de residuos peligrosos.',
              status: 'in-progress',
              dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
              assignedTo: 'Paula Diaz',
            },
          ],
        },
      ]);
    }

    if (chatThreadCount === 0) {
      await this.chatThreadModel.insertMany([
        {
          participantIds: ['user-1', 'user-2'],
          updatedAt: new Date(),
          messages: [
            {
              id: 'msg-1',
              authorId: 'user-1',
              content:
                'Marcela, por favor revisa las tareas que vencen esta semana antes del comite.',
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
              readBy: ['user-1', 'user-2'],
            },
            {
              id: 'msg-2',
              authorId: 'user-2',
              content: 'Perfecto, hoy cierro la revision y dejo comunicado listo.',
              createdAt: new Date(),
              readBy: ['user-1', 'user-2'],
            },
          ],
        },
        {
          participantIds: ['user-1', 'user-3'],
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          messages: [
            {
              id: 'msg-3',
              authorId: 'user-3',
              content: 'Ya tengo la evidencia del hallazgo NC-12 para seguimiento.',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              readBy: ['user-1', 'user-3'],
            },
          ],
        },
      ]);
    }
  }

  private async seedEmailTemplatesIfEmpty() {
    const templateCount = await this.emailTemplateModel.countDocuments();

    if (templateCount === 0) {
      await this.emailTemplateModel.create({
        name: 'Recordatorio de tareas por vencer',
        subject: 'Acciones por vencer en {{daysAhead}} dias - {{companyName}}',
        content:
          '<h2>Hola {{userName}}</h2><p>Tienes <strong>{{taskCount}}</strong> tarea(s) por vencer.</p><p>{{dueSummary}}</p><div>{{taskTable}}</div><p>Por favor actualiza su estado antes del cierre del periodo.</p>',
      });
    }
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

  private serializeDocument(document: any) {
    return {
      id: String(document._id),
      title: document.title,
      fileName: document.fileName ?? undefined,
      mimeType: document.mimeType ?? undefined,
      topic: document.topic ?? 'General',
      type: document.type,
      format: document.format ?? 'TXT',
      standard: document.standard,
      version: document.version,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      status: document.status,
      url: document.url,
      versionHistory: (document.versionHistory ?? []).map((entry: any) => ({
        id: entry.id,
        version: entry.version,
        date: entry.date,
        author: entry.author,
        notes: entry.notes,
      })),
      auditTrail: (document.auditTrail ?? []).map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        date: entry.date,
        author: entry.author,
        details: entry.details,
      })),
    };
  }

  private serializeDocumentSummary(document: any) {
    const serialized = this.serializeDocument(document);
    return {
      ...serialized,
      url: undefined,
    };
  }

  private makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private serializeEmailTemplate(template: {
    _id?: unknown;
    id?: string;
    name: string;
    subject: string;
    content: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  }) {
    return {
      id: template.id ?? String(template._id),
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

  private serializeTask(task: any) {
    return {
      id: String(task._id),
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      standard: task.standard,
      relatedDocuments: task.relatedDocuments ?? [],
    };
  }

  private serializeAudit(audit: any) {
    return {
      id: String(audit._id),
      type: audit.type,
      standard: audit.standard,
      date: audit.date,
      status: audit.status,
      findings: (audit.findings ?? []).map((finding: Finding) => ({
        id: finding.id,
        type: finding.type,
        description: finding.description,
        status: finding.status,
        dueDate: finding.dueDate,
        assignedTo: finding.assignedTo,
      })),
    };
  }

  private serializeChatThread(thread: any) {
    return {
      id: String(thread._id),
      participantIds: thread.participantIds ?? [],
      updatedAt: thread.updatedAt,
      messages: (thread.messages ?? []).map((message: any) => ({
        id: message.id,
        authorId: message.authorId,
        content: message.content,
        createdAt: message.createdAt,
        readBy: message.readBy ?? [],
      })),
    };
  }

  private buildAlerts(tasks: any[], audits: any[]) {
    const now = Date.now();
    const alerts = [
      ...tasks
        .filter((task) => task.status === 'overdue')
        .map((task) => ({
          id: `task-${String(task._id)}`,
          title: `Tarea vencida: ${task.title}`,
          description: `${task.assignedTo} debe atender esta tarea inmediatamente.`,
          type: 'task' as const,
          priority: 'high' as const,
          date: task.dueDate,
          relatedId: String(task._id),
        })),
      ...audits
        .filter((audit) => {
          const distance = new Date(audit.date).getTime() - now;
          return distance > 0 && distance <= 14 * 24 * 60 * 60 * 1000;
        })
        .map((audit) => ({
          id: `audit-${String(audit._id)}`,
          title: `Auditoria proxima: ${audit.type} ${audit.standard}`,
          description: 'Revisa plan, alcance y evidencias antes de la fecha comprometida.',
          type: 'audit' as const,
          priority: 'medium' as const,
          date: audit.date,
          relatedId: String(audit._id),
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
    const complianceRate = tasks.length
      ? Math.round((completedTasks / tasks.length) * 100)
      : 100;

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

  private assertThreadParticipant(participantIds: string[] | undefined, userId: string) {
    if (!(participantIds ?? []).includes(userId)) {
      throw new ForbiddenException('You are not allowed to access this conversation');
    }
  }
}
