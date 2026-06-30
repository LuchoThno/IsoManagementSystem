import React from 'react';
import { Building2, RefreshCcw, Save } from 'lucide-react';
import { getCurrentUser, resetDemoData, updateSettings } from '../../lib/api';
import { useISOStore } from '../../store/useISOStore';
import { useAuthStore } from '../../store/useAuthStore';

export const SettingsGeneral: React.FC = () => {
  const currentSettings = useISOStore((state) => state.settings);
  const standards = useISOStore((state) => state.standards);
  const currentNotifications = useISOStore((state) => state.notifications);
  const replaceSettings = useISOStore((state) => state.replaceSettings);
  const replaceNotifications = useISOStore((state) => state.replaceNotifications);
  const hydrate = useISOStore((state) => state.hydrate);
  const setAuthUser = useAuthStore((state) => state.setUser);

  const [formState, setFormState] = React.useState(currentSettings);
  const [message, setMessage] = React.useState('');

  const standardsCatalog = React.useMemo(() => {
    const known = standards.map((standard) => ({
      key: standard.code,
      label: `${standard.code} · ${standard.title}`,
    }));

    const missing = Object.keys(currentSettings.standards)
      .filter((code) => !known.some((standard) => standard.key === code))
      .map((code) => ({
        key: code,
        label: code,
      }));

    return [...known, ...missing];
  }, [currentSettings.standards, standards]);

  React.useEffect(() => {
    const mergedStandards = standardsCatalog.reduce<Record<string, boolean>>((accumulator, standard) => {
      accumulator[standard.key] = currentSettings.standards[standard.key] ?? true;
      return accumulator;
    }, {});

    setFormState({
      ...currentSettings,
      standards: mergedStandards,
    });
  }, [currentSettings, standardsCatalog]);

  const showMessage = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 2500);
  };

  const handleSave = async () => {
    const response = await updateSettings({
      settings: formState,
      notifications: currentNotifications,
    });

    replaceSettings(response.settings);
    replaceNotifications(response.notifications);
    showMessage('Configuración general actualizada.');
  };

  const handleReset = async () => {
    try {
      const bootstrap = await resetDemoData();
      hydrate(bootstrap);
      setAuthUser(await getCurrentUser());
      showMessage('Datos locales restablecidos correctamente.');
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : 'El restablecimiento local ya no está disponible con la API real.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#727cf5]/10 p-3 text-[#727cf5]">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-700">General</h2>
          <p className="mt-1 text-sm text-slate-400">
            Parámetros base del sistema y normas activas.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="block text-sm font-bold text-slate-600">Nombre de la empresa</label>
            <input
              value={formState.companyName}
              onChange={(event) => setFormState({ ...formState, companyName: event.target.value })}
              className="admin-input mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600">Idioma</label>
            <select
              value={formState.defaultLanguage}
              onChange={(event) =>
                setFormState({ ...formState, defaultLanguage: event.target.value })
              }
              className="admin-select mt-2 w-full"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600">Zona horaria</label>
            <select
              value={formState.timezone}
              onChange={(event) => setFormState({ ...formState, timezone: event.target.value })}
              className="admin-select mt-2 w-full"
            >
              <option value="America/Santiago">America/Santiago</option>
              <option value="America/Bogota">America/Bogota</option>
              <option value="America/Mexico_City">America/Mexico_City</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-bold text-slate-600">Normas activas</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {standardsCatalog.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4"
              >
                <span className="font-bold text-slate-700">{label}</span>
                <input
                  type="checkbox"
                  checked={formState.standards[key] ?? false}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      standards: {
                        ...formState.standards,
                        [key]: event.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#727cf5] px-5 py-3 font-bold text-white transition hover:bg-[#636df0]"
          >
            <Save className="h-4 w-4" />
            Guardar cambios
          </button>
          <button
            type="button"
            onClick={() => void handleReset()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Restablecer datos locales
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}
    </div>
  );
};
