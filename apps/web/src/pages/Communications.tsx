import React from 'react';
import { MailCheck, Pencil, Send, Sparkles, Trash2, Upload } from 'lucide-react';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  fetchBootstrap,
  sendBulkTaskReminderCampaign,
  updateCommunicationSettings,
  updateEmailTemplate,
} from '../lib/api';
import { useISOStore } from '../store/useISOStore';
import type { CommunicationSettings, EmailTemplate } from '../types/iso';

export const Communications: React.FC = () => {
  const users = useISOStore((state) => state.users);
  const tasks = useISOStore((state) => state.tasks);
  const templates = useISOStore((state) => state.emailTemplates);
  const campaigns = useISOStore((state) => state.emailCampaigns);
  const communicationSettings = useISOStore((state) => state.communicationSettings);
  const hydrate = useISOStore((state) => state.hydrate);

  const [settingsForm, setSettingsForm] = React.useState<CommunicationSettings>(communicationSettings);
  const [message, setMessage] = React.useState('');
  const [templateForm, setTemplateForm] = React.useState({
    name: '',
    subject: '',
    content: '',
  });
  const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null);
  const [campaignForm, setCampaignForm] = React.useState({
    name: 'Comunicado de tareas por vencer',
    templateId: templates[0]?.id ?? '',
    daysAhead: 7,
    recipientIds: users.filter((user) => user.active).map((user) => user.id),
  });

  React.useEffect(() => {
    setSettingsForm(communicationSettings);
  }, [communicationSettings]);

  React.useEffect(() => {
    if (!campaignForm.templateId && templates[0]) {
      setCampaignForm((current) => ({ ...current, templateId: templates[0].id }));
    }
  }, [campaignForm.templateId, templates]);

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
    setTemplateForm({ name: '', subject: '', content: '' });
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

  const activeRecipients = React.useMemo(
    () => users.filter((user) => user.active && campaignForm.recipientIds.includes(user.id)),
    [campaignForm.recipientIds, users]
  );

  const handleSaveIntegration = async () => {
    await updateCommunicationSettings(settingsForm);
    await refreshData('Integración de correos actualizada.');
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
      subject: 'Comunicado de tareas por vencer - {{companyName}}',
      content,
    });
  };

  const handleSendCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendBulkTaskReminderCampaign(campaignForm);
    await refreshData('Comunicado enviado al entorno masivo de pruebas.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-700">Comunicados</h2>
        <p className="mt-1 text-sm text-slate-400">
          Diseña plantillas, configura tu canal de envío y ejecuta campañas masivas por tareas próximas a vencer.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#727cf5]/10 p-3 text-[#727cf5]">
                <MailCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="panel-title">Integración</h3>
                <p className="mt-1 text-sm text-slate-400">Canal de salida del módulo</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Proveedor
                </p>
                <p className="mt-2 text-lg font-extrabold text-slate-700">
                  {settingsForm.providerName || 'Sin definir'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Remitente
                </p>
                <p className="mt-2 text-sm font-bold text-slate-700">{settingsForm.senderName}</p>
                <p className="mt-1 text-xs text-slate-400">{settingsForm.senderEmail}</p>
              </div>
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
                <span className="font-semibold text-slate-700">Entorno habilitado</span>
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
                <h3 className="panel-title">Resumen operativo</h3>
                <p className="mt-1 text-sm text-slate-400">Vista rápida del envío actual</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                <span className="text-sm font-semibold text-slate-500">Destinatarios</span>
                <strong className="text-slate-700">{activeRecipients.length}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                <span className="text-sm font-semibold text-slate-500">Tareas por vencer</span>
                <strong className="text-slate-700">{dueSoonTasks.length}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                <span className="text-sm font-semibold text-slate-500">Plantillas</span>
                <strong className="text-slate-700">{templates.length}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                <span className="text-sm font-semibold text-slate-500">Campañas emitidas</span>
                <strong className="text-slate-700">{campaigns.length}</strong>
              </div>
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="panel-title">Configuración del proveedor</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Datos del canal de salida a usar cuando llevemos este módulo a producción.
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
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600">API base</label>
                <input
                  value={settingsForm.apiBaseUrl}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, apiBaseUrl: event.target.value })
                  }
                  className="admin-input mt-2"
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
                <label className="block text-sm font-bold text-slate-600">Referencia de API key</label>
                <input
                  value={settingsForm.apiKeyHint}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, apiKeyHint: event.target.value })
                  }
                  className="admin-input mt-2"
                />
              </div>
            </div>
          </section>

          <div className="grid gap-6 2xl:grid-cols-[1fr_0.95fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="panel-title">Constructor de plantillas</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Variables: {'{{userName}}'}, {'{{taskCount}}'}, {'{{daysAhead}}'}, {'{{companyName}}'}, {'{{dueSummary}}'}, {'{{taskTable}}'}
                  </p>
                </div>
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
                    className="admin-input mt-2 min-h-[220px] resize-y"
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
              <h3 className="panel-title">Plantillas guardadas</h3>
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
                  <h3 className="panel-title">Emisión de campaña</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Genera un lote masivo con tareas próximas a vencer.
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

                <div>
                  <p className="block text-sm font-bold text-slate-600">Destinatarios</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {users
                      .filter((user) => user.active)
                      .map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                        >
                          <span className="font-semibold text-slate-700">{user.name}</span>
                          <input
                            type="checkbox"
                            checked={campaignForm.recipientIds.includes(user.id)}
                            onChange={(event) =>
                              setCampaignForm((current) => ({
                                ...current,
                                recipientIds: event.target.checked
                                  ? [...current.recipientIds, user.id]
                                  : current.recipientIds.filter((id) => id !== user.id),
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                        </label>
                      ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!campaignForm.templateId || campaignForm.recipientIds.length === 0}
                  className="rounded-xl bg-[#0acf97] px-5 py-3 font-bold text-white transition hover:bg-[#09b685] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Enviar comunicado de prueba
                </button>
              </form>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="panel-title">Vista operativa</h3>
              <div className="mt-5 space-y-3">
                {dueSoonTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
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
