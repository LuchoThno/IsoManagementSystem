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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Notification Settings</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">Email Notifications</h4>
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
              <span className="ml-2 text-sm text-gray-700">Enable Email Notifications</span>
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
                  <span className="ml-2 text-sm text-gray-700">Task Reminders</span>
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
                  <span className="ml-2 text-sm text-gray-700">Audit Reminders</span>
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
                  <span className="ml-2 text-sm text-gray-700">Document Updates</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">In-App Notifications</h4>
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
              <span className="ml-2 text-sm text-gray-700">Enable In-App Notifications</span>
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
                  <span className="ml-2 text-sm text-gray-700">Task Reminders</span>
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
                  <span className="ml-2 text-sm text-gray-700">Audit Reminders</span>
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
                  <span className="ml-2 text-sm text-gray-700">Document Updates</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Notification Settings
        </button>
      </div>
    </form>
  );
};