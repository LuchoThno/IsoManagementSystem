import type {
  Alert,
  Audit,
  ChatThread,
  CommunicationSettings,
  Document,
  DocumentAuditEntry,
  DocumentVersionEntry,
  EmailCampaign,
  EmailTemplate,
  ISOBootstrapData,
  NotificationSettings,
  Settings,
  StandardSummary,
  Task,
  UserAccount,
  UserRole,
} from '../types/iso';
import { buildDashboard, createSeedData, type PersistedISOData } from './demoData';

const STORAGE_KEY = 'iso-manager-local-v1';
const SESSION_KEY = 'iso-manager-session-v1';

const toDocument = (document: PersistedISOData['documents'][number]): Document => ({
  ...document,
  fileName: document.fileName ?? undefined,
  mimeType: document.mimeType ?? undefined,
  topic: document.topic ?? 'General',
  format: document.format ?? 'TXT',
  createdAt: new Date(document.createdAt),
  updatedAt: new Date(document.updatedAt),
  versionHistory: (document.versionHistory ?? []).map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  })),
  auditTrail: (document.auditTrail ?? []).map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  })),
});

const toTask = (task: PersistedISOData['tasks'][number]): Task => ({
  ...task,
  dueDate: new Date(task.dueDate),
});

const toAudit = (audit: PersistedISOData['audits'][number]): Audit => ({
  ...audit,
  date: new Date(audit.date),
  findings: audit.findings.map((finding) => ({
    ...finding,
    dueDate: new Date(finding.dueDate),
  })),
});

const toUser = (user: PersistedISOData['users'][number]): UserAccount => ({
  ...user,
  createdAt: new Date(user.createdAt),
});

const toChatThread = (thread: PersistedISOData['chatThreads'][number]): ChatThread => ({
  ...thread,
  updatedAt: new Date(thread.updatedAt),
  messages: thread.messages.map((message) => ({
    ...message,
    createdAt: new Date(message.createdAt),
  })),
});

const toEmailTemplate = (
  template: PersistedISOData['emailTemplates'][number]
): EmailTemplate => ({
  ...template,
  createdAt: new Date(template.createdAt),
  updatedAt: new Date(template.updatedAt),
});

const toEmailCampaign = (
  campaign: PersistedISOData['emailCampaigns'][number]
): EmailCampaign => ({
  ...campaign,
  createdAt: new Date(campaign.createdAt),
  sentAt: campaign.sentAt ? new Date(campaign.sentAt) : null,
});

const toStandard = (standard: PersistedISOData['standards'][number]): StandardSummary => ({
  ...standard,
  publishedAt: standard.publishedAt ? new Date(standard.publishedAt) : null,
  createdAt: standard.createdAt ? new Date(standard.createdAt) : undefined,
  updatedAt: standard.updatedAt ? new Date(standard.updatedAt) : undefined,
});

const toPersistedDocument = (document: Document): PersistedISOData['documents'][number] => ({
  ...document,
  createdAt: document.createdAt.toISOString(),
  updatedAt: document.updatedAt.toISOString(),
  versionHistory: document.versionHistory.map((entry) => ({
    ...entry,
    date: entry.date.toISOString(),
  })),
  auditTrail: document.auditTrail.map((entry) => ({
    ...entry,
    date: entry.date.toISOString(),
  })),
});

const toPersistedTask = (task: Task): PersistedISOData['tasks'][number] => ({
  ...task,
  dueDate: task.dueDate.toISOString(),
});

const toPersistedAudit = (audit: Audit): PersistedISOData['audits'][number] => ({
  ...audit,
  date: audit.date.toISOString(),
  findings: audit.findings.map((finding) => ({
    ...finding,
    dueDate: finding.dueDate.toISOString(),
  })),
});

const toPersistedUser = (user: UserAccount): PersistedISOData['users'][number] => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
});

const toPersistedChatThread = (
  thread: ChatThread
): PersistedISOData['chatThreads'][number] => ({
  ...thread,
  updatedAt: thread.updatedAt.toISOString(),
  messages: thread.messages.map((message) => ({
    ...message,
    createdAt: message.createdAt.toISOString(),
  })),
});

const toPersistedEmailTemplate = (
  template: EmailTemplate
): PersistedISOData['emailTemplates'][number] => ({
  ...template,
  createdAt: template.createdAt.toISOString(),
  updatedAt: template.updatedAt.toISOString(),
});

const toPersistedEmailCampaign = (
  campaign: EmailCampaign
): PersistedISOData['emailCampaigns'][number] => ({
  ...campaign,
  createdAt: campaign.createdAt.toISOString(),
  sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
});

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const cloneSeed = (): PersistedISOData => structuredClone(createSeedData());

const mergeWithSeed = (rawData: Partial<PersistedISOData>): PersistedISOData => {
  const seed = cloneSeed();

  return {
    ...seed,
    ...rawData,
    documents: Array.isArray(rawData.documents) ? rawData.documents : seed.documents,
    tasks: Array.isArray(rawData.tasks) ? rawData.tasks : seed.tasks,
    audits: Array.isArray(rawData.audits) ? rawData.audits : seed.audits,
    standards: Array.isArray(rawData.standards) ? rawData.standards : seed.standards,
    evidences: Array.isArray(rawData.evidences) ? rawData.evidences : seed.evidences,
    contracts: Array.isArray(rawData.contracts) ? rawData.contracts : seed.contracts,
    correctiveActions: Array.isArray(rawData.correctiveActions)
      ? rawData.correctiveActions
      : seed.correctiveActions,
    users: Array.isArray(rawData.users) ? rawData.users : seed.users,
    chatThreads: Array.isArray(rawData.chatThreads) ? rawData.chatThreads : seed.chatThreads,
    emailTemplates: Array.isArray(rawData.emailTemplates)
      ? rawData.emailTemplates
      : seed.emailTemplates,
    emailCampaigns: Array.isArray(rawData.emailCampaigns)
      ? rawData.emailCampaigns
      : seed.emailCampaigns,
    settings: rawData.settings ?? seed.settings,
    notifications: {
      ...seed.notifications,
      ...rawData.notifications,
      email: {
        ...seed.notifications.email,
        ...rawData.notifications?.email,
      },
      inApp: {
        ...seed.notifications.inApp,
        ...rawData.notifications?.inApp,
      },
      desktop: {
        ...seed.notifications.desktop,
        ...rawData.notifications?.desktop,
      },
    },
    communicationSettings: {
      ...seed.communicationSettings,
      ...rawData.communicationSettings,
    },
  };
};

const getCurrentActorName = (data: PersistedISOData) => {
  const sessionUserId = window.localStorage.getItem(SESSION_KEY);
  const user = (data.users ?? []).find((item) => item.id === sessionUserId);
  return user?.name ?? 'Sistema';
};

const buildDocumentVersionEntry = (
  version: string,
  author: string,
  notes: string
): DocumentVersionEntry => ({
  id: makeId('doc-version'),
  version,
  date: new Date(),
  author,
  notes,
});

const buildDocumentAuditEntry = (
  action: DocumentAuditEntry['action'],
  author: string,
  details: string
): DocumentAuditEntry => ({
  id: makeId('doc-audit'),
  action,
  date: new Date(),
  author,
  details,
});

const getStorage = (): PersistedISOData => {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const seed = cloneSeed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedISOData>;
    const merged = mergeWithSeed(parsed);
    saveStorage(merged);
    return merged;
  } catch {
    const seed = cloneSeed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
};

const saveStorage = (data: PersistedISOData) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const sanitizeUser = (user: UserAccount): UserAccount => ({
  ...user,
  password: '',
});

const findRawUserById = (userId: string | null) => {
  if (!userId) return null;
  const data = getStorage();
  const user = (data.users ?? []).find((item) => item.id === userId);
  return user ? toUser(user) : null;
};

const setSession = (userId: string | null) => {
  if (userId) {
    window.localStorage.setItem(SESSION_KEY, userId);
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
};

const buildAlerts = (tasks: Task[], audits: Audit[]): Alert[] => {
  const upcomingAuditLimit = 14 * 24 * 60 * 60 * 1000;

  const alerts: Alert[] = [
    ...tasks
      .filter((task) => task.status === 'overdue')
      .map((task) => ({
        id: `alert-${task.id}`,
        title: `Tarea vencida: ${task.title}`,
        description: `${task.assignedTo} debe cerrar esta accion lo antes posible.`,
        type: 'task' as const,
        priority: 'high' as const,
        date: task.dueDate,
        relatedId: task.id,
      })),
    ...audits
      .filter((audit) => audit.date.getTime() > Date.now())
      .filter((audit) => audit.date.getTime() - Date.now() <= upcomingAuditLimit)
      .map((audit) => ({
        id: `alert-${audit.id}`,
        title: `Auditoria cercana: ${audit.type} ${audit.standard}`,
        description: 'Prepara evidencias, agenda y responsables antes de la fecha comprometida.',
        type: 'audit' as const,
        priority: 'medium' as const,
        date: audit.date,
        relatedId: audit.id,
      })),
  ];

  return alerts.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const toBootstrap = (data: PersistedISOData): ISOBootstrapData => {
  const documents = data.documents.map(toDocument);
  const tasks = data.tasks.map(toTask);
  const audits = data.audits.map(toAudit);
  const standards = data.standards.map(toStandard);
  const users = data.users.map(toUser).map(sanitizeUser);
  const chatThreads = data.chatThreads.map(toChatThread);
  const emailTemplates = data.emailTemplates.map(toEmailTemplate);
  const emailCampaigns = data.emailCampaigns.map(toEmailCampaign);

  return {
    dashboard: buildDashboard(documents, tasks, audits),
    documents,
    tasks,
    audits,
    standards,
    alerts: buildAlerts(tasks, audits),
    settings: data.settings,
    notifications: data.notifications,
    users,
    chatThreads,
    emailTemplates,
    emailCampaigns,
    communicationSettings: data.communicationSettings,
  };
};

const renderTemplate = (
  template: EmailTemplate,
  context: Record<string, string | number>
) => {
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
};

export async function fetchBootstrap(): Promise<ISOBootstrapData> {
  return toBootstrap(getStorage());
}

export async function registerDocumentView(documentId: string): Promise<Document> {
  const data = getStorage();
  const index = data.documents.findIndex((document) => document.id === documentId);
  if (index < 0) throw new Error('Document not found');

  const current = toDocument(data.documents[index]);
  const actor = getCurrentActorName(data);
  const nextDocument: Document = {
    ...current,
    auditTrail: [
      ...current.auditTrail,
      buildDocumentAuditEntry('viewed', actor, 'Se consulto la vista del documento'),
    ],
  };

  data.documents[index] = toPersistedDocument(nextDocument);
  saveStorage(data);
  return nextDocument;
}

export async function createDocument(payload: {
  title: string;
  topic: string;
  type: Document['type'];
  format: Document['format'];
  standard: Document['standard'];
  version?: string;
  fileName: string;
  fileContentUrl: string;
  mimeType: string;
}): Promise<Document> {
  const data = getStorage();
  const now = new Date();
  const actor = getCurrentActorName(data);
  const version = payload.version?.trim() || '1.0';

  const document: Document = {
    id: makeId('doc'),
    title: payload.title,
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    topic: payload.topic,
    type: payload.type,
    format: payload.format,
    standard: payload.standard,
    version,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    url: payload.fileContentUrl,
    versionHistory: [
      buildDocumentVersionEntry(version, actor, `Carga inicial del archivo ${payload.fileName}`),
    ],
    auditTrail: [
      buildDocumentAuditEntry('created', actor, `Documento creado con formato ${payload.format}`),
    ],
  };

  data.documents.unshift(toPersistedDocument(document));
  saveStorage(data);
  return document;
}

export async function updateDocument(
  documentId: string,
  updates: Partial<
    Pick<Document, 'title' | 'topic' | 'type' | 'format' | 'standard' | 'version' | 'status'>
  >
): Promise<Document> {
  const data = getStorage();
  const index = data.documents.findIndex((document) => document.id === documentId);
  if (index < 0) throw new Error('Document not found');

  const current = toDocument(data.documents[index]);
  const actor = getCurrentActorName(data);
  const nextVersionHistory =
    updates.version && updates.version !== current.version
      ? [
          ...current.versionHistory,
          buildDocumentVersionEntry(
            updates.version,
            actor,
            `Cambio de version desde ${current.version}`
          ),
        ]
      : current.versionHistory;
  const nextAuditTrail = [
    ...current.auditTrail,
    buildDocumentAuditEntry(
      'updated',
      actor,
      `Se actualizo el documento${updates.version ? ` a la version ${updates.version}` : ''}`
    ),
  ];

  const nextDocument: Document = {
    ...current,
    ...updates,
    updatedAt: new Date(),
    versionHistory: nextVersionHistory,
    auditTrail: nextAuditTrail,
  };

  data.documents[index] = toPersistedDocument(nextDocument);
  saveStorage(data);
  return nextDocument;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const data = getStorage();
  data.documents = data.documents.filter((document) => document.id !== documentId);
  saveStorage(data);
}

export async function createTask(payload: Omit<Task, 'id'>): Promise<Task> {
  const data = getStorage();
  const task: Task = {
    ...payload,
    id: makeId('task'),
  };

  data.tasks.unshift(toPersistedTask(task));
  saveStorage(data);
  return task;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, 'id'>>
): Promise<Task> {
  const data = getStorage();
  const taskIndex = data.tasks.findIndex((task) => task.id === taskId);
  if (taskIndex < 0) throw new Error('Task not found');

  const current = toTask(data.tasks[taskIndex]);
  const nextTask: Task = {
    ...current,
    ...updates,
    dueDate: updates.dueDate ?? current.dueDate,
  };

  data.tasks[taskIndex] = toPersistedTask(nextTask);
  saveStorage(data);
  return nextTask;
}

export async function updateTaskStatus(taskId: string, status: Task['status']): Promise<Task> {
  return updateTask(taskId, { status });
}

export async function deleteTask(taskId: string): Promise<void> {
  const data = getStorage();
  data.tasks = data.tasks.filter((task) => task.id !== taskId);
  saveStorage(data);
}

export async function createAudit(payload: Omit<Audit, 'id'>): Promise<Audit> {
  const data = getStorage();
  const audit: Audit = {
    ...payload,
    id: makeId('audit'),
  };

  data.audits.unshift(toPersistedAudit(audit));
  saveStorage(data);
  return audit;
}

export async function updateAudit(
  auditId: string,
  updates: Partial<Omit<Audit, 'id'>>
): Promise<Audit> {
  const data = getStorage();
  const auditIndex = data.audits.findIndex((audit) => audit.id === auditId);
  if (auditIndex < 0) throw new Error('Audit not found');

  const current = toAudit(data.audits[auditIndex]);
  const nextAudit: Audit = {
    ...current,
    ...updates,
    date: updates.date ?? current.date,
    findings: updates.findings ?? current.findings,
  };

  data.audits[auditIndex] = toPersistedAudit(nextAudit);
  saveStorage(data);
  return nextAudit;
}

export async function updateAuditStatus(auditId: string, status: Audit['status']): Promise<Audit> {
  return updateAudit(auditId, { status });
}

export async function deleteAudit(auditId: string): Promise<void> {
  const data = getStorage();
  data.audits = data.audits.filter((audit) => audit.id !== auditId);
  saveStorage(data);
}

export async function updateSettings(payload: {
  settings: Settings;
  notifications: NotificationSettings;
}): Promise<{
  settings: Settings;
  notifications: NotificationSettings;
}> {
  const data = getStorage();
  data.settings = payload.settings;
  data.notifications = payload.notifications;
  saveStorage(data);
  return payload;
}

export async function listChatThreads(): Promise<ChatThread[]> {
  return getStorage().chatThreads.map(toChatThread);
}

export async function openDirectThread(participantIds: string[]): Promise<ChatThread> {
  const data = getStorage();
  const uniqueParticipants = Array.from(new Set(participantIds)).sort();
  const existing = data.chatThreads.find((thread) => {
    const threadParticipants = [...thread.participantIds].sort();
    return (
      threadParticipants.length === uniqueParticipants.length &&
      threadParticipants.every((participantId, index) => participantId === uniqueParticipants[index])
    );
  });

  if (existing) {
    return toChatThread(existing);
  }

  const now = new Date();
  const thread: ChatThread = {
    id: makeId('thread'),
    participantIds: uniqueParticipants,
    messages: [],
    updatedAt: now,
  };

  data.chatThreads.unshift(toPersistedChatThread(thread));
  saveStorage(data);
  return thread;
}

export async function sendChatMessage(
  threadId: string,
  authorId: string,
  content: string
): Promise<ChatThread> {
  const data = getStorage();
  const index = data.chatThreads.findIndex((thread) => thread.id === threadId);
  if (index < 0) throw new Error('Conversation not found');

  const current = toChatThread(data.chatThreads[index]);
  const now = new Date();
  const message = {
    id: makeId('msg'),
    authorId,
    content,
    createdAt: now,
    readBy: [authorId],
  };

  const nextThread: ChatThread = {
    ...current,
    messages: [...current.messages, message],
    updatedAt: now,
  };

  data.chatThreads[index] = toPersistedChatThread(nextThread);
  saveStorage(data);
  return nextThread;
}

export async function markThreadAsRead(threadId: string, userId: string): Promise<ChatThread> {
  const data = getStorage();
  const index = data.chatThreads.findIndex((thread) => thread.id === threadId);
  if (index < 0) throw new Error('Conversation not found');

  const current = toChatThread(data.chatThreads[index]);
  const nextThread: ChatThread = {
    ...current,
    messages: current.messages.map((message) =>
      message.readBy.includes(userId)
        ? message
        : { ...message, readBy: [...message.readBy, userId] }
    ),
  };

  data.chatThreads[index] = toPersistedChatThread(nextThread);
  saveStorage(data);
  return nextThread;
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  return getStorage().emailTemplates.map(toEmailTemplate);
}

export async function createEmailTemplate(payload: {
  name: string;
  subject: string;
  content: string;
}): Promise<EmailTemplate> {
  const data = getStorage();
  const now = new Date();
  const template: EmailTemplate = {
    id: makeId('template'),
    name: payload.name,
    subject: payload.subject,
    content: payload.content,
    createdAt: now,
    updatedAt: now,
  };

  data.emailTemplates.unshift(toPersistedEmailTemplate(template));
  saveStorage(data);
  return template;
}

export async function updateEmailTemplate(
  templateId: string,
  updates: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'content'>>
): Promise<EmailTemplate> {
  const data = getStorage();
  const index = data.emailTemplates.findIndex((template) => template.id === templateId);
  if (index < 0) throw new Error('Template not found');

  const current = toEmailTemplate(data.emailTemplates[index]);
  const nextTemplate: EmailTemplate = {
    ...current,
    ...updates,
    updatedAt: new Date(),
  };

  data.emailTemplates[index] = toPersistedEmailTemplate(nextTemplate);
  saveStorage(data);
  return nextTemplate;
}

export async function deleteEmailTemplate(templateId: string): Promise<void> {
  const data = getStorage();
  data.emailTemplates = data.emailTemplates.filter((template) => template.id !== templateId);
  saveStorage(data);
}

export async function updateCommunicationSettings(
  settings: CommunicationSettings
): Promise<CommunicationSettings> {
  const data = getStorage();
  data.communicationSettings = settings;
  saveStorage(data);
  return settings;
}

export async function sendBulkTaskReminderCampaign(payload: {
  name: string;
  templateId: string;
  daysAhead: number;
  recipientIds: string[];
  recipientNames?: string[];
  recipientEmails?: string[];
}): Promise<EmailCampaign> {
  const data = getStorage();
  const template = data.emailTemplates.map(toEmailTemplate).find((item) => item.id === payload.templateId);
  if (!template) throw new Error('Template not found');

  const users = data.users.map(toUser).filter((user) => payload.recipientIds.includes(user.id) && user.active);
  const tasks = data.tasks.map(toTask);
  const now = Date.now();
  const maxDate = now + payload.daysAhead * 24 * 60 * 60 * 1000;
  const matchingTasks = tasks.filter(
    (task) =>
      task.status !== 'completed' &&
      task.dueDate.getTime() >= now &&
      task.dueDate.getTime() <= maxDate &&
      users.some((user) => user.name === task.assignedTo)
  );

  const dueSummary = matchingTasks
    .map((task) => `${task.title} (${task.assignedTo})`)
    .join(', ');

  const rendered = renderTemplate(template, {
    companyName: data.settings.companyName,
    userName: users.map((user) => user.name).join(', '),
    taskCount: matchingTasks.length,
    daysAhead: payload.daysAhead,
    dueSummary: dueSummary || 'Sin tareas por vencer en este rango.',
    taskTable:
      matchingTasks.length > 0
        ? `<ul>${matchingTasks
            .map(
              (task) =>
                `<li><strong>${task.title}</strong> - ${task.assignedTo} - ${task.dueDate.toLocaleDateString('es-CL')}</li>`
            )
            .join('')}</ul>`
        : '<p>No hay tareas por vencer.</p>',
  });

  const campaign: EmailCampaign = {
    id: makeId('campaign'),
    name: payload.name,
    templateId: template.id,
    templateName: template.name,
    subject: rendered.subject,
    body: rendered.body,
    recipientIds: users.map((user) => user.id),
    recipientCount: users.length,
    taskIds: matchingTasks.map((task) => task.id),
    taskCount: matchingTasks.length,
    daysAhead: payload.daysAhead,
    status: 'sent',
    deliveryProvider: data.communicationSettings.providerType,
    deliveryReference: null,
    errorMessage: null,
    createdAt: new Date(),
    sentAt: new Date(),
  };

  data.emailCampaigns.unshift(toPersistedEmailCampaign(campaign));
  saveStorage(data);
  return campaign;
}

export async function listUsers(): Promise<UserAccount[]> {
  return getStorage().users.map(toUser).map(sanitizeUser);
}

export async function createUser(payload: {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  active: boolean;
}): Promise<UserAccount> {
  const data = getStorage();
  const normalizedEmail = payload.email.toLowerCase();
  if (data.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Ya existe un usuario con ese correo electronico');
  }

  const user: UserAccount = {
    id: makeId('user'),
    name: payload.name,
    email: normalizedEmail,
    role: payload.role,
    password: payload.password,
    active: payload.active,
    createdAt: new Date(),
  };

  data.users.unshift(toPersistedUser(user));
  saveStorage(data);
  return sanitizeUser(user);
}

export async function updateUser(
  userId: string,
  updates: Partial<Pick<UserAccount, 'name' | 'email' | 'role' | 'password' | 'active'>>
): Promise<UserAccount> {
  const data = getStorage();
  const userIndex = data.users.findIndex((user) => user.id === userId);
  if (userIndex < 0) throw new Error('User not found');

  const current = toUser(data.users[userIndex]);
  const normalizedEmail = updates.email ? updates.email.toLowerCase() : current.email;

  if (
    data.users.some(
      (user, index) => index !== userIndex && user.email.toLowerCase() === normalizedEmail
    )
  ) {
    throw new Error('Ya existe un usuario con ese correo electronico');
  }

  const nextUser: UserAccount = {
    ...current,
    ...updates,
    email: normalizedEmail,
    password: updates.password && updates.password.length > 0 ? updates.password : current.password,
  };

  data.users[userIndex] = toPersistedUser(nextUser);
  saveStorage(data);

  const currentSessionUserId = window.localStorage.getItem(SESSION_KEY);
  if (currentSessionUserId === userId && !nextUser.active) {
    setSession(null);
  }

  return sanitizeUser(nextUser);
}

export async function deleteUser(userId: string): Promise<void> {
  const data = getStorage();
  data.users = data.users.filter((user) => user.id !== userId);
  saveStorage(data);

  if (window.localStorage.getItem(SESSION_KEY) === userId) {
    setSession(null);
  }
}

export async function login(email: string, password: string): Promise<UserAccount> {
  const data = getStorage();
  const user = data.users.find(
    (item) =>
      item.email.toLowerCase() === email.toLowerCase().trim() &&
      item.password === password &&
      item.active
  );

  if (!user) {
    throw new Error('Credenciales invalidas');
  }

  setSession(user.id);
  return sanitizeUser(toUser(user));
}

export async function syncExternalUserSession(payload: {
  externalId: string;
  email: string;
  name: string;
  role?: UserRole;
}): Promise<UserAccount> {
  const data = getStorage();
  const normalizedEmail = payload.email.toLowerCase().trim();
  const existingUserIndex = data.users.findIndex(
    (item) => item.email.toLowerCase() === normalizedEmail
  );

  if (existingUserIndex >= 0) {
    const currentUser = toUser(data.users[existingUserIndex]);
    const nextUser: UserAccount = {
      ...currentUser,
      name: payload.name || currentUser.name,
      email: normalizedEmail,
      role: payload.role ?? currentUser.role,
      active: true,
    };

    data.users[existingUserIndex] = toPersistedUser(nextUser);
    saveStorage(data);
    setSession(nextUser.id);
    return sanitizeUser(nextUser);
  }

  const nextUser: UserAccount = {
    id: `clerk-${payload.externalId}`,
    name: payload.name || normalizedEmail,
    email: normalizedEmail,
    role: payload.role ?? 'viewer',
    password: '',
    active: true,
    createdAt: new Date(),
  };

  data.users = [toPersistedUser(nextUser), ...(data.users ?? [])];
  saveStorage(data);
  setSession(nextUser.id);
  return sanitizeUser(nextUser);
}

export async function logout(): Promise<void> {
  setSession(null);
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  const user = findRawUserById(window.localStorage.getItem(SESSION_KEY));
  return user ? sanitizeUser(user) : null;
}

export async function resetDemoData(): Promise<ISOBootstrapData> {
  const seed = cloneSeed();
  saveStorage(seed);
  setSession(seed.users[0]?.id ?? null);
  return toBootstrap(seed);
}
