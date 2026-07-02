import React from 'react';
import { BellRing, MonitorSmartphone, Save } from 'lucide-react';
import { updateSettings } from '../../lib/api';
import {
  getBrowserNotificationPermission,
  isBrowserNotificationsSupported,
  requestBrowserNotificationPermission,
} from '../../lib/browserNotifications';
import { useISOStore } from '../../store/useISOStore';

export const SettingsNotifications: React.FC = () => {
  const currentSettings = useISOStore((state) => state.settings);
  const currentNotifications = useISOStore((state) => state.notifications);
  const replaceSettings = useISOStore((state) => state.replaceSettings);
  const replaceNotifications = useISOStore((state) => state.replaceNotifications);
  const [notificationState, setNotificationState] = React.useState(currentNotifications);
  const [message, setMessage] = React.useState('');
  const [permissionState, setPermissionState] = React.useState<
    NotificationPermission | 'unsupported'
  >(getBrowserNotificationPermission());

  React.useEffect(() => {
    setNotificationState(currentNotifications);
  }, [currentNotifications]);

  const showMessage = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 2500);
  };

  const handleRequestPermission = async () => {
    const permission = await requestBrowserNotificationPermission();
    setPermissionState(permission);
    showMessage(
      permission === 'granted'
        ? 'Notificaciones de escritorio autorizadas.'
        : permission === 'denied'
          ? 'El navegador bloqueó las notificaciones.'
          : 'El dispositivo no soporta notificaciones del navegador.'
    );
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
        <div className="rounded-2xl bg-app-info/10 p-3 text-app-info">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-app-text">Notificaciones</h2>
          <p className="mt-1 text-sm text-app-muted">
            Define recordatorios internos y por correo para tareas, auditorías y documentos.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {(['email', 'inApp'] as const).map((channel) => (
          <section key={channel} className="rounded-[28px] border border-app-border bg-app-surface p-6 shadow-panel">
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
                  className="flex items-center justify-between rounded-2xl border border-app-border px-4 py-4"
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

      <section className="rounded-[28px] border border-app-border bg-app-surface p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="app-icon-chip">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="panel-title">Escritorio y dispositivo</h3>
              <p className="mt-2 text-sm text-slate-400">
                Muestra burbujas del navegador para mensajes nuevos y cambios de conexión.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                permissionState === 'granted'
                  ? 'bg-emerald-100 text-emerald-700'
                  : permissionState === 'denied'
                    ? 'bg-rose-100 text-rose-700'
                    : permissionState === 'unsupported'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-amber-100 text-amber-700'
              }`}
            >
              {permissionState === 'granted'
                ? 'Permiso otorgado'
                : permissionState === 'denied'
                  ? 'Permiso bloqueado'
                  : permissionState === 'unsupported'
                    ? 'No compatible'
                    : 'Pendiente'}
            </span>

            <button
              type="button"
              onClick={() => void handleRequestPermission()}
              disabled={!isBrowserNotificationsSupported()}
              className="app-button-secondary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Solicitar permiso
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="flex items-center justify-between rounded-2xl border border-app-border px-4 py-4">
            <span className="font-semibold text-slate-700">Activar canal</span>
            <input
              type="checkbox"
              checked={notificationState.desktop.enabled}
              onChange={(event) =>
                setNotificationState({
                  ...notificationState,
                  desktop: {
                    ...notificationState.desktop,
                    enabled: event.target.checked,
                  },
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-app-border px-4 py-4">
            <span className="font-semibold text-slate-700">Mensajes de chat</span>
            <input
              type="checkbox"
              checked={notificationState.desktop.chatMessages}
              onChange={(event) =>
                setNotificationState({
                  ...notificationState,
                  desktop: {
                    ...notificationState.desktop,
                    chatMessages: event.target.checked,
                  },
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-app-border px-4 py-4">
            <span className="font-semibold text-slate-700">Alertas de conexión</span>
            <input
              type="checkbox"
              checked={notificationState.desktop.connectionAlerts}
              onChange={(event) =>
                setNotificationState({
                  ...notificationState,
                  desktop: {
                    ...notificationState.desktop,
                    connectionAlerts: event.target.checked,
                  },
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </label>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void handleSave()}
        className="app-button-primary inline-flex items-center gap-2 px-5 py-3"
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
