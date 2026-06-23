import React from 'react';
import { BellRing, Save } from 'lucide-react';
import { updateSettings } from '../../lib/api';
import { useISOStore } from '../../store/useISOStore';

export const SettingsNotifications: React.FC = () => {
  const currentSettings = useISOStore((state) => state.settings);
  const currentNotifications = useISOStore((state) => state.notifications);
  const replaceSettings = useISOStore((state) => state.replaceSettings);
  const replaceNotifications = useISOStore((state) => state.replaceNotifications);
  const [notificationState, setNotificationState] = React.useState(currentNotifications);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    setNotificationState(currentNotifications);
  }, [currentNotifications]);

  const showMessage = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 2500);
  };

  const handleSave = async () => {
    const response = await updateSettings({
      settings: currentSettings,
      notifications: notificationState,
    });
    replaceSettings(response.settings);
    replaceNotifications(response.notifications);
    showMessage('Notificaciones actualizadas.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#39afd1]/10 p-3 text-[#39afd1]">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-700">Notificaciones</h2>
          <p className="mt-1 text-sm text-slate-400">
            Define recordatorios internos y por correo para tareas, auditorías y documentos.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {(['email', 'inApp'] as const).map((channel) => (
          <section key={channel} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="panel-title">
                  {channel === 'email' ? 'Correo electrónico' : 'Notificaciones internas'}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Activa o pausa recordatorios por este canal.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notificationState[channel].enabled}
                onChange={(event) =>
                  setNotificationState({
                    ...notificationState,
                    [channel]: {
                      ...notificationState[channel],
                      enabled: event.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
            </div>

            <div className="mt-5 space-y-3">
              {(['taskReminders', 'auditReminders', 'documentUpdates'] as const).map((field) => (
                <label
                  key={field}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4"
                >
                  <span className="font-semibold text-slate-700">
                    {field === 'taskReminders'
                      ? 'Recordatorios de tareas'
                      : field === 'auditReminders'
                        ? 'Recordatorios de auditorías'
                        : 'Actualizaciones documentales'}
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationState[channel][field]}
                    onChange={(event) =>
                      setNotificationState({
                        ...notificationState,
                        [channel]: {
                          ...notificationState[channel],
                          [field]: event.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        className="inline-flex items-center gap-2 rounded-xl bg-[#727cf5] px-5 py-3 font-bold text-white transition hover:bg-[#636df0]"
      >
        <Save className="h-4 w-4" />
        Guardar cambios
      </button>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}
    </div>
  );
};
