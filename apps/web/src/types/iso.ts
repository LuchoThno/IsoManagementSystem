export type ISOStandard = string;
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

export interface StandardSummary {
  id: string;
  code: string;
  title: string;
  version: string;
  description: string;
  category: 'standard' | 'framework' | 'regulation' | 'contractual';
  status: 'draft' | 'active' | 'archived';
  enabled: boolean;
  owner: string;
  publishedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  metrics?: {
    requirementsCount: number;
    evidencedCount: number;
    complianceRate: number;
  };
}

export interface StandardSection {
  id: string;
  standardId: string;
  code: string;
  title: string;
  description: string;
  order: number;
}

export interface StandardClause {
  id: string;
  standardId: string;
  sectionId: string;
  parentClauseId: string | null;
  code: string;
  title: string;
  description: string;
  order: number;
  evidenceCount?: number;
}

export interface StandardRequirement {
  id: string;
  standardId: string;
  sectionId: string | null;
  clauseId: string;
  code: string;
  title: string;
  description: string;
  intent: string;
  order: number;
  criticality: 'low' | 'medium' | 'high';
  status: 'draft' | 'active' | 'obsolete';
  evidenceCount?: number;
}

export interface StandardAppendix {
  id: string;
  standardId: string;
  code: string;
  title: string;
  type: 'annex' | 'appendix' | 'guide';
  description: string;
  content: string;
  order: number;
}

export interface StandardClauseNode extends StandardClause {
  requirements: StandardRequirement[];
  children: StandardClauseNode[];
}

export interface StandardSectionNode extends StandardSection {
  clauses: StandardClauseNode[];
}

export interface StandardStructure {
  standard: StandardSummary;
  sections: StandardSectionNode[];
  appendices: StandardAppendix[];
  metrics: {
    totalClauses: number;
    totalRequirements: number;
    evidencedRequirements: number;
    complianceRate: number;
  };
}

export interface Evidence {
  id: string;
  tenantId?: string | null;
  title: string;
  description: string;
  standardId: string | null;
  requirementId: string;
  clauseId: string | null;
  status: 'missing' | 'pending' | 'approved' | 'expired';
  objectiveType: 'document' | 'record' | 'interview' | 'observation' | 'contract';
  owner: string;
  sourceDocumentId: string | null;
  documentIds: string[];
  linkedAuditIds: string[];
  findingId?: string | null;
  linkedTaskIds?: string[];
  fulfillmentSummary?: string;
  completionPercentage?: number;
  activityLog?: Array<{
    id: string;
    date: Date;
    author: string;
    action: string;
    details: string;
    status: string;
  }>;
  dueDate: Date | null;
  collectedAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractDocument {
  id: string;
  tenantId?: string | null;
  contractId: string;
  title: string;
  kind: 'contract' | 'annex' | 'policy' | 'evidence';
  fileName: string;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export interface ContractObligation {
  id: string;
  tenantId?: string | null;
  contractId: string;
  standardId: string | null;
  title: string;
  description: string;
  sourceClause: string;
  dueDate: Date | null;
  status: 'open' | 'in-progress' | 'fulfilled' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  owner: string;
  evidenceIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Contract {
  id: string;
  tenantId?: string | null;
  title: string;
  counterparty: string;
  identifier: string;
  status: 'draft' | 'active' | 'expired' | 'closed';
  startDate: Date | null;
  endDate: Date | null;
  standardIds: string[];
  owner: string;
  summary: string;
  createdAt: Date;
  updatedAt: Date;
  obligations?: ContractObligation[];
  documents?: ContractDocument[];
}

export interface AuditChecklistItem {
  id: string;
  checklistId: string;
  auditId: string;
  requirementId: string | null;
  clauseId: string | null;
  clauseCode: string;
  title: string;
  prompt: string;
  status: 'pending' | 'conforming' | 'nonconforming' | 'observation';
  evidenceIds: string[];
  notes: string;
  order: number;
}

export interface AuditChecklist {
  id: string;
  auditId: string;
  standardId: string;
  title: string;
  summary: string;
  progress: number;
  itemCount: number;
  items: AuditChecklistItem[];
}

export interface CorrectiveAction {
  id: string;
  tenantId?: string | null;
  title: string;
  description: string;
  sourceType: 'finding' | 'audit' | 'contract' | 'requirement' | 'evidence';
  sourceId: string;
  standardId: string | null;
  auditId: string | null;
  assignedTo: string;
  dueDate: Date | null;
  status: 'open' | 'in-progress' | 'verified' | 'closed';
  priority: 'low' | 'medium' | 'high';
  evidenceIds: string[];
  verificationNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersionEntry {
  id: string;
  version: string;
  date: Date;
  author: string;
  notes: string;
}

export interface TraceabilityEntry {
  id: string;
  date: Date;
  author: string;
  action: string;
  summary: string;
}

export interface DocumentAuditEntry {
  id: string;
  action: 'created' | 'updated' | 'viewed';
  date: Date;
  author: string;
  details: string;
  relatedAuditIds?: string[];
  relatedTaskIds?: string[];
}

export interface Document {
  id: string;
  tenantId?: string | null;
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
  url?: string;
  linkedAuditIds?: string[];
  linkedTaskIds?: string[];
  versionHistory: DocumentVersionEntry[];
  auditTrail: DocumentAuditEntry[];
}

export interface DocumentAsset {
  url: string;
  fileName?: string;
  mimeType?: string;
}

export interface Task {
  id: string;
  tenantId?: string | null;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  standard: ISOStandard;
  relatedDocuments: string[];
  relatedAuditIds?: string[];
  relatedFindingIds?: string[];
  changeLog?: TraceabilityEntry[];
}

export interface Audit {
  id: string;
  tenantId?: string | null;
  type: 'internal' | 'external';
  standard: ISOStandard;
  date: Date;
  status: 'planned' | 'in-progress' | 'completed';
  findings: Finding[];
  relatedTaskIds?: string[];
  relatedDocumentIds?: string[];
  changeLog?: TraceabilityEntry[];
}

export interface Finding {
  id: string;
  type: 'nonconformity' | 'observation' | 'opportunity';
  description: string;
  status: 'open' | 'in-progress' | 'closed';
  dueDate: Date;
  assignedTo: string;
}

export interface AuditExecutionReport {
  evidences: Evidence[];
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    assignedTo: string;
    dueDate: Date;
    status: Task['status'];
    priority: Task['priority'];
    standard: ISOStandard;
    relatedFindingIds?: string[];
  }>;
}

export interface ExportValidation {
  version: '1.0';
  exportId: string;
  sourceType: 'audit' | 'evidence';
  sourceId: string;
  generatedAtIso: string;
  generatedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  checksum: string;
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
  standards: Record<string, boolean>;
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
  tenantId?: string | null;
  participantIds: string[];
  messages: ChatMessage[];
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  tenantId?: string | null;
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

export interface GrcOverview {
  standardsCount: number;
  evidencesCount: number;
  contractsCount: number;
  correctiveActionsCount: number;
  openCorrectiveActions: number;
  approvedEvidences: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ISOBootstrapData {
  dashboard: DashboardOverview;
  documents: Document[];
  tasks: Task[];
  audits: Audit[];
  standards: StandardSummary[];
  alerts: Alert[];
  settings: Settings;
  notifications: NotificationSettings;
  users: UserAccount[];
  chatThreads: ChatThread[];
  emailTemplates: EmailTemplate[];
  emailCampaigns: EmailCampaign[];
  communicationSettings: CommunicationSettings;
}

export interface ISOBootstrapShellData {
  dashboard: DashboardOverview;
  standards: StandardSummary[];
  alerts: Alert[];
  settings: Settings;
  notifications: NotificationSettings;
  emailTemplates: EmailTemplate[];
  emailCampaigns: EmailCampaign[];
  communicationSettings: CommunicationSettings;
}
