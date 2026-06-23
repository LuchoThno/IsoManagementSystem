import React from 'react';
import {
  CalendarDays,
  Layers3,
  MailCheck,
  MessageSquareShare,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Users2,
} from 'lucide-react';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  fetchBootstrap,
  sendBulkTaskReminderCampaign,
  updateCommunicationSettings,
  updateEmailTemplate,
} from '../lib/api';
import { useISOStore } from '../store/useISOStore';
import type { CommunicationSettings, EmailTemplate, UserRole } from '../types/iso';

type DeliveryMode = 'personal' | 'group' | 'massive';

const baseEmailModel = {
  name: 'Modelo operativo de comunicado',
  subject: '[{{companyName}}] Seguimiento de tareas y acciones pendientes',
  content: `<div style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.6">
  <p style="font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin:0 0 12px">Comunicado operativo</p>
  <h1 style="font-size:24px;margin:0 0 16px">Hola {{userName}},</h1>
  <p>Tienes <strong>{{taskCount}}</strong> tarea(s) con vencimiento dentro de los próximos <strong>{{daysAhead}}</strong> días.</p>
  <p>{{dueSummary}}</p>
  <div style="margin:20px 0;padding:20px;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc">
    {{taskTable}}
  </div>
  <p>Si necesitas apoyo, responde este mensaje o coordina con el equipo de calidad.</p>
  <p style="margin-top:24px">Saludos,<br /><strong>{{companyName}}</strong></p>
</div>`,
};

const integrationCards = [
  {
    title: 'Correo saliente',
    subtitle: 'Gmail SMTP o worker en Render',
    icon: MailCheck,
    tone: 'bg-[#727cf5]/10 text-[#727cf5]',
    envs: ['MAIL_PROVIDER', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
    detail: 'Usa Gmail SMTP para operación simple o Render para alojar un webhook/API de despacho.',
  },
  {
    title: 'Calendario',
    subtitle: 'Google Calendar',
    icon: CalendarDays,
    tone: 'bg-[#39afd1]/10 text-[#39afd1]',
    envs: [
      'GOOGLE_CALENDAR_CLIENT_ID',
      'GOOGLE_CALENDAR_CLIENT_SECRET',
      'GOOGLE_CALENDAR_REFRESH_TOKEN',
      'GOOGLE_CALENDAR_ID',
    ],
    detail: 'Ideal para publicar auditorías y vencimientos en un calendario compartido del equipo.',
  },
  {
    title: 'Chat y alertas',
    subtitle: 'Google Chat o Socket.IO',
    icon: MessageSquareShare,
    tone: 'bg-[#0acf97]/10 text-[#0acf97]',
    envs: ['CHAT_PROVIDER', 'VITE_SOCKET_URL', 'GOOGLE_CHAT_WEBHOOK_URL'],
    detail: 'Socket.IO cubre el chat interno en tiempo real; Google Chat puede complementar alertas externas.',
  },
];

export const Communications: React.FC = () => {
  const users = useISOStore((state) => state.users);
  const tasks = useISOStore((state) => state.tasks);
  const templates = useISOStore((state) => state.emailTemplates);
  const campaigns = useISOStore((state) => state.emailCampaigns);
  const communicationSettings = useISOStore((state) => state.communicationSettings);
  const hydrate = useISOStore((state) => state.hydrate);

  const activeUsers = React.useMemo(() => users.filter((user) => user.active), [users]);
  const availableRoles = React.useMemo(
    () => Array.from(new Set(activeUsers.map((user) => user.role))),
    [activeUsers]
  );

  const [settingsForm, setSettingsForm] = React.useState<CommunicationSettings>(communicationSettings);
  const [message, setMessage] = React.useState('');
  const [templateForm, setTemplateForm] = React.useState(baseEmailModel);
  const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = React.useState<DeliveryMode>('massive');
  const [selectedRole, setSelectedRole] = React.useState<UserRole | 'all'>('all');
  const [selectedRecipientId, setSelectedRecipientId] = React.useState<string>('');
  const [campaignForm, setCampaignForm] = React.useState({
    name: 'Comunicado de tareas por vencer',
    templateId: templates[0]?.id ?? '',
    daysAhead: 7,
    recipientIds: activeUsers.map((user) => user.id),
  });

  React.useEffect(() => {
    setSettingsForm(communicationSettings);
  }, [communicationSettings]);

  React.useEffect(() => {
    if (!campaignForm.templateId && templates[0]) {
      setCampaignForm((current) => ({ ...current, templateId: templates[0].id }));
    }
  }, [campaignForm.templateId, templates]);

  React.useEffect(() => {
    if (!selectedRecipientId && activeUsers[0]) {
      setSelectedRecipientId(activeUsers[0].id);
    }
  }, [activeUsers, selectedRecipientId]);

  const showMessage = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 2500);
  };

  const refreshData = async (successMessage?: string) => {
    hydrate(await fetchBootstrap());
    if (successMessage) {
      showMessage(successMessage);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm(baseEmailModel);
    setEditingTemplateId(null);
  };

  const dueSoonTasks = React.useMemo(() => {
    const now = Date.now();
    const maxDate = now + campaignForm.daysAhead * 24 * 60 * 60 * 1000;
    return tasks.filter(
      (task) =>
        task.status !== 'completed' &&
        task.dueDate.getTime() >= now &&
        task.dueDate.getTime() <= maxDate
    );
  }, [campaignForm.daysAhead, tasks]);

  const resolvedRecipients = React.useMemo(() => {
    if (deliveryMode === 'personal') {
      return activeUsers.filter((user) => user.id === selectedRecipientId);
    }

    if (deliveryMode === 'group') {
      return activeUsers.filter((user) => selectedRole === 'all' || user.role === selectedRole);
    }

    return activeUsers;
  }, [activeUsers, deliveryMode, selectedRecipientId, selectedRole]);

  React.useEffect(() => {
    setCampaignForm((current) => ({
      ...current,
      recipientIds: resolvedRecipients.map((user) => user.id),
    }));
  }, [resolvedRecipients]);

  const recipientModeLabel =
    deliveryMode === 'personal'
      ? 'Envío personalizado'
      : deliveryMode === 'group'
        ? 'Envío por grupo'
        : 'Envío masivo';

  const handleSaveIntegration = async () => {
    await updateCommunicationSettings(settingsForm);
    await refreshData('Integración de comunicados actualizada.');
  };

  const handleTemplateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (editingTemplateId) {
      await updateEmailTemplate(editingTemplateId, templateForm);
      await refreshData('Plantilla actualizada correctamente.');
      resetTemplateForm();
      return;
    }

    await createEmailTemplate(templateForm);
    await refreshData('Plantilla creada correctamente.');
    resetTemplateForm();
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
    });
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (!window.confirm(`Eliminar la plantilla "${template.name}"?`)) {
      return;
    }

    await deleteEmailTemplate(template.id);
    await refreshData('Plantilla eliminada correctamente.');
    if (editingTemplateId === template.id) {
      resetTemplateForm();
    }
  };

  const handleUploadTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    setTemplateForm({
      name: file.name.replace(/\.[^.]+$/, ''),
      subject: baseEmailModel.subject,
      content,
    });
  };

  const handleSendCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendBulkTaskReminderCampaign(campaignForm);
    await refreshData(`${recipientModeLabel} enviado al entorno de pruebas.`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f8fbff_42%,#eef4fb_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">
              Centro de comunicados
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-700">
              Diseña campañas listas para grupos, envíos masivos o mensajes personalizados
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Este módulo está pensado para conectar correo saliente, calendario y chat de trabajo
              desde variables de entorno claras, con una base compatible con Gmail, Google Calendar,
              Render y opciones gratuitas para desarrollo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Destinatarios</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-700">{resolvedRecipients.length}</p>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Plantillas</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-700">{templates.length}</p>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Campañas</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-700">{campaigns.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {integrationCards.map((card) => {
          const Icon = card.icon;
          return (
            <section
              key={card.title}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl p-3 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-700">{card.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{card.subtitle}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">{card.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {card.envs.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#727cf5]/10 p-3 text-[#727cf5]">
                <MailCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-700">Canal activo</h3>
                <p className="mt-1 text-sm text-slate-400">Proveedor y remitente del módulo</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Proveedor</p>
                <p className="mt-2 text-lg font-extrabold text-slate-700">
                  {settingsForm.providerName || 'Sin definir'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Remitente</p>
                <p className="mt-2 text-sm font-bold text-slate-700">{settingsForm.senderName}</p>
                <p className="mt-1 text-xs text-slate-400">{settingsForm.senderEmail}</p>
              </div>
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
                <span className="font-semibold text-slate-700">Integración habilitada</span>
                <input
                  type="checkbox"
                  checked={settingsForm.enabled}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, enabled: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#39afd1]/10 p-3 text-[#39afd1]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-700">Modelo de envío</h3>
                <p className="mt-1 text-sm text-slate-400">Personal, grupo o masivo</p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {[
                { value: 'personal', label: 'Personalizado', icon: MailCheck },
                { value: 'group', label: 'Por grupo', icon: Users },
                { value: 'massive', label: 'Masivo', icon: Users2 },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDeliveryMode(option.value as DeliveryMode)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-4 text-left transition ${
                      deliveryMode === option.value
                        ? 'bg-[#727cf5] text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="font-bold">{option.label}</span>
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em]">
                      {deliveryMode === option.value ? 'Activo' : 'Disponible'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-4">
              {deliveryMode === 'personal' && (
                <div>
                  <label className="block text-sm font-bold text-slate-600">Destinatario</label>
                  <select
                    value={selectedRecipientId}
                    onChange={(event) => setSelectedRecipientId(event.target.value)}
                    className="admin-select mt-2 w-full"
                  >
                    {activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {deliveryMode === 'group' && (
                <div>
                  <label className="block text-sm font-bold text-slate-600">Grupo / rol</label>
                  <select
                    value={selectedRole}
                    onChange={(event) =>
                      setSelectedRole(event.target.value as UserRole | 'all')
                    }
                    className="admin-select mt-2 w-full"
                  >
                    <option value="all">Todos los roles activos</option>
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Alcance actual
                </p>
                <p className="mt-2 text-lg font-extrabold text-slate-700">{recipientModeLabel}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {resolvedRecipients.length} destinatario(s) activos seleccionados para el envío.
                </p>
              </div>
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-700">Configuración del proveedor</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Mapea aquí el proveedor visible del módulo y persiste los secretos reales en `env`.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveIntegration()}
                className="rounded-xl bg-[#727cf5] px-5 py-3 font-bold text-white transition hover:bg-[#636df0]"
              >
                Guardar integración
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-600">Proveedor</label>
                <input
                  value={settingsForm.providerName}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, providerName: event.target.value })
                  }
                  className="admin-input mt-2"
                  placeholder="gmail_smtp / render_webhook / smtp_custom"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600">API base / webhook</label>
                <input
                  value={settingsForm.apiBaseUrl}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, apiBaseUrl: event.target.value })
                  }
                  className="admin-input mt-2"
                  placeholder="https://tu-servicio.onrender.com/api/mail/send"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600">Remitente</label>
                <input
                  value={settingsForm.senderName}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, senderName: event.target.value })
                  }
                  className="admin-input mt-2"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600">Correo remitente</label>
                <input
                  value={settingsForm.senderEmail}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, senderEmail: event.target.value })
                  }
                  className="admin-input mt-2"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600">Reply-To</label>
                <input
                  value={settingsForm.replyTo}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, replyTo: event.target.value })
                  }
                  className="admin-input mt-2"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600">Referencia de credencial</label>
                <input
                  value={settingsForm.apiKeyHint}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, apiKeyHint: event.target.value })
                  }
                  className="admin-input mt-2"
                  placeholder="google-refresh-token / render-secret / smtp-pass"
                />
              </div>
            </div>
          </section>

          <div className="grid gap-6 2xl:grid-cols-[1fr_0.95fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-700">Constructor de plantillas</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Variables: {'{{userName}}'}, {'{{taskCount}}'}, {'{{daysAhead}}'}, {'{{companyName}}'}, {'{{dueSummary}}'}, {'{{taskTable}}'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateForm(baseEmailModel)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Usar modelo base
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    Subir plantilla
                    <input
                      type="file"
                      accept=".html,.txt"
                      className="hidden"
                      onChange={handleUploadTemplate}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Layers3 className="h-4 w-4" />
                  <p className="text-sm font-semibold">
                    Modelo recomendado: saludo contextual, resumen de vencimientos y bloque de tareas.
                  </p>
                </div>
              </div>

              <form onSubmit={handleTemplateSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600">Nombre</label>
                  <input
                    value={templateForm.name}
                    onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
                    className="admin-input mt-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600">Asunto</label>
                  <input
                    value={templateForm.subject}
                    onChange={(event) =>
                      setTemplateForm({ ...templateForm, subject: event.target.value })
                    }
                    className="admin-input mt-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600">Contenido</label>
                  <textarea
                    value={templateForm.content}
                    onChange={(event) =>
                      setTemplateForm({ ...templateForm, content: event.target.value })
                    }
                    className="admin-input mt-2 min-h-[260px] resize-y font-mono text-[13px]"
                    required
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-xl bg-[#39afd1] px-5 py-3 font-bold text-white transition hover:bg-[#2f9cbc]"
                  >
                    {editingTemplateId ? 'Actualizar plantilla' : 'Crear plantilla'}
                  </button>
                  {editingTemplateId && (
                    <button
                      type="button"
                      onClick={resetTemplateForm}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-700">Plantillas guardadas</h3>
              <div className="mt-5 space-y-3">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700">{template.name}</p>
                        <p className="mt-1 truncate text-sm text-slate-400">{template.subject}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditTemplate(template)}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteTemplate(template)}
                          className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-700">Composición de campaña</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Prepara un envío alineado al modo seleccionado y al rango de tareas por vencer.
                  </p>
                </div>
                <Send className="h-5 w-5 text-[#0acf97]" />
              </div>

              <form onSubmit={handleSendCampaign} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600">Nombre del envío</label>
                  <input
                    value={campaignForm.name}
                    onChange={(event) => setCampaignForm({ ...campaignForm, name: event.target.value })}
                    className="admin-input mt-2"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-600">Plantilla</label>
                    <select
                      value={campaignForm.templateId}
                      onChange={(event) =>
                        setCampaignForm({ ...campaignForm, templateId: event.target.value })
                      }
                      className="admin-select mt-2 w-full"
                    >
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600">Días hacia adelante</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={campaignForm.daysAhead}
                      onChange={(event) =>
                        setCampaignForm({
                          ...campaignForm,
                          daysAhead: Number(event.target.value) || 1,
                        })
                      }
                      className="admin-input mt-2"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Alcance del envío</p>
                  <p className="mt-2 text-lg font-extrabold text-slate-700">{recipientModeLabel}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {resolvedRecipients.length} destinatario(s) · {dueSoonTasks.length} tarea(s) dentro de la ventana definida.
                  </p>
                </div>

                <div>
                  <p className="block text-sm font-bold text-slate-600">Destinatarios resueltos</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resolvedRecipients.map((user) => (
                      <span
                        key={user.id}
                        className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
                      >
                        {user.name}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!campaignForm.templateId || resolvedRecipients.length === 0}
                  className="rounded-xl bg-[#0acf97] px-5 py-3 font-bold text-white transition hover:bg-[#09b685] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Enviar comunicado de prueba
                </button>
              </form>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-700">Vista operativa</h3>
              <div className="mt-5 space-y-3">
                {dueSoonTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-700">{task.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{task.assignedTo}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                        {task.dueDate.toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  </div>
                ))}
                {dueSoonTasks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    No hay tareas por vencer dentro del rango seleccionado.
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">
                  Últimos envíos
                </p>
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-bold text-slate-700">{campaign.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {campaign.recipientCount} destinatario(s) · {campaign.taskCount} tarea(s)
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Enviado {campaign.sentAt?.toLocaleString('es-CL')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
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
