import { isClerkEnabled } from './clerk';
import { listClerkDirectoryUsers } from './clerkDirectoryApi';
import { requestIsoApi } from './isoApiClient';
import * as storage from './storage';
import type { ISOBootstrapData, UserAccount } from '../types/iso';
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
  emailCampaigns: Array<Omit<EmailCampaign, 'createdAt' | 'sentAt'> & { createdAt: string; sentAt: string | null }>;
  communicationSettings: ISOBootstrapData['communicationSettings'];
};

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
  const [bootstrap, localBootstrap] = await Promise.all([
    requestIsoApi<ApiBootstrap>('/bootstrap'),
    storage.fetchBootstrap(),
  ]);

  const nextBootstrap: ISOBootstrapData = {
    ...localBootstrap,
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

  if (!isClerkEnabled) {
    return nextBootstrap;
  }

  try {
    const clerkUsers = await listClerkDirectoryUsers();
    return {
      ...nextBootstrap,
      users: mergeDirectoryUsers(nextBootstrap.users, clerkUsers),
    };
  } catch {
    return nextBootstrap;
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

export const createAudit = storage.createAudit;
export const createEmailTemplate = (payload: {
  name: string;
  subject: string;
  content: string;
}) =>
  requestIsoApi<EmailTemplate>('/communications/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const createDocument = storage.createDocument;
export const createTask = storage.createTask;
export const createUser = storage.createUser;
export const deleteAudit = storage.deleteAudit;
export const deleteEmailTemplate = (templateId: string) =>
  requestIsoApi(`/communications/templates/${templateId}/delete`, {
    method: 'PATCH',
  });
export const deleteDocument = storage.deleteDocument;
export const deleteTask = storage.deleteTask;
export const deleteUser = storage.deleteUser;
export const getCurrentUser = storage.getCurrentUser;
export const listChatThreads = storage.listChatThreads;
export const listEmailTemplates = async (): Promise<EmailTemplate[]> => {
  const bootstrap = await fetchBootstrap();
  return bootstrap.emailTemplates;
};
export const login = storage.login;
export const markThreadAsRead = storage.markThreadAsRead;
export const openDirectThread = storage.openDirectThread;
export const logout = storage.logout;
export const registerDocumentView = storage.registerDocumentView;
export const resetDemoData = async () => {
  throw new Error('El restablecimiento de datos locales ya no está disponible cuando el panel usa la API real.');
};
export const sendBulkTaskReminderCampaign = (payload: {
  name: string;
  templateId: string;
  daysAhead: number;
  recipientIds: string[];
  recipientNames: string[];
}) =>
  requestIsoApi<EmailCampaign>('/communications/campaigns/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const sendChatMessage = storage.sendChatMessage;
export const syncExternalUserSession = storage.syncExternalUserSession;
export const updateAudit = storage.updateAudit;
export const updateAuditStatus = storage.updateAuditStatus;
export const updateCommunicationSettings = (settings: ISOBootstrapData['communicationSettings']) =>
  requestIsoApi<ISOBootstrapData['communicationSettings']>('/communications/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
export const updateDocument = storage.updateDocument;
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
export const updateTask = storage.updateTask;
export const updateTaskStatus = storage.updateTaskStatus;
export const updateUser = storage.updateUser;
