import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, Finding } from './schemas/audit.schema';
import { DocumentEntity } from './schemas/document.schema';
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
    @InjectModel(SettingsEntity.name)
    private readonly settingsModel: Model<SettingsEntity>
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async getDocuments() {
    const documents = await this.documentModel.find().sort({ updatedAt: -1 }).lean();
    return documents.map((document) => this.serializeDocument(document));
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
    const [documents, tasks, audits, settings] = await Promise.all([
      this.documentModel.find().sort({ updatedAt: -1 }).lean(),
      this.taskModel.find().sort({ dueDate: 1 }).lean(),
      this.auditModel.find().sort({ date: 1 }).lean(),
      this.getSettingsDocument(),
    ]);

    const alerts = this.buildAlerts(tasks, audits);
    const dashboard = this.buildDashboard(documents, tasks, audits);

    return {
      dashboard,
      documents: documents.map((document) => this.serializeDocument(document)),
      tasks: tasks.map((task) => this.serializeTask(task)),
      audits: audits.map((audit) => this.serializeAudit(audit)),
      alerts,
      settings: {
        companyName: settings.companyName,
        standards: settings.standards,
        defaultLanguage: settings.defaultLanguage,
        timezone: settings.timezone,
      },
      notifications: settings.notifications,
    };
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
          author: 'Administrador Demo',
          notes: `Carga inicial del archivo ${payload.fileName}`,
        },
      ],
      auditTrail: [
        {
          id: this.makeId('doc-audit'),
          action: 'created',
          date: now,
          author: 'Administrador Demo',
          details: `Documento creado con formato ${payload.format}`,
        },
      ],
    });

    return this.serializeDocument(document.toObject());
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
        author: 'Administrador Demo',
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
          author: 'Administrador Demo',
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
        author: 'Administrador Demo',
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
    current.notifications = notifications;
    await current.save();

    return {
      settings,
      notifications,
    };
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
        },
      });
    }

    return settings;
  }

  private async seedIfEmpty() {
    const [documentCount, taskCount, auditCount] = await Promise.all([
      this.documentModel.countDocuments(),
      this.taskModel.countDocuments(),
      this.auditModel.countDocuments(),
    ]);

    await this.getSettingsDocument();

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
          url: 'https://example.local/documents/manual-calidad.pdf',
          versionHistory: [
            {
              id: this.makeId('doc-version'),
              version: '2.1',
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              author: 'Administrador Demo',
              notes: 'Ajuste de politica y alcance.',
            },
          ],
          auditTrail: [
            {
              id: this.makeId('doc-audit'),
              action: 'created',
              date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              author: 'Administrador Demo',
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
          url: 'https://example.local/documents/auditoria-interna.pdf',
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
              author: 'Administrador Demo',
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
          url: 'https://example.local/documents/acciones-correctivas.xlsx',
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

  private makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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
}
