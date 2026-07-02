import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Network, PlusCircle, Scale, ShieldCheck } from 'lucide-react';
import { createStandardApi, listStandards } from '../lib/standardsApi';
import type { StandardSummary } from '../types/iso';

const emptyStandard = {
  code: '',
  title: '',
  description: '',
  version: '1.0',
  owner: '',
  sectionCode: '',
  sectionTitle: '',
  clauseCode: '',
  clauseTitle: '',
  requirementCode: '',
  requirementTitle: '',
  requirementDescription: '',
};

const emptyStandardMetrics: NonNullable<StandardSummary['metrics']> = {
  requirementsCount: 0,
  evidencedCount: 0,
  complianceRate: 0,
};

const iso27001HighLevelSections = [
  'Alcance',
  'Referencias normativas',
  'Términos y definiciones',
  'Contexto de la organización',
  'Liderazgo',
  'Planificación',
  'Soporte',
  'Operación',
  'Evaluación del rendimiento',
  'Mejora',
].map((title, index) => ({
  code: String(index + 1),
  title,
  description: `Cláusula ${index + 1} de la estructura de alto nivel (Anexo SL).`,
  clauses: [],
}));

export const Standards: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: standards = [], isLoading } = useQuery({
    queryKey: ['standards'],
    queryFn: listStandards,
  });
  const [formData, setFormData] = React.useState(emptyStandard);

  const createMutation = useMutation({
    mutationFn: createStandardApi,
    onSuccess: () => {
      setFormData(emptyStandard);
      void queryClient.invalidateQueries({ queryKey: ['standards'] });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      code: formData.code,
      title: formData.title,
      description: formData.description,
      version: formData.version,
      owner: formData.owner || 'Administrador ISO',
      sections: formData.sectionCode && formData.sectionTitle ? [
        {
          code: formData.sectionCode,
          title: formData.sectionTitle,
          clauses: formData.clauseCode && formData.clauseTitle ? [
            {
              code: formData.clauseCode,
              title: formData.clauseTitle,
              requirements: formData.requirementCode && formData.requirementTitle ? [
                {
                  code: formData.requirementCode,
                  title: formData.requirementTitle,
                  description: formData.requirementDescription,
                  criticality: 'high',
                },
              ] : [],
            },
          ] : [],
        },
      ] : [],
    });
  };

  const averageCompliance = standards.length
    ? Math.round(
        standards.reduce(
          (total, standard) => total + (standard.metrics?.complianceRate ?? 0),
          0
        ) / standards.length
      )
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="panel-card p-6">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">
            Gobierno normativo
          </p>
          <h1 className="mt-3 text-3xl font-extrabold text-app-text">
            Catálogo dinámico de normas, marcos y requisitos.
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-500">
            Carga cualquier estándar, construye su jerarquía y mide cumplimiento a partir de evidencia objetiva.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="app-subtle-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Normas activas</span>
                <Network className="h-4 w-4 text-app-info" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-app-text">{standards.length}</p>
            </article>
            <article className="app-subtle-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Cumplimiento medio</span>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-app-text">{averageCompliance}%</p>
            </article>
            <article className="app-subtle-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Cobertura</span>
                <Scale className="h-4 w-4 text-app-primary" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-app-text">
                {standards.filter((standard) => standard.enabled).length}
              </p>
            </article>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="panel-card p-6">
          <div className="flex items-center gap-3">
            <PlusCircle className="h-5 w-5 text-app-primary" />
            <div>
              <h2 className="text-lg font-extrabold text-app-text">Nueva norma</h2>
              <p className="text-sm text-app-muted">Alta rápida con primera sección, cláusula y requisito.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input className="admin-input" placeholder="Código" value={formData.code} onChange={(event) => setFormData({ ...formData, code: event.target.value })} required />
            <input className="admin-input" placeholder="Versión" value={formData.version} onChange={(event) => setFormData({ ...formData, version: event.target.value })} required />
            <input className="admin-input md:col-span-2" placeholder="Título" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} required />
            <textarea className="admin-input md:col-span-2 min-h-[96px]" placeholder="Descripción" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
            <input className="admin-input" placeholder="Sección inicial" value={formData.sectionCode} onChange={(event) => setFormData({ ...formData, sectionCode: event.target.value })} />
            <input className="admin-input" placeholder="Título sección" value={formData.sectionTitle} onChange={(event) => setFormData({ ...formData, sectionTitle: event.target.value })} />
            <input className="admin-input" placeholder="Cláusula inicial" value={formData.clauseCode} onChange={(event) => setFormData({ ...formData, clauseCode: event.target.value })} />
            <input className="admin-input" placeholder="Título cláusula" value={formData.clauseTitle} onChange={(event) => setFormData({ ...formData, clauseTitle: event.target.value })} />
            <input className="admin-input" placeholder="Requisito inicial" value={formData.requirementCode} onChange={(event) => setFormData({ ...formData, requirementCode: event.target.value })} />
            <input className="admin-input" placeholder="Título requisito" value={formData.requirementTitle} onChange={(event) => setFormData({ ...formData, requirementTitle: event.target.value })} />
            <textarea className="admin-input md:col-span-2 min-h-[84px]" placeholder="Descripción del requisito" value={formData.requirementDescription} onChange={(event) => setFormData({ ...formData, requirementDescription: event.target.value })} />
          </div>

          <button
            type="button"
            onClick={() =>
              createMutation.mutate({
                code: 'ISO27001',
                title: 'ISO/IEC 27001',
                description: 'Sistema de gestión de seguridad de la información con estructura de alto nivel.',
                version: '2022',
                owner: formData.owner || 'Administrador ISO',
                sections: iso27001HighLevelSections,
              })
            }
            disabled={createMutation.isPending}
            className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Cargar plantilla ISO 27001 con 10 cláusulas HLS
          </button>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="app-button-primary mt-4 w-full"
          >
            {createMutation.isPending ? 'Guardando...' : 'Crear norma'}
          </button>
        </form>
      </div>

      <section className="panel-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-app-text">Matriz de cumplimiento por norma</h2>
            <p className="mt-1 text-sm text-slate-500">Progreso calculado sobre requisitos con evidencia vinculada.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-500">
            Cargando catálogo normativo...
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {standards.map((standard) => {
              const metrics = standard.metrics ?? emptyStandardMetrics;

              return (
                <Link
                  key={standard.id}
                  to={`/standards/${standard.id}`}
                  className="rounded-[26px] border border-app-border bg-app-surface p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                        {standard.code}
                      </p>
                      <h3 className="mt-2 text-xl font-extrabold text-app-text">{standard.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">{standard.description}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      v{standard.version}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-app-surface-alt p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Requisitos</p>
                      <p className="mt-2 text-2xl font-extrabold text-app-text">{metrics.requirementsCount}</p>
                    </div>
                    <div className="rounded-2xl bg-app-surface-alt p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Con evidencia</p>
                      <p className="mt-2 text-2xl font-extrabold text-app-text">{metrics.evidencedCount}</p>
                    </div>
                    <div className="rounded-2xl bg-app-surface-alt p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cumplimiento</p>
                      <p className="mt-2 text-2xl font-extrabold text-app-text">{metrics.complianceRate}%</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
