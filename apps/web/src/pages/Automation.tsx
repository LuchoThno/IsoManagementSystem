import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Play,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { WorkflowExecution, WorkflowRule } from '../types/iso';
import { useUIPermissions } from '../hooks/useUIPermissions';
import {
  listWorkflowExecutions,
  listWorkflowRules,
  runUpcomingAuditWorkflow,
} from '../lib/workflowsApi';

const triggerLabels: Record<string, string> = {
  'audit.upcoming': 'Auditoría próxima',
  'audit.overdue_finding': 'Hallazgo vencido',
  'contract.overdue_obligation': 'Obligación atrasada',
};

const triggerDescriptions: Record<string, string> = {
  'audit.upcoming': 'Anticipa preparación y responsables antes de la fecha auditada.',
  'audit.overdue_finding': 'Reservado para escalar hallazgos que siguen abiertos fuera de plazo.',
  'contract.overdue_obligation': 'Preparado para vigilar compromisos contractuales con riesgo de atraso.',
};

const statusToneClasses: Record<string, string> = {
  started: 'bg-sky-50 text-sky-700 border-sky-200',
  succeeded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  skipped: 'bg-amber-50 text-amber-700 border-amber-200',
};

const statusLabels: Record<string, string> = {
  all: 'Todos',
  started: 'En curso',
  succeeded: 'Exitosas',
  failed: 'Fallidas',
  skipped: 'Omitidas',
};

const triggerOptions = [
  'all',
  'audit.upcoming',
  'audit.overdue_finding',
  'contract.overdue_obligation',
] as const;

const statusOptions = ['all', 'succeeded', 'failed', 'skipped', 'started'] as const;

const formatDateTime = (value: Date | null) =>
  value ? value.toLocaleString('es-CL') : 'Sin registro';

const formatDuration = (startedAt: Date, finishedAt: Date | null) => {
  if (!finishedAt) {
    return 'En ejecución';
  }

  const diffMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
  const totalSeconds = Math.round(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

const getExecutionMetadataItems = (execution: WorkflowExecution) => {
  const metadata = execution.metadata ?? {};
  const items: Array<{ label: string; value: string }> = [];

  if (typeof metadata.standard === 'string' && metadata.standard.length > 0) {
    items.push({ label: 'Norma', value: metadata.standard });
  }

  if (typeof metadata.auditType === 'string' && metadata.auditType.length > 0) {
    items.push({
      label: 'Tipo',
      value: metadata.auditType === 'internal' ? 'Interna' : metadata.auditType,
    });
  }

  if (typeof metadata.taskId === 'string' && metadata.taskId.length > 0) {
    items.push({ label: 'Tarea', value: metadata.taskId });
  }

  if (typeof metadata.reason === 'string' && metadata.reason.length > 0) {
    items.push({ label: 'Motivo', value: metadata.reason });
  }

  return items;
};

const getRuleReadiness = (rule: WorkflowRule) => {
  if (!rule.enabled) {
    return {
      label: 'En preparación',
      tone: 'bg-slate-200 text-slate-600',
    };
  }

  const hasEnabledAction = rule.actions.some((action) => action.enabled);
  return hasEnabledAction
    ? {
        label: 'Lista para ejecutar',
        tone: 'bg-emerald-100 text-emerald-700',
      }
    : {
        label: 'Sin acciones activas',
        tone: 'bg-amber-100 text-amber-700',
      };
};

export const Automation: React.FC = () => {
  const queryClient = useQueryClient();
  const { canManageWorkflows } = useUIPermissions();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof statusOptions)[number]>('all');
  const [triggerFilter, setTriggerFilter] =
    React.useState<(typeof triggerOptions)[number]>('all');

  const {
    data: rules = [],
    isLoading: rulesLoading,
    isFetching: rulesFetching,
    error: rulesError,
  } = useQuery({
    queryKey: ['workflow-rules'],
    queryFn: listWorkflowRules,
  });

  const {
    data: executions = [],
    isLoading: executionsLoading,
    isFetching: executionsFetching,
    error: executionsError,
  } = useQuery({
    queryKey: ['workflow-executions'],
    queryFn: () => listWorkflowExecutions(30),
  });

  const refreshOperationalData = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] }),
      queryClient.invalidateQueries({ queryKey: ['workflow-executions'] }),
    ]);
  }, [queryClient]);

  const runMutation = useMutation({
    mutationFn: runUpcomingAuditWorkflow,
    onSuccess: async (result) => {
      setFeedback(
        `Workflow ejecutado: ${result.processed} auditoría(s) revisadas, ${result.createdTasks} tarea(s) creadas y ${result.skipped} omitida(s).`
      );
      await refreshOperationalData();
    },
    onError: (error) => {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'No fue posible ejecutar la automatización de auditorías próximas.'
      );
    },
  });

  const enabledRules = rules.filter((rule) => rule.enabled).length;
  const plannedRules = rules.length - enabledRules;
  const lastExecution = executions[0] ?? null;
  const failureCount = executions.filter((execution) => execution.status === 'failed').length;
  const successfulCount = executions.filter((execution) => execution.status === 'succeeded').length;
  const coveredTriggers = new Set(rules.filter((rule) => rule.enabled).map((rule) => rule.triggerType))
    .size;
  const operationalHealth =
    enabledRules === 0 ? 'setup' : failureCount > 0 ? 'attention' : 'healthy';

  const filteredExecutions = executions.filter((execution) => {
    const matchesStatus = statusFilter === 'all' || execution.status === statusFilter;
    const matchesTrigger =
      triggerFilter === 'all' || execution.triggerType === triggerFilter;

    return matchesStatus && matchesTrigger;
  });

  const latestRunSummary = runMutation.data;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="panel-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-app-muted">
                Automatización
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-app-text md:text-[34px]">
                Diseña un backoffice que anticipe auditorías, acciones y vencimientos operativos.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-app-muted md:text-base">
                Esta primera capa de workflows usa reglas por tenant, historial auditable y
                ejecución manual controlada antes de evolucionar a automatizaciones más complejas.
              </p>
            </div>
            <div className="rounded-[28px] bg-gradient-to-br from-app-primary to-app-info p-4 text-white shadow-floating">
              <Zap className="h-8 w-8" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="app-subtle-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Reglas activas</span>
                <Sparkles className="h-4 w-4 text-app-primary" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-app-text">{enabledRules}</p>
              <p className="mt-2 text-sm text-app-muted">De {rules.length} reglas sembradas</p>
            </article>
            <article className="app-subtle-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Última ejecución</span>
                <Clock3 className="h-4 w-4 text-app-warning" />
              </div>
              <p className="mt-3 text-lg font-extrabold text-app-text">
                {formatDateTime(lastExecution?.startedAt ?? null)}
              </p>
              <p className="mt-2 text-sm text-app-muted">
                {lastExecution
                  ? triggerLabels[lastExecution.triggerType] ?? lastExecution.triggerType
                  : 'Aún no hay historial'}
              </p>
            </article>
            <article className="app-subtle-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Fallos recientes</span>
                <Activity className="h-4 w-4 text-app-danger" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-app-text">{failureCount}</p>
              <p className="mt-2 text-sm text-app-muted">Sobre las últimas 30 ejecuciones</p>
            </article>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Cobertura
              </p>
              <p className="mt-2 text-2xl font-extrabold text-app-text">{coveredTriggers}/3</p>
              <p className="mt-2 text-sm text-slate-500">Triggers con reglas activas hoy</p>
            </article>
            <article className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Preparadas
              </p>
              <p className="mt-2 text-2xl font-extrabold text-app-text">{plannedRules}</p>
              <p className="mt-2 text-sm text-slate-500">Reglas aún sin activar en operación</p>
            </article>
            <article className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Ejecuciones útiles
              </p>
              <p className="mt-2 text-2xl font-extrabold text-app-text">{successfulCount}</p>
              <p className="mt-2 text-sm text-slate-500">Corridas exitosas dentro de la muestra</p>
            </article>
          </div>
        </div>

        <div className="panel-card overflow-hidden">
          <div className="bg-gradient-to-r from-app-primary to-app-info px-6 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/75">
                  Runner inicial
                </p>
                <h2 className="mt-2 text-2xl font-extrabold">Auditoría próxima</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  void refreshOperationalData();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${rulesFetching || executionsFetching ? 'animate-spin' : ''}`} />
                Refrescar
              </button>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div
              className={`rounded-2xl border px-4 py-4 ${
                operationalHealth === 'healthy'
                  ? 'border-emerald-200 bg-emerald-50'
                  : operationalHealth === 'attention'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200 bg-app-surface-alt'
              }`}
            >
              <div className="flex items-start gap-3">
                {operationalHealth === 'healthy' ? (
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                ) : (
                  <AlertTriangle
                    className={`mt-0.5 h-5 w-5 ${
                      operationalHealth === 'attention' ? 'text-amber-700' : 'text-slate-500'
                    }`}
                  />
                )}
                <div>
                  <p className="font-extrabold text-app-text">
                    {operationalHealth === 'healthy'
                      ? 'Operación estable'
                      : operationalHealth === 'attention'
                        ? 'Requiere seguimiento'
                        : 'Pendiente de maduración'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {operationalHealth === 'healthy'
                      ? 'La automatización activa no muestra fallos recientes y ya está generando trazabilidad útil.'
                      : operationalHealth === 'attention'
                        ? 'Hay ejecuciones fallidas recientes. Conviene revisar el historial antes de ampliar el alcance.'
                        : 'Todavía dependemos de pocas reglas activas. La siguiente capa debería ampliar cobertura y disparadores.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-app-surface-alt p-4">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-app-primary" />
                <div>
                  <p className="font-extrabold text-app-text">Trigger operativo</p>
                  <p className="text-sm text-slate-500">
                    Revisa auditorías planificadas y crea tareas preventivas sin duplicar trabajo abierto.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canManageWorkflows || runMutation.isPending}
              onClick={() => {
                setFeedback(null);
                runMutation.mutate();
              }}
              className="app-button-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {runMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Ejecutando workflow...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Ejecutar auditorías próximas
                </>
              )}
            </button>

            {!canManageWorkflows ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Tu sesión puede observar el estado de la automatización, pero no ejecutar workflows manualmente.
              </div>
            ) : null}

            {feedback ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  runMutation.isError
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {feedback}
              </div>
            ) : null}

            {latestRunSummary ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Última corrida manual
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    Revisadas {latestRunSummary.processed}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Tareas creadas {latestRunSummary.createdTasks}
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    Omitidas {latestRunSummary.skipped}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="panel-title">Catálogo de reglas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Reglas sembradas por tenant para iniciar el motor de automatización.
              </p>
            </div>
            <Bot className="h-5 w-5 text-app-primary" />
          </div>

          {rulesError ? (
            <div className="app-empty-state-danger mt-5">
              <div className="mx-auto max-w-md">
                <p className="text-lg font-extrabold text-rose-700">
                  {rulesError instanceof Error ? rulesError.message : 'No fue posible cargar las reglas.'}
                </p>
              </div>
            </div>
          ) : rulesLoading ? (
            <div className="app-empty-state mt-5">
              <div className="mx-auto max-w-md">
                <p className="text-lg font-extrabold text-app-text">Cargando reglas...</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {rules.map((rule) => {
                const readiness = getRuleReadiness(rule);

                return (
                  <article
                    key={rule.id}
                    className="rounded-[24px] border border-slate-200 bg-app-surface-alt p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          {triggerLabels[rule.triggerType] ?? rule.triggerType}
                        </p>
                        <h3 className="mt-2 text-lg font-extrabold text-app-text">{rule.name}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {triggerDescriptions[rule.triggerType] ??
                            'Regla preparada para ampliar automatización del tenant.'}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Código `{rule.code}` · cooldown {rule.cooldownMinutes} min
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${readiness.tone}`}>
                        {readiness.label}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {rule.actions.map((action, index) => (
                        <span
                          key={`${rule.id}-${action.type}-${index + 1}`}
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            action.enabled
                              ? 'border-app-primary/20 bg-app-primary/10 text-app-primary'
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                        >
                          {action.type}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                      {typeof rule.config.windowDays === 'number' ? (
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                          Ventana {rule.config.windowDays} días
                        </span>
                      ) : null}
                      {typeof rule.config.taskLeadDays === 'number' ? (
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                          Anticipo {rule.config.taskLeadDays} días
                        </span>
                      ) : null}
                      {typeof rule.config.overdueDays === 'number' ? (
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                          Mora {rule.config.overdueDays} días
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {(rulesFetching || executionsFetching) && !rulesLoading ? (
            <p className="mt-4 text-sm text-slate-400">Actualizando información operativa...</p>
          ) : null}
        </section>

        <section className="panel-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="panel-title">Historial reciente</h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimas ejecuciones del runner con resultado y trazabilidad.
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-app-success" />
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-app-surface-alt p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros operativos
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-semibold text-slate-600">Estado</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as (typeof statusOptions)[number])
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-app-text outline-none transition focus:border-app-primary"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-semibold text-slate-600">Trigger</span>
                <select
                  value={triggerFilter}
                  onChange={(event) =>
                    setTriggerFilter(event.target.value as (typeof triggerOptions)[number])
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-app-text outline-none transition focus:border-app-primary"
                >
                  {triggerOptions.map((trigger) => (
                    <option key={trigger} value={trigger}>
                      {trigger === 'all' ? 'Todos los triggers' : triggerLabels[trigger]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              Mostrando {filteredExecutions.length} de {executions.length} ejecuciones recientes.
            </p>
          </div>

          {executionsError ? (
            <div className="app-empty-state-danger mt-5">
              <div className="mx-auto max-w-md">
                <p className="text-lg font-extrabold text-rose-700">
                  {executionsError instanceof Error
                    ? executionsError.message
                    : 'No fue posible cargar el historial de workflows.'}
                </p>
              </div>
            </div>
          ) : executionsLoading ? (
            <div className="app-empty-state mt-5">
              <div className="mx-auto max-w-md">
                <p className="text-lg font-extrabold text-app-text">Cargando historial...</p>
              </div>
            </div>
          ) : executions.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              Aún no hay ejecuciones registradas para este tenant.
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              No hay ejecuciones que coincidan con los filtros actuales.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {filteredExecutions.map((execution) => {
                const metadataItems = getExecutionMetadataItems(execution);

                return (
                  <article
                    key={execution.id}
                    className="rounded-[24px] border border-slate-200 bg-app-surface-alt p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          {triggerLabels[execution.triggerType] ?? execution.triggerType}
                        </p>
                        <p className="mt-2 font-extrabold text-app-text">
                          {execution.summary || 'Ejecución sin resumen'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {execution.startedAt.toLocaleString('es-CL')} · duración{' '}
                          {formatDuration(execution.startedAt, execution.finishedAt)} · recurso{' '}
                          {execution.resourceType}:{execution.resourceId}
                        </p>
                        {metadataItems.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {metadataItems.map((item) => (
                              <span
                                key={`${execution.id}-${item.label}`}
                                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600"
                              >
                                {item.label}: {item.value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {execution.errorMessage ? (
                          <p className="mt-3 text-sm text-rose-600">{execution.errorMessage}</p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          statusToneClasses[execution.status] ??
                          'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {statusLabels[execution.status] ?? execution.status}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
