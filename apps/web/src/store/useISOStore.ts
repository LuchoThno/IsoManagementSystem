// src/store/useISOStore.ts
import { create } from 'zustand';
import type {
  Alert,
  Audit,
  ChatThread,
  CommunicationSettings,
  DashboardOverview,
  Document,
  EmailCampaign,
  EmailTemplate,
  ISOBootstrapData,
  NotificationSettings,
  Settings,
  Task,
  UserAccount,
} from '../types/iso';

interface ISOStore {
  dashboard: DashboardOverview;
  documents: Document[];
  tasks: Task[];
  audits: Audit[];
  alerts: Alert[];
  settings: Settings;
  notifications: NotificationSettings;
  users: UserAccount[];
  chatThreads: ChatThread[];
  emailTemplates: EmailTemplate[];
  emailCampaigns: EmailCampaign[];
  communicationSettings: CommunicationSettings;
  loading: boolean;
  error: string | null;

  hydrate: (data: ISOBootstrapData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addDocument: (document: Document) => void;
  addTask: (task: Task) => void;
  addAudit: (audit: Audit) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateAudit: (auditId: string, updates: Partial<Audit>) => void;
  replaceSettings: (settings: Settings) => void;
  replaceNotifications: (settings: NotificationSettings) => void;
  replaceUsers: (users: UserAccount[]) => void;
  replaceChatThreads: (threads: ChatThread[]) => void;
  upsertChatThread: (thread: ChatThread) => void;
  replaceAlerts: (alerts: Alert[]) => void;
  replaceDashboard: (dashboard: DashboardOverview) => void;
}

export const useISOStore = create<ISOStore>((set) => ({
  dashboard: {
    stats: [],
    complianceRate: 0,
    overdueTasks: 0,
    upcomingAudits: 0,
    recentActivity: [],
  },
  documents: [],
  tasks: [],
  audits: [],
  alerts: [],
  users: [],
  chatThreads: [],
  emailTemplates: [],
  emailCampaigns: [],
  settings: {
    companyName: 'ISO Manager',
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
  communicationSettings: {
    enabled: true,
    providerName: 'Proveedor SMTP',
    senderName: 'Sistema ISO',
    senderEmail: 'notificaciones@servasmar.cl',
    replyTo: 'calidad@servasmar.cl',
    apiBaseUrl: 'https://api.servasmar.cl/communications/send',
    apiKeyHint: 'configurado-en-servidor',
  },
  loading: true,
  error: null,

  hydrate: (data) =>
    set(() => ({
      dashboard: data.dashboard,
      documents: data.documents,
      tasks: data.tasks,
      audits: data.audits,
      alerts: data.alerts,
      settings: data.settings,
      notifications: data.notifications,
      users: data.users,
      chatThreads: data.chatThreads,
      emailTemplates: data.emailTemplates,
      emailCampaigns: data.emailCampaigns,
      communicationSettings: data.communicationSettings,
      loading: false,
      error: null,
    })),

  setLoading: (loading) => set(() => ({ loading })),

  setError: (error) => set(() => ({ error, loading: false })),

  addDocument: (document) =>
    set((state) => ({ documents: [...state.documents, document] })),

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  addAudit: (audit) =>
    set((state) => ({ audits: [...state.audits, audit] })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    })),

  updateAudit: (auditId, updates) =>
    set((state) => ({
      audits: state.audits.map((audit) =>
        audit.id === auditId ? { ...audit, ...updates } : audit
      ),
    })),

  replaceSettings: (settings) =>
    set(() => ({
      settings,
    })),

  replaceNotifications: (settings) =>
    set(() => ({
      notifications: settings,
    })),

  replaceUsers: (users) =>
    set(() => ({
      users,
    })),

  replaceChatThreads: (threads) =>
    set(() => ({
      chatThreads: threads,
    })),

  upsertChatThread: (thread) =>
    set((state) => ({
      chatThreads: [
        thread,
        ...state.chatThreads.filter((current) => current.id !== thread.id),
      ].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()),
    })),

  replaceAlerts: (alerts) =>
    set(() => ({
      alerts,
    })),

  replaceDashboard: (dashboard) =>
    set(() => ({
      dashboard,
    })),
}));
