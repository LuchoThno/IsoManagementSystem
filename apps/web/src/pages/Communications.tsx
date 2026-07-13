import React from 'react';
import {
  Bot,
  CheckCircle2,
  Layers3,
  MailCheck,
  Pencil,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Users2,
} from 'lucide-react';
import {
  draftCommunicationCampaignWithAI,
  type CommunicationCampaignDraftResult,
} from '../lib/aiApi';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  fetchBootstrapShell,
  fetchCommunicationCompatibility,
  listUsers,
  sendBulkTaskReminderCampaign,
  updateCommunicationSettings,
  updateEmailTemplate,
} from '../lib/api';
import { useUIPermissions } from '../hooks/useUIPermissions';
import { useISOStore } from '../store/useISOStore';
import type {
  CommunicationCompatibility,
  CommunicationProviderType,
  CommunicationSettings,
  EmailTemplate,
  UserRole,
} from '../types/iso';

type DeliveryMode = 'personal' | 'group' | 'massive';

const baseEmailModel = {
  name: 'Modelo operativo de comunicado',
  subject: '[{{companyName}}] Seguimiento de tareas y acciones pendientes',
  content: `<div style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.6">
  <p style="font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin:0 0 12px">Comunicado operativo</p>
  <h1 style="font-size:24px;margin:0 0 16px">Hola {{userName}},</h1>
  <p>Tienes <strong>{{taskCount}}</strong> tarea(s) con vencimiento dentro de los proximos <strong>{{daysAhead}}</strong> dias.</p>
  <p>{{dueSummary}}</p>
  <div style="margin:20px 0;padding:20px;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc">
    {{taskTable}}
  </div>
  <p>Si necesitas apoyo, responde este mensaje o coordina con el equipo de calidad.</p>
  <p style="margin-top:24px">Saludos,<br /><strong>{{companyName}}</strong></p>
</div>`,
};

const providerCards: Array<{
  type: CommunicationProviderType;
  title: string;
  subtitle: string;
  tone: string;
  envs: string[];
  detail: string;
}> = [
  {
    type: 'resend',
    title: 'Resend',
    subtitle: 'SDK oficial para Node',
    tone: 'from-[#0f172a] via-[#1e293b] to-[#334155] text-white',
    envs: ['RESEND_API_KEY'],
    detail: 'Es la opcion mas directa para Vercel, VPS y despliegues dockerizados.',
  },
  {
    type: 'gmail',
    title: 'Gmail API',
    subtitle: 'OAuth con googleapis',
    tone: 'from-[#2563eb] via-[#0ea5e9] to-[#22c55e] text-white',
    envs: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'],
    detail: 'Compatible con Google Workspace, aunque su configuracion es mas sensible.',
  },
  {
    type: 'custom',
    title: 'Webhook propio',
    subtitle: 'Pasarela interna o backend existente',
    tone: 'from-[#f97316] via-[#fb7185] to-[#f43f5e] text-white',
    envs: ['COMMUNICATIONS_WEBHOOK_URL', 'COMMUNICATIONS_WEBHOOK_TOKEN'],
    detail: 'Mantiene compatibilidad con un orquestador de correo externo o legado.',
  },
];

const providerLabels: Record<CommunicationProviderType, string> = {
  resend: 'Resend',
  gmail: 'Gmail API',
  custom: 'Webhook personalizado',
};

const aiGoalPresets = [
  'impulsar seguimiento de tareas próximas y confirmar responsables',
  'acelerar cierre de tareas críticas esta semana',
  'recordar vencimientos con tono preventivo y claro',
  'escalar retrasos sin perder un tono colaborativo',
];

const aiTonePresets = [
  'claro, ejecutivo y accionable',
  'cercano, ordenado y tranquilizador',
  'preventivo, formal y orientado a cumplimiento',
  'directo, breve y enfocado en responsables',
];

const renderTemplate = (
  template: Pick<EmailTemplate, 'subject' | 'content'> | typeof baseEmailModel,
  context: Record<string, string | number>
) => {
  const replace = (value: string) =>
    Object.entries(context).reduce(
      (current, [key, replacement]) => current.replaceAll(`{{${key}}}`, String(replacement)),
      value
    );

  return {
    subject: replace(template.subject),
    body: replace(template.content),
  };
};

export const Communications: React.FC = () => {
  const {
    loading,
    canManageCommunicationSettings,
    canManageCommunicationTemplates,
    canSendCommunicationCampaigns,
    canViewCommunicationContent,
  } = useUIPermissions();
  const users = useISOStore((state) => state.users);
  const tasks = useISOStore((state) => state.tasks);
  const templates = useISOStore((state) => state.emailTemplates);
  const campaigns = useISOStore((state) => state.emailCampaigns);
  const communicationSettings = useISOStore((state) => state.communicationSettings);
  const settings = useISOStore((state) => state.settings);
  const hydrateShell = useISOStore((state) => state.hydrateShell);
  const replaceUsers = useISOStore((state) => state.replaceUsers);

  const activeUsers = React.useMemo(() => users.filter((user) => user.active), [users]);
  const deliverableUsers = React.useMemo(
    () => activeUsers.filter((user) => user.email.trim().length > 0),
    [activeUsers]
  );
  const activeUsersWithoutEmail = React.useMemo(
    () => activeUsers.filter((user) => user.email.trim().length === 0),
    [activeUsers]
  );
  const availableRoles = React.useMemo(
    () => Array.from(new Set(deliverableUsers.map((user) => user.role))),
    [deliverableUsers]
  );

  const [settingsForm, setSettingsForm] = React.useState<CommunicationSettings>(communicationSettings);
  const [message, setMessage] = React.useState('');
  const [templateForm, setTemplateForm] = React.useState(baseEmailModel);
  const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = React.useState<DeliveryMode>('massive');
  const [selectedRole, setSelectedRole] = React.useState<UserRole | 'all'>('all');
  const [selectedRecipientId, setSelectedRecipientId] = React.useState<string>('');
  const [aiCampaignGoal, setAiCampaignGoal] = React.useState(
    'impulsar seguimiento de tareas próximas y confirmar responsables'
  );
  const [aiTone, setAiTone] = React.useState('claro, ejecutivo y accionable');
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiDraft, setAiDraft] = React.useState<CommunicationCampaignDraftResult | null>(null);
  const [compatibility, setCompatibility] = React.useState<CommunicationCompatibility | null>(null);
  const [compatibilityLoading, setCompatibilityLoading] = React.useState(true);
  const [campaignForm, setCampaignForm] = React.useState({
    name: 'Comunicado de tareas por vencer',
    templateId: templates[0]?.id ?? '',
    daysAhead: 7,
    recipientIds: deliverableUsers.map((user) => user.id),
  });
  const isAccessResolved = !loading;
  const canViewCommunications = canViewCommunicationContent;
  const canManageSettings = canManageCommunicationSettings;
  const canManageTemplates = canManageCommunicationTemplates;
  const canSendCampaigns = canSendCommunicationCampaigns;

  React.useEffect(() => {
    setSettingsForm(communicationSettings);
  }, [communicationSettings]);

  React.useEffect(() => {
    if (!campaignForm.templateId && templates[0]) {
      setCampaignForm((current) => ({ ...current, templateId: templates[0].id }));
    }
  }, [campaignForm.templateId, templates]);

  React.useEffect(() => {
    if (deliverableUsers.length === 0) {
      if (selectedRecipientId) {
        setSelectedRecipientId('');
      }
      return;
    }

    const recipientStillAvailable = deliverableUsers.some((user) => user.id === selectedRecipientId);
    if (!recipientStillAvailable) {
      setSelectedRecipientId(deliverableUsers[0].id);
    }
  }, [deliverableUsers, selectedRecipientId]);

  React.useEffect(() => {
    const loadCompatibility = async () => {
      try {
        setCompatibilityLoading(true);
        setCompatibility(await fetchCommunicationCompatibility());
      } finally {
        setCompatibilityLoading(false);
      }
    };

    void loadCompatibility();
  }, []);

  const showMessage = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 3000);
  };

  const refreshAudienceDirectory = React.useCallback(async () => {
    replaceUsers(await listUsers());
  }, [replaceUsers]);

  React.useEffect(() => {
    void refreshAudienceDirectory();
  }, [refreshAudienceDirectory]);

  const refreshData = async (successMessage?: string) => {
    const [shell, nextUsers] = await Promise.all([
      fetchBootstrapShell({ force: true }),
      listUsers(),
    ]);
    hydrateShell(shell);
    replaceUsers(nextUsers);
    if (successMessage) {
      showMessage(successMessage);
    }
  };

  const refreshCompatibility = async () => {
    setCompatibilityLoading(true);
    try {
      setCompatibility(await fetchCommunicationCompatibility());
    } finally {
      setCompatibilityLoading(false);
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
      return deliverableUsers.filter((user) => user.id === selectedRecipientId);
    }

    if (deliveryMode === 'group') {
      return deliverableUsers.filter(
        (user) => selectedRole === 'all' || user.role === selectedRole
      );
    }

    return deliverableUsers;
  }, [deliverableUsers, deliveryMode, selectedRecipientId, selectedRole]);

  const recipientNames = React.useMemo(
    () => new Set(resolvedRecipients.map((user) => user.name)),
    [resolvedRecipients]
  );

  const targetedDueSoonTasks = React.useMemo(
    () => dueSoonTasks.filter((task) => recipientNames.has(task.assignedTo)),
    [dueSoonTasks, recipientNames]
  );

  const urgencyBreakdown = React.useMemo(() => {
    const now = Date.now();
    return targetedDueSoonTasks.reduce(
      (accumulator, task) => {
        const diffDays = Math.ceil((task.dueDate.getTime() - now) / (24 * 60 * 60 * 1000));
        if (diffDays <= 2) {
          accumulator.critical += 1;
        } else if (diffDays <= 5) {
          accumulator.upcoming += 1;
        } else {
          accumulator.planned += 1;
        }
        return accumulator;
      },
      { critical: 0, upcoming: 0, planned: 0 }
    );
  }, [targetedDueSoonTasks]);

  React.useEffect(() => {
    setCampaignForm((current) => ({
      ...current,
      recipientIds: resolvedRecipients.map((user) => user.id),
    }));
  }, [resolvedRecipients]);

  const recipientModeLabel =
    deliveryMode === 'personal'
      ? 'Envio personalizado'
      : deliveryMode === 'group'
      ? 'Envio por grupo'
      : 'Envio masivo';

  const audienceLabel =
    deliveryMode === 'personal'
      ? resolvedRecipients[0]?.name ?? 'destinatario individual'
      : deliveryMode === 'group'
        ? selectedRole === 'all'
          ? 'todos los roles activos'
          : `rol ${selectedRole}`
        : 'toda la base activa';

  const urgencyLabel =
    urgencyBreakdown.critical > 0
      ? 'urgencia alta'
      : urgencyBreakdown.upcoming > 0
        ? 'urgencia media'
        : 'seguimiento preventivo';

  const audienceInsights = React.useMemo(() => {
    if (resolvedRecipients.length === 0) {
      return 'sin destinatarios utilizables';
    }

    const roleSummary =
      deliveryMode === 'group' && selectedRole !== 'all'
        ? `segmentado por rol ${selectedRole}`
        : `${availableRoles.length} rol(es) con correo disponible`;

    return [
      `${resolvedRecipients.length} destinatario(s) activos con correo`,
      `${targetedDueSoonTasks.length} tarea(s) dentro de la ventana`,
      `${urgencyBreakdown.critical} crítica(s)`,
      `${urgencyBreakdown.upcoming} próxima(s)`,
      `${urgencyBreakdown.planned} planificada(s)`,
      roleSummary,
    ].join(', ');
  }, [
    availableRoles.length,
    deliveryMode,
    resolvedRecipients.length,
    selectedRole,
    targetedDueSoonTasks.length,
    urgencyBreakdown.critical,
    urgencyBreakdown.planned,
    urgencyBreakdown.upcoming,
  ]);

  const selectedTemplate =
    templates.find((template) => template.id === campaignForm.templateId) ?? templates[0] ?? null;
  const previewSource = editingTemplateId ? templateForm : selectedTemplate ?? templateForm;
  const previewContext = React.useMemo(() => {
    const sampleRecipient = resolvedRecipients[0];
    const sampleTasks = dueSoonTasks
      .filter((task) =>
        sampleRecipient ? task.assignedTo === sampleRecipient.name : true
      )
      .slice(0, 4);

    return {
      companyName: settings.companyName,
      userName: sampleRecipient?.name ?? 'Equipo ISO',
      taskCount: sampleTasks.length,
      daysAhead: campaignForm.daysAhead,
      dueSummary:
        sampleTasks.length > 0
          ? sampleTasks.map((task) => `${task.title} (${task.assignedTo})`).join(', ')
          : 'Sin tareas por vencer en este rango.',
      taskTable:
        sampleTasks.length > 0
          ? `<ul style="padding-left:20px;margin:0">${sampleTasks
              .map(
                (task) =>
                  `<li style="margin:0 0 8px"><strong>${task.title}</strong> - ${task.assignedTo} - ${task.dueDate.toLocaleDateString(
                    'es-CL'
                  )}</li>`
              )
              .join('')}</ul>`
          : '<p style="margin:0">No hay tareas por vencer.</p>',
    };
  }, [campaignForm.daysAhead, dueSoonTasks, resolvedRecipients, settings.companyName]);

  const previewEmail = renderTemplate(previewSource, previewContext);
  const selectedProviderCompatibility =
    compatibility?.providers.find((provider) => provider.selected) ?? null;

  const handleSaveIntegration = async () => {
    if (!canManageSettings) {
      showMessage('Tu sesión no tiene permisos para modificar la integración de comunicados.');
      return;
    }

    await updateCommunicationSettings(settingsForm);
    await Promise.all([refreshData('Integracion de comunicados actualizada.'), refreshCompatibility()]);
  };

  const handleTemplateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManageTemplates) {
      showMessage('Tu sesión no tiene permisos para gestionar plantillas.');
      return;
    }

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
    if (!canManageTemplates) {
      showMessage('Tu sesión puede revisar el módulo, pero no editar plantillas.');
      return;
    }

    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
    });
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (!canManageTemplates) {
      showMessage('Tu sesión no tiene permisos para eliminar plantillas.');
      return;
    }

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
    if (!canManageTemplates) {
      showMessage('Tu sesión no tiene permisos para cargar plantillas.');
      return;
    }

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

    if (!canSendCampaigns) {
      showMessage('Tu sesión no tiene permisos para enviar campañas.');
      return;
    }

    if (resolvedRecipients.length === 0) {
      showMessage('No hay destinatarios con correo válido para este envío.');
      return;
    }

    const result = await sendBulkTaskReminderCampaign({
      ...campaignForm,
      recipientNames: resolvedRecipients.map((user) => user.name),
      recipientEmails: resolvedRecipients.map((user) => user.email),
    });

    await refreshData(
      result.status === 'failed'
        ? `El envio quedo registrado como fallido: ${result.errorMessage || 'sin detalle'}`
        : `${recipientModeLabel} enviado por ${providerLabels[settingsForm.providerType]}.`
    );
    await refreshCompatibility();
  };

  const handleDraftCampaignWithAI = async () => {
    if (!canManageTemplates && !canSendCampaigns) {
      showMessage('Tu sesión no tiene permisos para usar el copiloto de comunicaciones.');
      return;
    }

    try {
      setAiBusy(true);
      const result = await draftCommunicationCampaignWithAI({
        companyName: settings.companyName,
        senderName: settingsForm.senderName,
        deliveryMode,
        audienceLabel,
        audienceInsights,
        campaignGoal: aiCampaignGoal,
        daysAhead: campaignForm.daysAhead,
        recipientCount: resolvedRecipients.length,
        taskCount: targetedDueSoonTasks.length,
        urgencyLabel,
        excludedUsersCount: activeUsersWithoutEmail.length,
        providerType: settingsForm.providerType,
        tone: aiTone,
        currentTemplateName: templateForm.name,
      });
      setAiDraft(result);
      showMessage('Borrador IA generado para la campaña.');
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible generar el borrador IA para comunicaciones.'
      );
    } finally {
      setAiBusy(false);
    }
  };

  const applyAiDraftToTemplate = () => {
    if (!aiDraft) {
      return;
    }

    setTemplateForm({
      name: aiDraft.recommendedTemplateName,
      subject: aiDraft.subject,
      content: aiDraft.html,
    });
    setCampaignForm((current) => ({
      ...current,
      name: aiDraft.recommendedCampaignName,
    }));
    setEditingTemplateId(null);
    showMessage('Borrador IA aplicado al constructor.');
  };

  return (
    <div className="space-y-6">
      {isAccessResolved && !canViewCommunications && (
        <section className="rounded-[28px] border border-app-border bg-app-surface p-6 shadow-panel">
          <h3 className="panel-title">Acceso restringido</h3>
          <p className="mt-3 text-sm text-app-muted">
            Este entorno no resolvió permisos suficientes para consultar el módulo de comunicados.
          </p>
        </section>
      )}

      {isAccessResolved && canViewCommunications && (!canManageSettings || !canManageTemplates || !canSendCampaigns) && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {canManageSettings || canManageTemplates || canSendCampaigns
            ? 'Tu sesión tiene acceso parcial a Comunicados. Algunas acciones operativas quedarán en solo lectura según tu rol.'
            : 'Tu sesión sólo puede revisar el estado del módulo. La edición de integraciones, plantillas y campañas está bloqueada.'}
        </div>
      )}

      {(!isAccessResolved || canViewCommunications) && (
      <>
      <div className="overflow-hidden rounded-[36px] border border-app-border bg-[linear-gradient(135deg,#fff8ef_0%,#fffef9_30%,#eef6ff_68%,#f7fbff_100%)] shadow-panel">
        <div className="grid gap-6 px-6 py-7 xl:grid-cols-[1.3fr_0.8fr] xl:px-8 xl:py-8">
          <div className="relative">
            <div className="absolute -left-10 top-8 h-24 w-24 rounded-full bg-[#fb7185]/10 blur-2xl" />
            <div className="absolute left-40 top-0 h-28 w-28 rounded-full bg-[#38bdf8]/10 blur-2xl" />
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">
              Communication studio
            </p>
            <h2 className="relative mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-slate-800 xl:text-[2.55rem]">
              Diseña correos operativos con una interfaz más editorial, más clara y lista para envío real
            </h2>
            <p className="relative mt-4 max-w-2xl text-sm leading-6 text-slate-500 xl:text-[15px]">
              Esta vista se centra en componer, validar y despachar mensajes sin ruido visual.
              El proveedor se revisa contra backend real y el contenido se trabaja con una
              experiencia más cercana a un estudio de email que a un tablero técnico.
            </p>
            <div className="relative mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur">
                {resolvedRecipients.length} destinatarios listos
              </span>
              <span className="rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur">
                {templates.length} plantillas listas
              </span>
              <span className="rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur">
                Provider {providerLabels[settingsForm.providerType]}
              </span>
              <span className="rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur">
                Directorio sincronizado: {deliverableUsers.length}/{activeUsers.length}
              </span>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white/70 p-5 shadow-panel backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="rounded-[22px] bg-slate-900 px-4 py-3 text-white shadow-sm">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/70">
                  Estado actual
                </p>
                <p className="mt-2 text-lg font-extrabold">{recipientModeLabel}</p>
                <p className="mt-1 text-sm text-white/70">
                  {compatibility?.canSend ? 'Listo para envío real' : 'Pendiente de validación'}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Diagnóstico rápido
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedProviderCompatibility?.detail ||
                    'La compatibilidad del provider se mostrará aquí cuando el backend responda.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedProviderCompatibility?.missing.length
                    ? selectedProviderCompatibility.missing
                    : ['Configuración detectada']).map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-[30px] border border-app-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="app-icon-chip">
                <MailCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-700">Canal activo</h3>
                <p className="mt-1 text-sm text-slate-400">Proveedor y remitente del modulo</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-app-surface-alt px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Proveedor</p>
                <p className="mt-2 text-lg font-extrabold text-slate-700">
                  {providerLabels[settingsForm.providerType]}
                </p>
                <p className="mt-1 text-sm text-slate-400">{settingsForm.providerName}</p>
              </div>
              <div className="rounded-2xl bg-app-surface-alt px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Remitente</p>
                <p className="mt-2 text-sm font-bold text-slate-700">{settingsForm.senderName}</p>
                <p className="mt-1 text-xs text-slate-400">{settingsForm.senderEmail}</p>
              </div>
              <label className="flex items-center justify-between rounded-2xl border border-app-border px-4 py-4">
                <span className="font-semibold text-slate-700">Integracion habilitada</span>
                <input
                  type="checkbox"
                  checked={settingsForm.enabled}
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, enabled: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[30px] border border-app-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-app-info/10 p-3 text-app-info">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-700">Modelo de envio</h3>
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
                    disabled={!canSendCampaigns}
                    onClick={() => setDeliveryMode(option.value as DeliveryMode)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-4 text-left transition ${
                      deliveryMode === option.value
                        ? 'bg-app-primary text-white shadow-sm'
                        : 'bg-app-surface-alt text-slate-600 hover:bg-slate-100'
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
                    disabled={!canSendCampaigns}
                    onChange={(event) => setSelectedRecipientId(event.target.value)}
                    className="admin-select mt-2 w-full"
                  >
                    {deliverableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} · {user.email}
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
                    disabled={!canSendCampaigns}
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

              <div className="rounded-2xl border border-app-border bg-app-surface-alt px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Alcance actual
                </p>
                <p className="mt-2 text-lg font-extrabold text-slate-700">{recipientModeLabel}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {resolvedRecipients.length} destinatario(s) con correo válido seleccionados para el envio.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  La audiencia se obtiene desde el directorio activo del entorno y se refresca junto al módulo.
                </p>
                {activeUsersWithoutEmail.length > 0 ? (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {activeUsersWithoutEmail.length} usuario(s) activos quedaron fuera porque no tienen correo.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    {urgencyLabel}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    {urgencyBreakdown.critical} crítica(s)
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    {urgencyBreakdown.upcoming} próxima(s)
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    {urgencyBreakdown.planned} planificada(s)
                  </span>
                </div>
              </div>
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-app-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-6 shadow-panel">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-700">Proveedor de correo</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Resend es la integracion mas amigable para esta app; Gmail queda como alternativa y
                  el webhook propio mantiene compatibilidad con una pasarela existente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveIntegration()}
                disabled={!canManageSettings}
                className="app-button-primary px-5 py-3"
              >
                Guardar integracion
              </button>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {providerCards.map((provider) => {
                const currentCompatibility =
                  compatibility?.providers.find((item) => item.type === provider.type) ?? null;
                const isSelected = settingsForm.providerType === provider.type;
                return (
                  <button
                    key={provider.type}
                    type="button"
                    disabled={!canManageSettings}
                    onClick={() =>
                      setSettingsForm((current) => ({
                        ...current,
                        providerType: provider.type,
                        providerName: provider.title,
                      }))
                    }
                    className={`overflow-hidden rounded-[30px] border text-left transition ${
                      isSelected
                        ? 'border-slate-900 shadow-lg shadow-slate-200/70'
                        : 'border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-lg'
                    }`}
                  >
                    <div className={`bg-gradient-to-br p-5 ${provider.tone}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">
                            {provider.subtitle}
                          </p>
                          <h4 className="mt-2 text-2xl font-extrabold">{provider.title}</h4>
                        </div>
                        {currentCompatibility?.configured ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <ShieldAlert className="h-5 w-5" />
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/85">{provider.detail}</p>
                    </div>

                    <div className="space-y-4 bg-app-surface p-5">
                      <div className="flex flex-wrap gap-2">
                        {provider.envs.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="rounded-2xl bg-app-surface-alt px-4 py-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Compatibilidad
                        </p>
                        <p
                          className={`mt-2 text-sm font-bold ${
                            currentCompatibility?.configured ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {currentCompatibility?.configured
                            ? 'Listo para enviar'
                            : 'Faltan variables o configuracion'}
                        </p>
                        {!currentCompatibility?.configured && currentCompatibility?.missing.length ? (
                          <p className="mt-2 text-xs text-slate-500">
                            {currentCompatibility.missing.join(', ')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-600">Nombre visible del proveedor</label>
                <input
                  value={settingsForm.providerName}
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, providerName: event.target.value })
                  }
                  className="admin-input mt-2"
                  placeholder="Resend / Gmail API / Mail Gateway"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600">API base / webhook</label>
                <input
                  value={settingsForm.apiBaseUrl}
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, apiBaseUrl: event.target.value })
                  }
                  className="admin-input mt-2"
                  placeholder="https://tu-servicio/api/mail/send"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600">Remitente</label>
                <input
                  value={settingsForm.senderName}
                  disabled={!canManageSettings}
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
                  disabled={!canManageSettings}
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
                  disabled={!canManageSettings}
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
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, apiKeyHint: event.target.value })
                  }
                  className="admin-input mt-2"
                  placeholder="RESEND_API_KEY / GMAIL_REFRESH_TOKEN / secret interno"
                />
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-app-border bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
                    Estado del backend
                  </p>
                  <h4 className="mt-2 text-lg font-extrabold text-slate-700">
                    {compatibilityLoading
                      ? 'Verificando compatibilidad...'
                      : selectedProviderCompatibility?.configured
                        ? 'Proveedor compatible con la app'
                        : 'Proveedor aun no listo'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => void refreshCompatibility()}
                  className="app-button-secondary px-4 py-2.5 text-sm"
                >
                  Revalidar
                </button>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_0.9fr]">
                <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-700">
                    {selectedProviderCompatibility?.detail ||
                      'Aun no hay diagnostico del backend para este proveedor.'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {compatibility?.canSend
                      ? 'La app puede intentar un envio real con la configuracion actual.'
                      : 'La app seguira registrando la campaña, pero si faltan env o credenciales el envio quedara como fallido.'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
                    Recomendaciones
                  </p>
                  <div className="mt-3 space-y-2">
                    {(compatibility?.recommendations ?? ['No hay recomendaciones adicionales por ahora.']).map(
                      (item) => (
                        <p key={item} className="text-sm leading-6 text-slate-500">
                          {item}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 2xl:grid-cols-[1fr_0.95fr]">
            <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-6 shadow-sm">
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
                    disabled={!canManageTemplates}
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
                      disabled={!canManageTemplates}
                      onChange={handleUploadTemplate}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Layers3 className="h-4 w-4" />
                  <p className="text-sm font-semibold">
                    Diseno recomendado: cabecera clara, resumen ejecutivo y bloque de tareas escaneable.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[26px] border border-app-primary/15 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_45%,#fff7ed_100%)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-app-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-app-primary">
                      <Bot className="h-3.5 w-3.5" />
                      Copilot de comunicaciones
                    </div>
                    <h4 className="mt-3 text-lg font-extrabold text-slate-700">
                      Diseña y redacta campañas masivas con mejores prácticas
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Genera una propuesta de asunto, HTML, enfoque editorial y checklist operativo según canal, audiencia y objetivo.
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 text-app-primary" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {aiGoalPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={!canManageTemplates && !canSendCampaigns}
                      onClick={() => setAiCampaignGoal(preset)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        aiCampaignGoal === preset
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-600">Objetivo del envío</label>
                    <input
                      value={aiCampaignGoal}
                      disabled={!canManageTemplates && !canSendCampaigns}
                      onChange={(event) => setAiCampaignGoal(event.target.value)}
                      className="admin-input mt-2"
                      placeholder="Ej: acelerar cierre de tareas críticas"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600">Tono</label>
                    <input
                      value={aiTone}
                      disabled={!canManageTemplates && !canSendCampaigns}
                      onChange={(event) => setAiTone(event.target.value)}
                      className="admin-input mt-2"
                      placeholder="Ej: ejecutivo, cercano y accionable"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {aiTonePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={!canManageTemplates && !canSendCampaigns}
                      onClick={() => setAiTone(preset)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        aiTone === preset
                          ? 'bg-app-primary text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    Audiencia: {audienceLabel}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    Modo: {recipientModeLabel}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    Ventana: {campaignForm.daysAhead} días
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    Correos utilizables: {resolvedRecipients.length}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    Prioridad: {urgencyLabel}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Usuarios activos
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-700">{activeUsers.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Enviables
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-700">{deliverableUsers.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Excluidos sin correo
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-700">
                      {activeUsersWithoutEmail.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Contexto que usará la IA
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{audienceInsights}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={aiBusy || (!canManageTemplates && !canSendCampaigns)}
                    onClick={() => void handleDraftCampaignWithAI()}
                    className="app-button-primary px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiBusy ? 'Diseñando campaña...' : 'Generar borrador IA'}
                  </button>
                  {aiDraft ? (
                    <button
                      type="button"
                      disabled={!canManageTemplates}
                      onClick={applyAiDraftToTemplate}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Aplicar al constructor
                    </button>
                  ) : null}
                </div>

                {aiDraft ? (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Propuesta IA
                        </p>
                        <p className="mt-2 text-lg font-extrabold text-slate-700">
                          {aiDraft.recommendedCampaignName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{aiDraft.subject}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {aiDraft.model}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Criterio de diseño
                        </p>
                        <div className="mt-2 space-y-2">
                          {aiDraft.rationale.map((item, index) => (
                            <div
                              key={`${aiDraft.id}-rationale-${index + 1}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Checklist de buenas prácticas
                        </p>
                        <div className="mt-2 space-y-2">
                          {aiDraft.bestPracticesChecklist.map((item, index) => (
                            <div
                              key={`${aiDraft.id}-check-${index + 1}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                            >
                              {index + 1}. {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleTemplateSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600">Nombre</label>
                  <input
                    value={templateForm.name}
                    disabled={!canManageTemplates}
                    onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
                    className="admin-input mt-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600">Asunto</label>
                  <input
                    value={templateForm.subject}
                    disabled={!canManageTemplates}
                    onChange={(event) =>
                      setTemplateForm({ ...templateForm, subject: event.target.value })
                    }
                    className="admin-input mt-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600">Contenido HTML</label>
                  <textarea
                    value={templateForm.content}
                    disabled={!canManageTemplates}
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
                    disabled={!canManageTemplates}
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

            <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-700">Vista previa de correo</h3>
              <div className="mt-5 overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] shadow-inner">
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Asunto</p>
                  <p className="mt-2 text-base font-bold text-slate-700">{previewEmail.subject}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    De {settingsForm.senderName} &lt;{settingsForm.senderEmail}&gt;
                  </p>
                </div>
                <div className="p-5">
                  <div
                    className="rounded-[26px] bg-white p-6 shadow-sm ring-1 ring-slate-200"
                    dangerouslySetInnerHTML={{ __html: previewEmail.body }}
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h4 className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">
                  Plantillas guardadas
                </h4>
                <div className="mt-4 space-y-3">
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
                            disabled={!canManageTemplates}
                            onClick={() => handleEditTemplate(template)}
                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={!canManageTemplates}
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
              </div>
            </section>
          </div>

          <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-700">Composicion de campaña</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Prepara un envio alineado al modo seleccionado y al rango de tareas por vencer.
                  </p>
                </div>
                <Send className="h-5 w-5 text-[#0acf97]" />
              </div>

              <form onSubmit={handleSendCampaign} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600">Nombre del envio</label>
                  <input
                    value={campaignForm.name}
                    disabled={!canSendCampaigns}
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
                      disabled={!canSendCampaigns}
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
                    <label className="block text-sm font-bold text-slate-600">Dias hacia adelante</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={campaignForm.daysAhead}
                      disabled={!canSendCampaigns}
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
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Alcance del envio</p>
                  <p className="mt-2 text-lg font-extrabold text-slate-700">{recipientModeLabel}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {resolvedRecipients.length} destinatario(s) con correo válido · {targetedDueSoonTasks.length} tarea(s) dentro de la ventana definida.
                  </p>
                  {activeUsersWithoutEmail.length > 0 ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      {activeUsersWithoutEmail.length} usuario(s) activos no recibirán este envío hasta completar su correo.
                    </p>
                  ) : null}
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
                  disabled={!canSendCampaigns || !campaignForm.templateId || resolvedRecipients.length === 0}
                  className="rounded-xl bg-[#0acf97] px-5 py-3 font-bold text-white transition hover:bg-[#09b685] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Enviar campaña desde {providerLabels[settingsForm.providerType]}
                </button>
              </form>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-700">Vista operativa</h3>
              <div className="mt-5 space-y-3">
                {targetedDueSoonTasks.slice(0, 5).map((task) => (
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
                {targetedDueSoonTasks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    No hay tareas por vencer dentro del rango seleccionado.
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">
                  Ultimos envios
                </p>
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-700">{campaign.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {campaign.recipientCount} destinatario(s) · {campaign.taskCount} tarea(s)
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            campaign.status === 'failed'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Provider: {campaign.deliveryProvider}
                        {campaign.deliveryReference ? ` · Ref: ${campaign.deliveryReference}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {campaign.sentAt
                          ? `Enviado ${campaign.sentAt.toLocaleString('es-CL')}`
                          : 'Sin confirmacion de envio'}
                      </p>
                      {campaign.errorMessage ? (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          {campaign.errorMessage}
                        </p>
                      ) : null}
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
      </>
      )}
    </div>
  );
};
