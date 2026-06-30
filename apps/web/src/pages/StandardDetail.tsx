import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { createEvidenceApi, fetchStandardStructure, listRequirementEvidences } from '../lib/standardsApi';

export const StandardDetail: React.FC = () => {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [selectedRequirementId, setSelectedRequirementId] = React.useState<string>('');
  const [evidenceTitle, setEvidenceTitle] = React.useState('');
  const [evidenceDescription, setEvidenceDescription] = React.useState('');

  const { data: structure, isLoading } = useQuery({
    queryKey: ['standard-structure', id],
    queryFn: () => fetchStandardStructure(id),
    enabled: Boolean(id),
  });

  React.useEffect(() => {
    if (!selectedRequirementId && structure?.sections.length) {
      const requirement = structure.sections
        .flatMap((section) => section.clauses)
        .flatMap((clause) => clause.requirements)[0];
      if (requirement) {
        setSelectedRequirementId(requirement.id);
      }
    }
  }, [selectedRequirementId, structure]);

  const { data: evidences = [] } = useQuery({
    queryKey: ['requirement-evidences', selectedRequirementId],
    queryFn: () => listRequirementEvidences(selectedRequirementId),
    enabled: Boolean(selectedRequirementId),
  });

  const createEvidenceMutation = useMutation({
    mutationFn: createEvidenceApi,
    onSuccess: async () => {
      setEvidenceTitle('');
      setEvidenceDescription('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['requirement-evidences', selectedRequirementId] }),
        queryClient.invalidateQueries({ queryKey: ['standard-structure', id] }),
        queryClient.invalidateQueries({ queryKey: ['evidences'] }),
      ]);
    },
  });

  if (isLoading || !structure) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white py-14 text-center text-slate-500">
        Cargando estructura normativa...
      </div>
    );
  }

  const selectedRequirement =
    structure.sections
      .flatMap((section) => section.clauses)
      .flatMap((clause) => clause.requirements)
      .find((requirement) => requirement.id === selectedRequirementId) ?? null;

  return (
    <div className="space-y-6">
      <section className="panel-card p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{structure.standard.code}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-700">{structure.standard.title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-500">{structure.standard.description}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Secciones</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{structure.sections.length}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Cláusulas</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{structure.metrics.totalClauses}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Requisitos</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{structure.metrics.totalRequirements}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Cumplimiento</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{structure.metrics.complianceRate}%</p></div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="panel-card p-6">
          <h2 className="text-xl font-extrabold text-slate-700">Cláusulas y requisitos</h2>
          <div className="mt-5 space-y-5">
            {structure.sections.map((section) => (
              <article key={section.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{section.code}</p>
                  <h3 className="mt-2 text-lg font-extrabold text-slate-700">{section.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                </div>
                <div className="mt-4 space-y-4">
                  {section.clauses.map((clause) => (
                    <div key={clause.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-bold text-slate-700">{clause.code} · {clause.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{clause.description}</p>
                      <div className="mt-3 space-y-2">
                        {clause.requirements.map((requirement) => (
                          <button
                            key={requirement.id}
                            type="button"
                            onClick={() => setSelectedRequirementId(requirement.id)}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                              selectedRequirementId === requirement.id
                                ? 'border-[#727cf5] bg-[#727cf5]/5'
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-bold text-slate-700">{requirement.code} · {requirement.title}</p>
                                <p className="mt-1 text-sm text-slate-500">{requirement.description}</p>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                                {requirement.criticality}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="panel-card p-6">
            <h2 className="text-xl font-extrabold text-slate-700">Evidencia objetiva</h2>
            {selectedRequirement ? (
              <>
                <p className="mt-2 text-sm font-bold text-slate-600">{selectedRequirement.code} · {selectedRequirement.title}</p>
                <p className="mt-2 text-sm text-slate-500">{selectedRequirement.description || selectedRequirement.intent}</p>
                <div className="mt-5 space-y-3">
                  {evidences.map((evidence) => (
                    <article key={evidence.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-slate-700">{evidence.title}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{evidence.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{evidence.description}</p>
                      <p className="mt-3 text-xs text-slate-400">Tipo: {evidence.objectiveType} · Responsable: {evidence.owner}</p>
                    </article>
                  ))}
                  {evidences.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                      Este requisito aún no tiene evidencia objetiva asociada.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Selecciona un requisito para revisar su evidencia.</p>
            )}
          </div>

          {selectedRequirement && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createEvidenceMutation.mutate({
                  title: evidenceTitle,
                  description: evidenceDescription,
                  requirementId: selectedRequirement.id,
                  standardId: structure.standard.id,
                  clauseId: selectedRequirement.clauseId,
                  status: 'pending',
                  objectiveType: 'document',
                });
              }}
              className="panel-card p-6"
            >
              <h3 className="text-lg font-extrabold text-slate-700">Agregar evidencia</h3>
              <div className="mt-4 space-y-3">
                <input className="admin-input" placeholder="Título de la evidencia" value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} required />
                <textarea className="admin-input min-h-[120px]" placeholder="Descripción objetiva de la evidencia" value={evidenceDescription} onChange={(event) => setEvidenceDescription(event.target.value)} />
                <button type="submit" disabled={createEvidenceMutation.isPending} className="w-full rounded-xl bg-[#727cf5] px-4 py-3 font-bold text-white transition hover:bg-[#636df0] disabled:opacity-70">
                  {createEvidenceMutation.isPending ? 'Guardando...' : 'Vincular evidencia'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};
