import { isClerkEnabled } from './clerk';
import {
  listChatThreadsApi,
  markThreadAsReadApi,
  openDirectThreadApi,
  sendChatMessageApi,
} from './chatApi';
import { listClerkDirectoryUsers } from './clerkDirectoryApi';
import {
  createAuditApi,
  deleteAuditApi,
  updateAuditApi,
  updateAuditStatusApi,
} from './auditsApi';
import {
  createDocumentApi,
  deleteDocumentApi,
  registerDocumentViewApi,
  updateDocumentApi,
} from './documentsApi';
import { requestIsoApi } from './isoApiClient';
import * as storage from './storage';
import { createTaskApi, deleteTaskApi, updateTaskApi, updateTaskStatusApi } from './tasksApi';
import type {
  CommunicationCompatibility,
  ISOBootstrapData,
  ISOBootstrapShellData,
  UserAccount,
} from '../types/iso';
import type {
  Alert,
  Audit,
  DashboardOverview,
  Document,
  EmailCampaign,
  EmailTemplate,
  NotificationSettings,
  Settings,
  Task,
} from '../types/iso';

type ApiDocument = Omit<Document, 'createdAt' | 'updatedAt' | 'versionHistory' | 'auditTrail'> & {
  createdAt: string;
  updatedAt: string;
  versionHistory: Array<{
    id: string;
    version: string;
    date: string;
    author: string;
    notes: string;
  }>;
  auditTrail: Array<{
    id: string;
    action: 'created' | 'updated' | 'viewed';
    date: string;
    author: string;
    details: string;
  }>;
};

type ApiTask = Omit<Task, 'dueDate'> & {
  dueDate: string;
};

type ApiAudit = Omit<Audit, 'date' | 'findings'> & {
  date: string;
  findings: Array<
    Omit<Audit['findings'][number], 'dueDate'> & {
      dueDate: string;
    }
  >;
};

type ApiAlert = Omit<Alert, 'date'> & {
  date: string;
};

type ApiBootstrap = {
  dashboard: DashboardOverview;
  documents: ApiDocument[];
  tasks: ApiTask[];
  audits: ApiAudit[];
  alerts: ApiAlert[];
  settings: Settings;
  notifications: NotificationSettings;
  emailTemplates: Array<Omit<EmailTemplate, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>;
  emailCampaigns: Array<
    Omit<EmailCampaign, 'createdAt' | 'sentAt'> & { createdAt: string; sentAt: string | null }
  >;
  communicationSettings: ISOBootstrapData['communicationSettings'];
};

type ApiBootstrapShell = {
  dashboard: DashboardOverview;
  alerts: ApiAlert[];
  settings: Settings;
  notifications: NotificationSettings;
  emailTemplates: Array<Omit<EmailTemplate, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>;
  emailCampaigns: Array<
    Omit<EmailCampaign, 'createdAt' | 'sentAt'> & { createdAt: string; sentAt: string | null }
  >;
  communicationSettings: ISOBootstrapData['communicationSettings'];
};

let bootstrapPromise: Promise<ISOBootstrapData> | null = null;
let bootstrapShellPromise: Promise<ISOBootstrapShellData> | null = null;

const mergeDirectoryUsers = (
  localUsers: UserAccount[],
  clerkUsers: UserAccount[]
): UserAccount[] => {
  const merged = [...localUsers];
  const byEmail = new Map(
    merged.map((user, index) => [user.email.trim().toLowerCase(), { user, index }] as const)
  );

  for (const clerkUser of clerkUsers) {
    const normalizedEmail = clerkUser.email.trim().toLowerCase();
    const existing = byEmail.get(normalizedEmail);

    if (existing) {
      merged[existing.index] = {
        ...existing.user,
        name: clerkUser.name || existing.user.name,
        email: normalizedEmail,
        role: clerkUser.role || existing.user.role,
        active: clerkUser.active,
      };
      continue;
    }

    byEmail.set(normalizedEmail, { user: clerkUser, index: merged.length });
    merged.push(clerkUser);
  }

  return merged.sort((left, right) => left.name.localeCompare(right.name, 'es'));
};

export async function fetchBootstrap(): Promise<ISOBootstrapData> {
  if (!isClerkEnabled) {
    return storage.fetchBootstrap();
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  const request = (async () => {
    const [bootstrap, users, chatThreads] = await Promise.all([
      requestIsoApi<ApiBootstrap>('/bootstrap'),
      storage.listUsers(),
      storage.listChatThreads(),
    ]);

    const nextBootstrap: ISOBootstrapData = {
      dashboard: bootstrap.dashboard,
      documents: bootstrap.documents.map((document) => ({
        ...document,
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
      })),
      tasks: bootstrap.tasks.map((task) => ({
        ...task,
        dueDate: new Date(task.dueDate),
      })),
      audits: bootstrap.audits.map((audit) => ({
        ...audit,
        date: new Date(audit.date),
        findings: (audit.findings ?? []).map((finding) => ({
          ...finding,
          dueDate: new Date(finding.dueDate),
        })),
      })),
      alerts: bootstrap.alerts.map((alert) => ({
        ...alert,
        date: new Date(alert.date),
      })),
      settings: bootstrap.settings,
      notifications: bootstrap.notifications,
      users,
      chatThreads,
      emailTemplates: bootstrap.emailTemplates.map((template) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt),
      })),
      emailCampaigns: bootstrap.emailCampaigns.map((campaign) => ({
        ...campaign,
        createdAt: new Date(campaign.createdAt),
        sentAt: campaign.sentAt ? new Date(campaign.sentAt) : null,
      })),
      communicationSettings: bootstrap.communicationSettings,
    };

    try {
      const clerkUsers = await listClerkDirectoryUsers();
      return {
        ...nextBootstrap,
        users: mergeDirectoryUsers(nextBootstrap.users, clerkUsers),
      };
    } catch {
      return nextBootstrap;
    }
  })();

  bootstrapPromise = request;

  try {
    return await request;
  } finally {
    if (bootstrapPromise === request) {
      bootstrapPromise = null;
    }
  }
}

export async function fetchBootstrapShell(options?: { force?: boolean }): Promise<ISOBootstrapShellData> {
  if (!isClerkEnabled) {
    const bootstrap = await storage.fetchBootstrap();
    return {
      dashboard: bootstrap.dashboard,
      alerts: bootstrap.alerts,
      settings: bootstrap.settings,
      notifications: bootstrap.notifications,
      emailTemplates: bootstrap.emailTemplates,
      emailCampaigns: bootstrap.emailCampaigns,
      communicationSettings: bootstrap.communicationSettings,
    };
  }

  if (!options?.force && bootstrapShellPromise) {
    return bootstrapShellPromise;
  }

  const request = (async () => {
    const shell = await requestIsoApi<ApiBootstrapShell>('/bootstrap-shell');

    return {
      dashboard: shell.dashboard,
      alerts: shell.alerts.map((alert) => ({
        ...alert,
        date: new Date(alert.date),
      })),
      settings: shell.settings,
      notifications: shell.notifications,
      emailTemplates: shell.emailTemplates.map((template) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt),
      })),
      emailCampaigns: shell.emailCampaigns.map((campaign) => ({
        ...campaign,
        createdAt: new Date(campaign.createdAt),
        sentAt: campaign.sentAt ? new Date(campaign.sentAt) : null,
      })),
      communicationSettings: shell.communicationSettings,
    };
  })();

  bootstrapShellPromise = request;

  try {
    return await request;
  } finally {
    if (bootstrapShellPromise === request) {
      bootstrapShellPromise = null;
    }
  }
}

export async function listUsers(): Promise<UserAccount[]> {
  const users = await storage.listUsers();

  if (!isClerkEnabled) {
    return users;
  }

  try {
    const clerkUsers = await listClerkDirectoryUsers();
    return mergeDirectoryUsers(users, clerkUsers);
  } catch {
    return users;
  }
}

export const createAudit = createAuditApi;
export const createEmailTemplate = (payload: {
  name: string;
  subject: string;
  content: string;
}) =>
  requestIsoApi<EmailTemplate>('/communications/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const createDocument = createDocumentApi;
export const createTask = createTaskApi;
export const createUser = storage.createUser;
export const deleteAudit = deleteAuditApi;
export const deleteEmailTemplate = (templateId: string) =>
  requestIsoApi(`/communications/templates/${templateId}/delete`, {
    method: 'PATCH',
  });
export const deleteDocument = deleteDocumentApi;
export const deleteTask = deleteTaskApi;
export const deleteUser = storage.deleteUser;
export const getCurrentUser = storage.getCurrentUser;
export const listChatThreads = listChatThreadsApi;
export const listEmailTemplates = async (): Promise<EmailTemplate[]> => {
  const bootstrap = await fetchBootstrap();
  return bootstrap.emailTemplates;
};
export const login = storage.login;
export const markThreadAsRead = markThreadAsReadApi;
export const openDirectThread = openDirectThreadApi;
export const logout = storage.logout;
export const registerDocumentView = registerDocumentViewApi;
export const resetDemoData = async () => {
  throw new Error('El restablecimiento de datos locales ya no está disponible cuando el panel usa la API real.');
};
export const sendBulkTaskReminderCampaign = (payload: {
  name: string;
  templateId: string;
  daysAhead: number;
  recipientIds: string[];
  recipientNames: string[];
  recipientEmails: string[];
}) =>
  requestIsoApi<EmailCampaign>('/communications/campaigns/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const fetchCommunicationCompatibility = async (): Promise<CommunicationCompatibility> => {
  const response = await requestIsoApi<
    Omit<CommunicationCompatibility, 'checkedAt'> & { checkedAt: string }
  >('/communications/compatibility');

  return {
    ...response,
    checkedAt: new Date(response.checkedAt),
  };
};
export const sendChatMessage = sendChatMessageApi;
export const syncExternalUserSession = storage.syncExternalUserSession;
export const updateAudit = updateAuditApi;
export const updateAuditStatus = updateAuditStatusApi;
export const updateCommunicationSettings = (settings: ISOBootstrapData['communicationSettings']) =>
  requestIsoApi<ISOBootstrapData['communicationSettings']>('/communications/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
export const updateDocument = updateDocumentApi;
export const updateEmailTemplate = (
  templateId: string,
  updates: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'content'>>
) =>
  requestIsoApi<EmailTemplate>(`/communications/templates/${templateId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
export const updateSettings = (payload: {
  settings: Settings;
  notifications: NotificationSettings;
}) =>
  requestIsoApi<{
    settings: Settings;
    notifications: NotificationSettings;
  }>('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
export const updateTask = updateTaskApi;
export const updateTaskStatus = updateTaskStatusApi;
export const updateUser = storage.updateUser;
