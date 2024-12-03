// src/store/useISOStore.ts
import { create } from 'zustand';
import type { Document, Task, Audit, Settings, NotificationSettings } from '../types/iso';

interface ISOStore {
  documents: Document[];
  tasks: Task[];
  audits: Audit[];
  settings: Settings;
  notifications: NotificationSettings;
  
  addDocument: (document: Document) => void;
  addTask: (task: Task) => void;
  addAudit: (audit: Audit) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  updateNotificationSettings: (settings: NotificationSettings) => void;
}

export const useISOStore = create<ISOStore>((set) => ({
  documents: [],
  tasks: [],
  audits: [],
  settings: {
    companyName: '',
    standards: {
      ISO9001: true,
      ISO14001: true,
      ISO45001: true,
    },
    defaultLanguage: 'en',
    timezone: 'UTC',
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
  },
  
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
    
  updateSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),
    
  updateNotificationSettings: (settings) =>
    set(() => ({
      notifications: settings,
    })),
}));