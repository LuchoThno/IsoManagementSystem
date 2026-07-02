import React, { useState } from 'react';
import type { Settings } from '../../types/iso';

interface SettingsFormProps {
  onSave: (settings: Settings) => void;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ onSave }) => {
  const [settings, setSettings] = useState<Settings>({
    companyName: '',
    standards: {
      ISO9001: true,
      ISO14001: true,
      ISO45001: true,
    },
    defaultLanguage: 'en',
    timezone: 'UTC',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-app-border bg-app-surface p-6 shadow-panel">
      <h3 className="mb-6 text-lg font-medium text-app-text">General Settings</h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">Company Name</label>
          <input
            type="text"
            value={settings.companyName}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            className="admin-input mt-1"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Active Standards</label>
          <div className="space-y-2">
            {Object.entries(settings.standards).map(([standard, isActive]) => (
              <label key={standard} className="flex items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setSettings({
                    ...settings,
                    standards: {
                      ...settings.standards,
                      [standard]: e.target.checked,
                    },
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-slate-700">{standard}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Language</label>
          <select
            value={settings.defaultLanguage}
            onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
            className="admin-select mt-1 w-full"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="admin-select mt-1 w-full"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>

        <button
          type="submit"
          className="app-button-primary w-full"
        >
          Save Settings
        </button>
      </div>
    </form>
  );
};
