// src/types/iso.ts
export type ISOStandard = 'ISO9001' | 'ISO14001' | 'ISO45001';

export interface Document {
  id: string;
  title: string;
  type: 'manual' | 'procedure' | 'record';
  standard: ISOStandard;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'active' | 'archived';
  url: string;
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
}