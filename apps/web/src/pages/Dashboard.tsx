import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Shield,
  TimerReset,
} from 'lucide-react';
import { fetchGrcOverview } from '../lib/api';
import { useISOStore } from '../store/useISOStore';

export const Dashboard: React.FC = () => {
  const dashboard = useISOStore((state) => state.dashboard);
  const alerts = useISOStore((state) => state.alerts);
  const standards = useISOStore((state) => state.standards);
  const { data: grcOverview } = useQuery({
    queryKey: ['grc-overview'],
    queryFn: fetchGrcOverview,
    staleTime: 60_000,
  });

  const toneClasses = {
    primary: 'bg-app-primary text-white',
    success: 'bg-app-success text-white',
    warning: 'bg-app-warning text-slate-950',
    danger: 'bg-app-danger text-white',
  } as const;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="panel-card p-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-app-muted">
              Resumen
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight text-app-text md:text-[34px]">
              Monitorea calidad, seguridad y ambiente desde un solo dashboard operativo.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-app-muted md:text-base">
              Consulta el estado del sistema, la ejecución operativa y los indicadores clave
              desde una sola vista conectada al backend.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="app-subtle-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Compliance</span>
                  <Shield className="h-4 w-4 text-app-primary" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-app-text">
                  {dashboard.complianceRate}%
                </p>
                <p className="mt-2 text-sm text-emerald-500">Buen nivel de control</p>
              </div>
              <div className="app-subtle-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Tareas vencidas</span>
                  <Clock3 className="h-4 w-4 text-app-warning" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-app-text">
                  {dashboard.overdueTasks}
                </p>
                <p className="mt-2 text-sm text-app-muted">Acciones que requieren atencion</p>
              </div>
              <div className="app-subtle-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">Alertas abiertas</span>
                  <AlertTriangle className="h-4 w-4 text-app-danger" />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-app-text">{alerts.length}</p>
                <p className="mt-2 text-sm text-app-muted">Calculadas automaticamente</p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel-card overflow-hidden">
          <div className="bg-app-primary px-6 py-5 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/70">
              Estado del sistema
            </p>
            <h2 className="mt-2 text-2xl font-extrabold">Panel operativo activo</h2>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between rounded-xl bg-app-surface-alt px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-600">Modo de persistencia</p>
                <p className="text-sm text-slate-400">API y base de datos central</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-app-primary" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-app-surface-alt px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-600">Repositorio documental</p>
                <p className="text-sm text-slate-400">Controlado y disponible para operación</p>
              </div>
              <FileCheck2 className="h-4 w-4 text-app-success" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-app-surface-alt px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-600">Backoffice visual</p>
                <p className="text-sm text-slate-400">Estilo admin inspirado en Adminto</p>
              </div>
              <Activity className="h-4 w-4 text-app-warning" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {dashboard.stats.map((stat) => (
          <div key={stat.label} className="panel-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-app-muted">{stat.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-app-text">{stat.value}</p>
                <p className="mt-2 text-sm text-app-muted">{stat.trend}</p>
              </div>
              <div className={`rounded-xl p-3 ${toneClasses[stat.tone]}`}>
                {stat.label.includes('Document') ? (
                  <FileCheck2 className="h-5 w-5" />
                ) : stat.label.includes('Task') ? (
                  <TimerReset className="h-5 w-5" />
                ) : stat.label.includes('Audit') ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Activity className="h-5 w-5" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="panel-card p-5">
          <p className="text-sm font-bold text-app-muted">Normas dinámicas</p>
          <p className="mt-2 text-3xl font-extrabold text-app-text">{standards.length}</p>
          <p className="mt-2 text-sm text-app-muted">Catálogo normativo activo y administrable.</p>
        </div>
        <div className="panel-card p-5">
          <p className="text-sm font-bold text-app-muted">Evidencias objetivas</p>
          <p className="mt-2 text-3xl font-extrabold text-app-text">
            {grcOverview?.evidencesCount ?? 0}
          </p>
          <p className="mt-2 text-sm text-app-muted">Registros vinculados a requisitos y auditorías.</p>
        </div>
        <div className="panel-card p-5">
          <p className="text-sm font-bold text-app-muted">Contratos controlados</p>
          <p className="mt-2 text-3xl font-extrabold text-app-text">
            {grcOverview?.contractsCount ?? 0}
          </p>
          <p className="mt-2 text-sm text-app-muted">Obligaciones y vencimientos bajo trazabilidad.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="panel-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="panel-title">Actividad reciente</h2>
              <p className="mt-1 text-sm text-slate-500">Eventos clave del sistema en tiempo real.</p>
            </div>
          </div>

          <div className="space-y-4">
            {dashboard.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 rounded-xl border border-slate-100 bg-app-surface-alt p-4"
              >
                <div className="rounded-xl bg-app-surface p-3 text-app-primary shadow-sm">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-app-text">{activity.title}</p>
                  <p className="mt-1 text-sm text-app-muted">{activity.description}</p>
                </div>
                <span className="text-xs font-medium text-app-muted">{activity.timestamp}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="panel-title">Alertas priorizadas</h2>
              <p className="mt-1 text-sm text-slate-500">Seguimiento rapido de riesgos operativos.</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-app-warning" />
          </div>

          <div className="mt-5 space-y-3">
            {alerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-slate-100 bg-app-surface-alt p-4">
                <p className="font-bold text-app-text">{alert.title}</p>
                <p className="mt-1 text-sm text-app-muted">{alert.description}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-700">
                  Prioridad {alert.priority}
                </p>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                Sin alertas criticas. El sistema se encuentra bajo control.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
