import type {
  Audit,
  ChatThread,
  CommunicationSettings,
  DashboardOverview,
  Document,
  DocumentAuditEntry,
  DocumentVersionEntry,
  EmailCampaign,
  EmailTemplate,
  NotificationSettings,
  Settings,
  Task,
  UserAccount,
} from '../types/iso';

type PersistedDocument = Omit<Document, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
  versionHistory: Array<Omit<DocumentVersionEntry, 'date'> & { date: string }>;
  auditTrail: Array<Omit<DocumentAuditEntry, 'date'> & { date: string }>;
};

type PersistedTask = Omit<Task, 'dueDate'> & {
  dueDate: string;
};

type PersistedAudit = Omit<Audit, 'date' | 'findings'> & {
  date: string;
  findings: Array<
    Omit<Audit['findings'][number], 'dueDate'> & {
      dueDate: string;
    }
  >;
};

type PersistedChatThread = Omit<ChatThread, 'updatedAt' | 'messages'> & {
  updatedAt: string;
  messages: Array<
    Omit<ChatThread['messages'][number], 'createdAt'> & {
      createdAt: string;
    }
  >;
};

type PersistedEmailTemplate = Omit<EmailTemplate, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

type PersistedEmailCampaign = Omit<EmailCampaign, 'createdAt' | 'sentAt'> & {
  createdAt: string;
  sentAt: string | null;
};

export interface PersistedISOData {
  documents: PersistedDocument[];
  tasks: PersistedTask[];
  audits: PersistedAudit[];
  settings: Settings;
  notifications: NotificationSettings;
  users: PersistedUser[];
  chatThreads: PersistedChatThread[];
  emailTemplates: PersistedEmailTemplate[];
  emailCampaigns: PersistedEmailCampaign[];
  communicationSettings: CommunicationSettings;
}

type PersistedUser = Omit<UserAccount, 'createdAt'> & {
  createdAt: string;
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const buildVersionEntry = (
  id: string,
  version: string,
  days: number,
  author: string,
  notes: string
) => ({
  id,
  version,
  date: daysAgo(days),
  author,
  notes,
});

const buildAuditEntry = (
  id: string,
  action: 'created' | 'updated' | 'viewed',
  days: number,
  author: string,
  details: string
) => ({
  id,
  action,
  date: daysAgo(days),
  author,
  details,
});

export const createSeedData = (): PersistedISOData => ({
  documents: [
    {
      id: 'doc-1',
      title: 'Manual Integrado de Gestion',
      fileName: 'manual-integrado-de-gestion.pdf',
      mimeType: 'application/pdf',
      topic: 'Gobierno del sistema',
      type: 'manual',
      format: 'PDF',
      standard: 'ISO9001',
      version: '3.2',
      createdAt: daysAgo(65),
      updatedAt: daysAgo(2),
      status: 'active',
      url: 'data:text/plain;charset=utf-8,Manual%20Integrado%20de%20Gestion',
      versionHistory: [
        buildVersionEntry('ver-1', '1.0', 65, 'Administrador ISO', 'Creacion inicial del manual'),
        buildVersionEntry('ver-2', '2.0', 30, 'Marcela Castro', 'Actualizacion del mapa de procesos'),
        buildVersionEntry('ver-3', '3.2', 2, 'Administrador ISO', 'Ajuste de alcance y politica'),
      ],
      auditTrail: [
        buildAuditEntry('audit-doc-1', 'created', 65, 'Administrador ISO', 'Documento creado en el repositorio'),
        buildAuditEntry('audit-doc-2', 'updated', 30, 'Marcela Castro', 'Se agregan cambios de procesos'),
        buildAuditEntry('audit-doc-3', 'viewed', 1, 'Pedro Salinas', 'Consulta para auditoria interna'),
      ],
    },
    {
      id: 'doc-2',
      title: 'Procedimiento de Control Documental',
      fileName: 'procedimiento-control-documental.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      topic: 'Control documental',
      type: 'procedure',
      format: 'DOCX',
      standard: 'ISO9001',
      version: '2.4',
      createdAt: daysAgo(34),
      updatedAt: daysAgo(6),
      status: 'active',
      url: 'data:text/plain;charset=utf-8,Procedimiento%20de%20Control%20Documental',
      versionHistory: [
        buildVersionEntry('ver-4', '1.0', 34, 'Administrador ISO', 'Publicacion del procedimiento'),
        buildVersionEntry('ver-5', '2.4', 6, 'Marcela Castro', 'Mejora de codificacion y distribución'),
      ],
      auditTrail: [
        buildAuditEntry('audit-doc-4', 'created', 34, 'Administrador ISO', 'Alta del procedimiento'),
        buildAuditEntry('audit-doc-5', 'updated', 6, 'Marcela Castro', 'Actualizacion de responsables'),
      ],
    },
    {
      id: 'doc-3',
      title: 'Registro de Inspeccion de Seguridad',
      fileName: 'registro-inspeccion-seguridad.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      topic: 'Seguridad operacional',
      type: 'record',
      format: 'XLSX',
      standard: 'ISO45001',
      version: '1.3',
      createdAt: daysAgo(17),
      updatedAt: daysAgo(1),
      status: 'draft',
      url: 'data:text/plain;charset=utf-8,Registro%20de%20Inspeccion%20de%20Seguridad',
      versionHistory: [
        buildVersionEntry('ver-6', '1.0', 17, 'Pedro Salinas', 'Creacion del registro'),
        buildVersionEntry('ver-7', '1.3', 1, 'Pedro Salinas', 'Inclusion de checklist ampliado'),
      ],
      auditTrail: [
        buildAuditEntry('audit-doc-6', 'created', 17, 'Pedro Salinas', 'Registro creado'),
        buildAuditEntry('audit-doc-7', 'updated', 1, 'Pedro Salinas', 'Borrador actualizado previo a aprobacion'),
      ],
    },
    {
      id: 'doc-4',
      title: 'Matriz de Aspectos Ambientales',
      fileName: 'matriz-aspectos-ambientales.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      topic: 'Gestion ambiental',
      type: 'record',
      format: 'XLSX',
      standard: 'ISO14001',
      version: '5.0',
      createdAt: daysAgo(88),
      updatedAt: daysAgo(10),
      status: 'active',
      url: 'data:text/plain;charset=utf-8,Matriz%20de%20Aspectos%20Ambientales',
      versionHistory: [
        buildVersionEntry('ver-8', '4.0', 60, 'Marcela Castro', 'Revision de impactos'),
        buildVersionEntry('ver-9', '5.0', 10, 'Administrador ISO', 'Actualizacion de controles ambientales'),
      ],
      auditTrail: [
        buildAuditEntry('audit-doc-8', 'created', 88, 'Administrador ISO', 'Matriz creada'),
        buildAuditEntry('audit-doc-9', 'updated', 10, 'Administrador ISO', 'Se actualizan criterios de evaluación'),
      ],
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Actualizar indicadores de proceso',
      description: 'Consolidar el tablero mensual y validar desviaciones con cada lider.',
      assignedTo: 'Marcela Castro',
      dueDate: daysFromNow(3),
      status: 'in-progress',
      priority: 'high',
      standard: 'ISO9001',
      relatedDocuments: ['doc-1', 'doc-2'],
    },
    {
      id: 'task-2',
      title: 'Cerrar hallazgo NC-12',
      description: 'Adjuntar evidencia y emitir cierre formal con trazabilidad.',
      assignedTo: 'Pedro Salinas',
      dueDate: daysAgo(2),
      status: 'overdue',
      priority: 'high',
      standard: 'ISO45001',
      relatedDocuments: ['doc-3'],
    },
    {
      id: 'task-3',
      title: 'Capacitacion de control operacional',
      description: 'Ejecutar sesion de refuerzo con jefaturas y registro de asistencia.',
      assignedTo: 'Administrador ISO',
      dueDate: daysFromNow(8),
      status: 'pending',
      priority: 'medium',
      standard: 'ISO14001',
      relatedDocuments: ['doc-4'],
    },
    {
      id: 'task-4',
      title: 'Revisar plan anual de auditorias',
      description: 'Confirmar fechas, responsables y procesos incluidos en el alcance.',
      assignedTo: 'Marcela Castro',
      dueDate: daysFromNow(1),
      status: 'pending',
      priority: 'low',
      standard: 'ISO9001',
      relatedDocuments: ['doc-2'],
    },
  ],
  audits: [
    {
      id: 'audit-1',
      type: 'internal',
      standard: 'ISO9001',
      date: daysFromNow(5),
      status: 'planned',
      findings: [
        {
          id: 'finding-1',
          type: 'observation',
          description: 'Formalizar la frecuencia de revision de indicadores.',
          status: 'open',
          dueDate: daysFromNow(16),
          assignedTo: 'Carlos Ruiz',
        },
      ],
    },
    {
      id: 'audit-2',
      type: 'external',
      standard: 'ISO14001',
      date: daysFromNow(15),
      status: 'planned',
      findings: [
        {
          id: 'finding-2',
          type: 'opportunity',
          description: 'Mejorar el registro de gestion de residuos especiales.',
          status: 'in-progress',
          dueDate: daysFromNow(23),
          assignedTo: 'Paula Diaz',
        },
      ],
    },
  ],
  settings: {
    companyName: 'Sistema ISO',
    standards: {
      ISO9001: true,
      ISO14001: true,
      ISO45001: true,
    },
    defaultLanguage: 'es',
    timezone: 'America/Santiago',
  },
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
  users: [
    {
      id: 'user-1',
      name: 'Administrador ISO',
      email: 'admin@servasmar.cl',
      role: 'admin',
      password: 'Admin123!',
      active: true,
      createdAt: daysAgo(120),
    },
    {
      id: 'user-2',
      name: 'Marcela Castro',
      email: 'marcela@servasmar.cl',
      role: 'manager',
      password: 'Marcela123!',
      active: true,
      createdAt: daysAgo(90),
    },
    {
      id: 'user-3',
      name: 'Pedro Salinas',
      email: 'pedro@servasmar.cl',
      role: 'auditor',
      password: 'Pedro123!',
      active: true,
      createdAt: daysAgo(60),
    },
  ],
  chatThreads: [
    {
      id: 'thread-1',
      participantIds: ['user-1', 'user-2'],
      updatedAt: daysAgo(0),
      messages: [
        {
          id: 'msg-1',
          authorId: 'user-1',
          content: 'Marcela, por favor revisa las tareas que vencen esta semana antes del comite.',
          createdAt: daysAgo(1),
          readBy: ['user-1', 'user-2'],
        },
        {
          id: 'msg-2',
          authorId: 'user-2',
          content: 'Perfecto, hoy cierro la revision y dejo comunicado listo.',
          createdAt: daysAgo(0),
          readBy: ['user-1', 'user-2'],
        },
      ],
    },
    {
      id: 'thread-2',
      participantIds: ['user-1', 'user-3'],
      updatedAt: daysAgo(2),
      messages: [
        {
          id: 'msg-3',
          authorId: 'user-3',
          content: 'Ya tengo la evidencia del hallazgo NC-12 para seguimiento.',
          createdAt: daysAgo(2),
          readBy: ['user-1', 'user-3'],
        },
      ],
    },
  ],
  emailTemplates: [
    {
      id: 'template-1',
      name: 'Recordatorio de tareas por vencer',
      subject: 'Acciones por vencer en {{daysAhead}} dias - {{companyName}}',
      content:
        '<h2>Hola {{userName}}</h2><p>Tienes <strong>{{taskCount}}</strong> tarea(s) por vencer.</p><p>{{dueSummary}}</p><div>{{taskTable}}</div><p>Por favor actualiza su estado antes del cierre del periodo.</p>',
      createdAt: daysAgo(20),
      updatedAt: daysAgo(3),
    },
  ],
  emailCampaigns: [
    {
      id: 'campaign-1',
      name: 'Seguimiento semanal de vencimientos',
      templateId: 'template-1',
      templateName: 'Recordatorio de tareas por vencer',
      subject: 'Acciones por vencer en 7 dias - Sistema ISO',
      body: 'Comunicado generado para usuarios con tareas cercanas.',
      recipientIds: ['user-2', 'user-3'],
      recipientCount: 2,
      taskIds: ['task-1', 'task-2', 'task-4'],
      taskCount: 3,
      daysAhead: 7,
      status: 'sent',
      createdAt: daysAgo(4),
      sentAt: daysAgo(4),
    },
  ],
  communicationSettings: {
    enabled: true,
    providerName: 'Proveedor SMTP',
    senderName: 'Sistema ISO',
    senderEmail: 'notificaciones@servasmar.cl',
    replyTo: 'calidad@servasmar.cl',
    apiBaseUrl: 'https://api.servasmar.cl/communications/send',
    apiKeyHint: 'configurado-en-servidor',
  },
});

export const buildDashboard = (
  documents: Document[],
  tasks: Task[],
  audits: Audit[]
): DashboardOverview => {
  const activeDocuments = documents.filter((item) => item.status === 'active').length;
  const pendingTasks = tasks.filter((item) => item.status !== 'completed').length;
  const upcomingAudits = audits.filter((item) => item.date.getTime() > Date.now()).length;
  const openFindings = audits.reduce(
    (total, audit) =>
      total + audit.findings.filter((finding) => finding.status !== 'closed').length,
    0
  );
  const completedTasks = tasks.filter((item) => item.status === 'completed').length;
  const complianceRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 100;

  return {
    stats: [
      { label: 'Documentos activos', value: activeDocuments, trend: 'Controlados y vigentes', tone: 'primary' },
      { label: 'Tareas pendientes', value: pendingTasks, trend: 'Pendientes por ejecutar', tone: 'warning' },
      { label: 'Auditorias proximas', value: upcomingAudits, trend: 'Programadas en calendario', tone: 'success' },
      { label: 'Hallazgos abiertos', value: openFindings, trend: 'Hallazgos en seguimiento', tone: 'danger' },
    ],
    complianceRate,
    overdueTasks: tasks.filter((item) => item.status === 'overdue').length,
    upcomingAudits,
    recentActivity: [
      {
        id: 'activity-1',
        title: 'Ultima actualizacion documental',
        description: 'El manual integrado fue revisado y se notifico a los responsables.',
        timestamp: 'Hace 2 horas',
      },
      {
        id: 'activity-2',
        title: 'Seguimiento de accion correctiva',
        description: 'Se agrego avance a la no conformidad NC-12 y sigue abierta.',
        timestamp: 'Hace 5 horas',
      },
      {
        id: 'activity-3',
        title: 'Auditoria agendada',
        description: 'Se confirmo la auditoria interna de calidad con su alcance.',
        timestamp: 'Ayer',
      },
    ],
  };
};
