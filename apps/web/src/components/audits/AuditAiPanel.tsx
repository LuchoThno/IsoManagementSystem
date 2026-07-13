import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import type { AuditSummaryResult, CorrectiveActionsResult } from '../../lib/aiApi';

type AuditAiPanelProps = {
  disabled?: boolean;
  busyAction: 'summary' | 'actions' | null;
  error: string | null;
  summaryResult: AuditSummaryResult | null;
  actionsResult: CorrectiveActionsResult | null;
  onSummarize: () => void;
  onProposeActions: () => void;
};

export const AuditAiPanel: React.FC<AuditAiPanelProps> = ({
  disabled = false,
  busyAction,
  error,
  summaryResult,
  actionsResult,
  onSummarize,
  onProposeActions,
}) => (
  <section className="panel-card p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-app-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-app-primary">
          <Bot className="h-3.5 w-3.5" />
          IA sandbox
        </div>
        <h3 className="mt-4 text-xl font-extrabold text-app-text">Copilot para auditorías</h3>
        <p className="mt-1 text-sm text-slate-500">
          Ejecuta resúmenes y propuestas stub con formato estable antes de integrar un LLM real.
        </p>
      </div>
      <Sparkles className="h-6 w-6 text-app-primary" />
    </div>

    <div className="mt-5 flex flex-wrap gap-3">
      <button
        type="button"
        disabled={disabled || busyAction !== null}
        onClick={onSummarize}
        className="app-button-primary px-4 py-2.5"
      >
        {busyAction === 'summary' ? 'Analizando...' : 'Resumir auditoría'}
      </button>
      <button
        type="button"
        disabled={disabled || busyAction !== null}
        onClick={onProposeActions}
        className="app-button-secondary px-4 py-2.5"
      >
        {busyAction === 'actions' ? 'Generando...' : 'Proponer acciones'}
      </button>
    </div>

    {error ? (
      <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    ) : null}

    {summaryResult ? (
      <div className="mt-5 rounded-3xl border border-slate-200 bg-app-surface-alt p-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-extrabold text-app-text">Resumen IA</h4>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
            {summaryResult.model}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-600">{summaryResult.summary}</p>
        <div className="mt-4 space-y-2">
          {summaryResult.keyFindings.map((finding, index) => (
            <div
              key={`${summaryResult.id}-finding-${index + 1}`}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
            >
              {finding}
            </div>
          ))}
        </div>
      </div>
    ) : null}

    {actionsResult ? (
      <div className="mt-5 rounded-3xl border border-slate-200 bg-app-surface-alt p-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-extrabold text-app-text">Acciones sugeridas</h4>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
            {actionsResult.model}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {actionsResult.actions.map((action, index) => (
            <div
              key={`${actionsResult.id}-action-${index + 1}`}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
            >
              {index + 1}. {action}
            </div>
          ))}
        </div>
      </div>
    ) : null}

    {!summaryResult && !actionsResult && !error ? (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        Selecciona una acción para ver la respuesta estructurada del sandbox.
      </div>
    ) : null}
  </section>
);
