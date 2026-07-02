import React, { useState } from 'react';
import type { NotificationSettings as NotificationSettingsType } from '../../types/iso';

interface NotificationSettingsProps {
  onSave: (settings: NotificationSettingsType) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onSave }) => {
  const [settings, setSettings] = useState<NotificationSettingsType>({
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-app-border bg-app-surface p-6 shadow-panel">
      <h3 className="mb-6 text-lg font-medium text-app-text">Notification Settings</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="mb-4 text-sm font-medium text-slate-700">Email Notifications</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  email: { ...settings.email, enabled: e.target.checked },
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">Enable Email Notifications</span>
            </label>
            
            {settings.email.enabled && (
              <div className="ml-6 space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.email.taskReminders}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, taskReminders: e.target.checked },
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Task Reminders</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.email.auditReminders}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, auditReminders: e.target.checked },
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Audit Reminders</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.email.documentUpdates}
                    onChange={(e) => setSettings({
                      ...settings,
                      email: { ...settings.email, documentUpdates: e.target.checked },
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Document Updates</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-medium text-slate-700">In-App Notifications</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.inApp.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  inApp: { ...settings.inApp, enabled: e.target.checked },
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">Enable In-App Notifications</span>
            </label>
            
            {settings.inApp.enabled && (
              <div className="ml-6 space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.inApp.taskReminders}
                    onChange={(e) => setSettings({
                      ...settings,
                      inApp: { ...settings.inApp, taskReminders: e.target.checked },
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Task Reminders</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.inApp.auditReminders}
                    onChange={(e) => setSettings({
                      ...settings,
                      inApp: { ...settings.inApp, auditReminders: e.target.checked },
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Audit Reminders</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.inApp.documentUpdates}
                    onChange={(e) => setSettings({
                      ...settings,
                      inApp: { ...settings.inApp, documentUpdates: e.target.checked },
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Document Updates</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="app-button-primary w-full"
        >
          Save Notification Settings
        </button>
      </div>
    </form>
  );
};
