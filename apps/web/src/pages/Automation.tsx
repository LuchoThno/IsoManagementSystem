import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Play,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
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

const statusToneClasses: Record<string, string> = {
  started: 'bg-sky-50 text-sky-700 border-sky-200',
  succeeded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  skipped: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const Automation: React.FC = () => {
  const queryClient = useQueryClient();
  const { canManageWorkflows } = useUIPermissions();
  const [feedback, setFeedback] = React.useState<string | null>(null);

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

  const runMutation = useMutation({
    mutationFn: runUpcomingAuditWorkflow,
    onSuccess: async (result) => {
      setFeedback(
        `Workflow ejecutado: ${result.processed} auditoría(s) revisadas, ${result.createdTasks} tarea(s) creadas y ${result.skipped} omitida(s).`
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workflow-rules'] }),
        queryClient.invalidateQueries({ queryKey: ['workflow-executions'] }),
      ]);
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
  const lastExecution = executions[0] ?? null;
  const failureCount = executions.filter((execution) => execution.status === 'failed').length;

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
                {lastExecution?.startedAt
                  ? lastExecution.startedAt.toLocaleString('es-CL')
                  : 'Sin ejecuciones'}
              </p>
              <p className="mt-2 text-sm text-app-muted">
                {lastExecution ? triggerLabels[lastExecution.triggerType] ?? lastExecution.triggerType : 'Aún no hay historial'}
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
        </div>

        <div className="panel-card overflow-hidden">
          <div className="bg-gradient-to-r from-app-primary to-app-info px-6 py-5 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/75">
              Runner inicial
            </p>
            <h2 className="mt-2 text-2xl font-extrabold">Auditoría próxima</h2>
          </div>
          <div className="space-y-4 p-6">
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
              {rules.map((rule) => (
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
                        Código `{rule.code}` · cooldown {rule.cooldownMinutes} min
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        rule.enabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {rule.enabled ? 'Activa' : 'En preparación'}
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
                </article>
              ))}
            </div>
          )}

          {(rulesFetching || executionsFetching) && !rulesLoading ? (
            <p className="mt-4 text-sm text-slate-400">Actualizando información operativa...</p>
          ) : null}
        </section>

        <section className="panel-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="panel-title">Historial reciente</h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimas ejecuciones del runner con resultado y trazabilidad.
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-app-success" />
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
          ) : (
            <div className="mt-5 space-y-3">
              {executions.map((execution) => (
                <article
                  key={execution.id}
                  className="rounded-[24px] border border-slate-200 bg-app-surface-alt p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        {triggerLabels[execution.triggerType] ?? execution.triggerType}
                      </p>
                      <p className="mt-2 font-extrabold text-app-text">{execution.summary || 'Ejecución sin resumen'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {execution.startedAt.toLocaleString('es-CL')} · recurso {execution.resourceType}:{' '}
                        {execution.resourceId}
                      </p>
                      {execution.errorMessage ? (
                        <p className="mt-2 text-sm text-rose-600">{execution.errorMessage}</p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        statusToneClasses[execution.status] ?? 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {execution.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
