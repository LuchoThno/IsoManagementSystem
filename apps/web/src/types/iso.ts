// src/types/iso.ts
export type ISOStandard = 'ISO9001' | 'ISO14001' | 'ISO45001';
export type DocumentFormat =
  | 'PDF'
  | 'DOCX'
  | 'XLSX'
  | 'PPTX'
  | 'TXT'
  | 'PNG'
  | 'JPG'
  | 'WEBP'
  | 'GIF';

export interface DocumentVersionEntry {
  id: string;
  version: string;
  date: Date;
  author: string;
  notes: string;
}

export interface DocumentAuditEntry {
  id: string;
  action: 'created' | 'updated' | 'viewed';
  date: Date;
  author: string;
  details: string;
}

export interface Document {
  id: string;
  title: string;
  fileName?: string;
  mimeType?: string;
  topic: string;
  type: 'manual' | 'procedure' | 'record';
  format: DocumentFormat;
  standard: ISOStandard;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'active' | 'archived';
  url: string;
  versionHistory: DocumentVersionEntry[];
  auditTrail: DocumentAuditEntry[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  standard: ISOStandard;
  relatedDocuments: string[];
}

export interface Audit {
  id: string;
  type: 'internal' | 'external';
  standard: ISOStandard;
  date: Date;
  status: 'planned' | 'in-progress' | 'completed';
  findings: Finding[];
}

export interface Finding {
  id: string;
  type: 'nonconformity' | 'observation' | 'opportunity';
  description: string;
  status: 'open' | 'in-progress' | 'closed';
  dueDate: Date;
  assignedTo: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'task' | 'audit';
  standard: ISOStandard;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'task' | 'audit';
  priority: 'low' | 'medium' | 'high';
  date: Date;
  relatedId: string;
}

export interface Settings {
  companyName: string;
  standards: {
    [key in ISOStandard]: boolean;
  };
  defaultLanguage: string;
  timezone: string;
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    taskReminders: boolean;
    auditReminders: boolean;
    documentUpdates: boolean;
  };
  inApp: {
    enabled: boolean;
    taskReminders: boolean;
    auditReminders: boolean;
    documentUpdates: boolean;
  };
  desktop: {
    enabled: boolean;
    chatMessages: boolean;
    connectionAlerts: boolean;
  };
}

export type UserRole = 'admin' | 'manager' | 'auditor' | 'viewer';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
  active: boolean;
  createdAt: Date;
}

export interface AuthSession {
  user: UserAccount | null;
  initialized: boolean;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  readBy: string[];
}

export interface ChatThread {
  id: string;
  participantIds: string[];
  messages: ChatMessage[];
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CommunicationProviderType = 'resend' | 'gmail' | 'custom';

export interface CommunicationSettings {
  enabled: boolean;
  providerType: CommunicationProviderType;
  providerName: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  apiBaseUrl: string;
  apiKeyHint: string;
}

export interface CommunicationProviderCompatibility {
  type: CommunicationProviderType;
  label: string;
  transport: 'sdk' | 'api';
  configured: boolean;
  selected: boolean;
  missing: string[];
  detail: string;
}

export interface CommunicationCompatibility {
  activeProvider: CommunicationProviderType;
  canSend: boolean;
  checkedAt: Date;
  recommendations: string[];
  providers: CommunicationProviderCompatibility[];
}

export interface EmailCampaign {
  id: string;
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
  deliveryProvider: string;
  deliveryReference: string | null;
  errorMessage: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

export interface DashboardStat {
  label: string;
  value: number;
  trend: string;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}

export interface DashboardActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface DashboardOverview {
  stats: DashboardStat[];
  complianceRate: number;
  overdueTasks: number;
  upcomingAudits: number;
  recentActivity: DashboardActivity[];
}

export interface ISOBootstrapData {
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
}
