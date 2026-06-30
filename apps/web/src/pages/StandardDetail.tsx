import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createEvidenceApi,
  deleteStandardApi,
  fetchStandardStructure,
  listRequirementEvidences,
  updateStandardApi,
  type StandardEditorPayload,
} from '../lib/standardsApi';
import type { StandardClauseNode, StandardRequirement } from '../types/iso';

type EditableRequirement = {
  code: string;
  title: string;
  description: string;
  intent: string;
  criticality: 'low' | 'medium' | 'high';
  status: 'draft' | 'active' | 'obsolete';
};

type EditableClause = {
  code: string;
  title: string;
  description: string;
  requirements: EditableRequirement[];
};

type EditableSection = {
  code: string;
  title: string;
  description: string;
  clauses: EditableClause[];
};

const emptyRequirement = (): EditableRequirement => ({
  code: '',
  title: '',
  description: '',
  intent: '',
  criticality: 'medium',
  status: 'active',
});

const emptyClause = (): EditableClause => ({
  code: '',
  title: '',
  description: '',
  requirements: [],
});

const emptySection = (): EditableSection => ({
  code: '',
  title: '',
  description: '',
  clauses: [],
});

const flattenClauseRequirements = (clauses: StandardClauseNode[]): StandardRequirement[] =>
  clauses.flatMap((clause) => [
    ...clause.requirements,
    ...flattenClauseRequirements(clause.children),
  ]);

const clauseTemplateToEditor = (clause: StandardClauseNode): EditableClause => ({
  code: clause.code,
  title: clause.title,
  description: clause.description,
  requirements: clause.requirements.map((requirement) => ({
    code: requirement.code,
    title: requirement.title,
    description: requirement.description,
    intent: requirement.intent,
    criticality: requirement.criticality,
    status: requirement.status,
  })),
});

const renderClauseTree = (
  clauses: StandardClauseNode[],
  selectedRequirementId: string,
  onSelectRequirement: (requirementId: string) => void,
  depth = 0
): React.ReactNode =>
  clauses.map((clause) => (
    <div
      key={clause.id}
      className={`rounded-2xl border border-slate-200 bg-white p-4 ${
        depth > 0 ? 'ml-4 mt-3' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-700">
            {clause.code} · {clause.title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{clause.description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {clause.evidenceCount ?? 0} evidencia(s)
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {clause.requirements.map((requirement) => (
          <button
            key={requirement.id}
            type="button"
            onClick={() => onSelectRequirement(requirement.id)}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
              selectedRequirementId === requirement.id
                ? 'border-[#727cf5] bg-[#727cf5]/5'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-slate-700">
                  {requirement.code} · {requirement.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {requirement.description || requirement.intent}
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                  {requirement.criticality}
                </span>
                <p className="mt-2 text-xs text-slate-400">
                  {requirement.evidenceCount ?? 0} evidencia(s)
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      {clause.children.length > 0 && (
        <div className="mt-3">
          {renderClauseTree(clause.children, selectedRequirementId, onSelectRequirement, depth + 1)}
        </div>
      )}
    </div>
  ));

export const StandardDetail: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRequirementId, setSelectedRequirementId] = React.useState<string>('');
  const [evidenceTitle, setEvidenceTitle] = React.useState('');
  const [evidenceDescription, setEvidenceDescription] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<StandardEditorPayload | null>(null);

  const { data: structure, isLoading } = useQuery({
    queryKey: ['standard-structure', id],
    queryFn: () => fetchStandardStructure(id),
    enabled: Boolean(id),
  });

  React.useEffect(() => {
    if (!structure) {
      return;
    }

    setDraft({
      code: structure.standard.code,
      title: structure.standard.title,
      description: structure.standard.description,
      version: structure.standard.version,
      status: structure.standard.status,
      category: structure.standard.category,
      enabled: structure.standard.enabled,
      owner: structure.standard.owner,
      sections: structure.sections.map((section) => ({
        code: section.code,
        title: section.title,
        description: section.description,
        clauses: section.clauses.map(clauseTemplateToEditor),
      })),
      appendices: structure.appendices.map((appendix) => ({
        code: appendix.code,
        title: appendix.title,
        type: appendix.type,
        description: appendix.description,
        content: appendix.content,
      })),
    });
  }, [structure]);

  React.useEffect(() => {
    if (!selectedRequirementId && structure?.sections.length) {
      const requirement = structure.sections
        .flatMap((section) => flattenClauseRequirements(section.clauses))[0];
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
        queryClient.invalidateQueries({ queryKey: ['standards'] }),
        queryClient.invalidateQueries({ queryKey: ['evidences'] }),
      ]);
    },
  });

  const updateStandardMutation = useMutation({
    mutationFn: (payload: StandardEditorPayload) => updateStandardApi(id, payload),
    onSuccess: async () => {
      setIsEditing(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['standard-structure', id] }),
        queryClient.invalidateQueries({ queryKey: ['standards'] }),
      ]);
    },
  });

  const deleteStandardMutation = useMutation({
    mutationFn: () => deleteStandardApi(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['standards'] });
      navigate('/standards');
    },
  });

  if (isLoading || !structure || !draft) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white py-14 text-center text-slate-500">
        Cargando estructura normativa...
      </div>
    );
  }

  const allRequirements = structure.sections.flatMap((section) =>
    flattenClauseRequirements(section.clauses)
  );
  const selectedRequirement =
    allRequirements.find((requirement) => requirement.id === selectedRequirementId) ?? null;

  return (
    <div className="space-y-6">
      <section className="panel-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              {structure.standard.code}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-700">
              {structure.standard.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-500">
              {structure.standard.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsEditing((current) => !current)}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {isEditing ? 'Cancelar edición' : 'Editar norma'}
            </button>
            <button
              type="button"
              onClick={() => deleteStandardMutation.mutate()}
              disabled={deleteStandardMutation.isPending}
              className="rounded-xl border border-rose-200 px-4 py-2 font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-70"
            >
              {deleteStandardMutation.isPending ? 'Eliminando...' : 'Eliminar norma'}
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Secciones</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{structure.sections.length}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Cláusulas</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{structure.metrics.totalClauses}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Requisitos</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{structure.metrics.totalRequirements}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Cumplimiento</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{structure.metrics.complianceRate}%</p></div>
        </div>
      </section>

      {isEditing ? (
        <section className="panel-card p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <input className="admin-input" value={draft.code} placeholder="Código" onChange={(event) => setDraft({ ...draft, code: event.target.value })} />
            <input className="admin-input" value={draft.version ?? ''} placeholder="Versión" onChange={(event) => setDraft({ ...draft, version: event.target.value })} />
            <input className="admin-input md:col-span-2" value={draft.title} placeholder="Título" onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            <textarea className="admin-input md:col-span-2 min-h-[96px]" value={draft.description ?? ''} placeholder="Descripción" onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          </div>

          <div className="mt-6 space-y-4">
            {(draft.sections ?? []).map((section, sectionIndex) => (
              <article key={`${section.code}-${sectionIndex}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-3 md:grid-cols-[0.7fr_1.4fr_auto]">
                  <input className="admin-input" value={section.code} placeholder="Código sección" onChange={(event) => setDraft({
                    ...draft,
                    sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? { ...item, code: event.target.value } : item),
                  })} />
                  <input className="admin-input" value={section.title} placeholder="Título sección" onChange={(event) => setDraft({
                    ...draft,
                    sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? { ...item, title: event.target.value } : item),
                  })} />
                  <button
                    type="button"
                    className="rounded-xl border border-rose-200 px-4 py-2 font-bold text-rose-600 transition hover:bg-rose-50"
                    onClick={() => setDraft({
                      ...draft,
                      sections: (draft.sections ?? []).filter((_, index) => index !== sectionIndex),
                    })}
                  >
                    Quitar
                  </button>
                </div>
                <textarea className="admin-input mt-3 min-h-[84px]" value={section.description ?? ''} placeholder="Descripción sección" onChange={(event) => setDraft({
                  ...draft,
                  sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? { ...item, description: event.target.value } : item),
                })} />

                <div className="mt-4 space-y-3">
                  {(section.clauses ?? []).map((clause, clauseIndex) => (
                    <div key={`${clause.code}-${clauseIndex}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-[0.7fr_1.4fr_auto]">
                        <input className="admin-input" value={clause.code} placeholder="Código cláusula" onChange={(event) => setDraft({
                          ...draft,
                          sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                            ...item,
                            clauses: (item.clauses ?? []).map((entry, entryIndex) => entryIndex === clauseIndex ? { ...entry, code: event.target.value } : entry),
                          } : item),
                        })} />
                        <input className="admin-input" value={clause.title} placeholder="Título cláusula" onChange={(event) => setDraft({
                          ...draft,
                          sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                            ...item,
                            clauses: (item.clauses ?? []).map((entry, entryIndex) => entryIndex === clauseIndex ? { ...entry, title: event.target.value } : entry),
                          } : item),
                        })} />
                        <button
                          type="button"
                          className="rounded-xl border border-rose-200 px-4 py-2 font-bold text-rose-600 transition hover:bg-rose-50"
                          onClick={() => setDraft({
                            ...draft,
                            sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                              ...item,
                              clauses: (item.clauses ?? []).filter((_, entryIndex) => entryIndex !== clauseIndex),
                            } : item),
                          })}
                        >
                          Quitar
                        </button>
                      </div>
                      <textarea className="admin-input mt-3 min-h-[84px]" value={clause.description ?? ''} placeholder="Descripción cláusula" onChange={(event) => setDraft({
                        ...draft,
                        sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                          ...item,
                          clauses: (item.clauses ?? []).map((entry, entryIndex) => entryIndex === clauseIndex ? { ...entry, description: event.target.value } : entry),
                        } : item),
                      })} />

                      <div className="mt-3 space-y-3">
                        {(clause.requirements ?? []).map((requirement, requirementIndex) => (
                          <div key={`${requirement.code}-${requirementIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <input className="admin-input" value={requirement.code} placeholder="Código requisito" onChange={(event) => setDraft({
                                ...draft,
                                sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                                  ...item,
                                  clauses: (item.clauses ?? []).map((entry, entryIndex) => entryIndex === clauseIndex ? {
                                    ...entry,
                                    requirements: (entry.requirements ?? []).map((currentRequirement, currentIndex) => currentIndex === requirementIndex ? { ...currentRequirement, code: event.target.value } : currentRequirement),
                                  } : entry),
                                } : item),
                              })} />
                              <input className="admin-input" value={requirement.title} placeholder="Título requisito" onChange={(event) => setDraft({
                                ...draft,
                                sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                                  ...item,
                                  clauses: (item.clauses ?? []).map((entry, entryIndex) => entryIndex === clauseIndex ? {
                                    ...entry,
                                    requirements: (entry.requirements ?? []).map((currentRequirement, currentIndex) => currentIndex === requirementIndex ? { ...currentRequirement, title: event.target.value } : currentRequirement),
                                  } : entry),
                                } : item),
                              })} />
                              <textarea className="admin-input md:col-span-2 min-h-[84px]" value={requirement.description} placeholder="Descripción requisito" onChange={(event) => setDraft({
                                ...draft,
                                sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                                  ...item,
                                  clauses: (item.clauses ?? []).map((entry, entryIndex) => entryIndex === clauseIndex ? {
                                    ...entry,
                                    requirements: (entry.requirements ?? []).map((currentRequirement, currentIndex) => currentIndex === requirementIndex ? { ...currentRequirement, description: event.target.value } : currentRequirement),
                                  } : entry),
                                } : item),
                              })} />
                            </div>
                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                className="rounded-xl border border-rose-200 px-4 py-2 font-bold text-rose-600 transition hover:bg-rose-50"
                                onClick={() => setDraft({
                                  ...draft,
                                  sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                                    ...item,
                                    clauses: (item.clauses ?? []).map((entry, entryIndex) => entryIndex === clauseIndex ? {
                                      ...entry,
                                      requirements: (entry.requirements ?? []).filter((_, currentIndex) => currentIndex !== requirementIndex),
                                    } : entry),
                                  } : item),
                                })}
                              >
                                Quitar requisito
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => setDraft({
                            ...draft,
                            sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                              ...item,
                              clauses: (item.clauses ?? []).map((entry, entryIndex) => entryIndex === clauseIndex ? {
                                ...entry,
                                requirements: [...(entry.requirements ?? []), emptyRequirement()],
                              } : entry),
                            } : item),
                          })}
                        >
                          Agregar requisito
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setDraft({
                      ...draft,
                      sections: (draft.sections ?? []).map((item, index) => index === sectionIndex ? {
                        ...item,
                        clauses: [...(item.clauses ?? []), emptyClause()],
                      } : item),
                    })}
                  >
                    Agregar cláusula
                  </button>
                </div>
              </article>
            ))}

            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setDraft({
                ...draft,
                sections: [...(draft.sections ?? []), emptySection()],
              })}
            >
              Agregar sección
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => updateStandardMutation.mutate(draft)}
              disabled={updateStandardMutation.isPending}
              className="rounded-xl bg-[#727cf5] px-5 py-3 font-bold text-white transition hover:bg-[#636df0] disabled:opacity-70"
            >
              {updateStandardMutation.isPending ? 'Guardando...' : 'Guardar estructura'}
            </button>
            <button
              type="button"
              onClick={() => setDraft({
                code: structure.standard.code,
                title: structure.standard.title,
                description: structure.standard.description,
                version: structure.standard.version,
                status: structure.standard.status,
                category: structure.standard.category,
                enabled: structure.standard.enabled,
                owner: structure.standard.owner,
                sections: structure.sections.map((section) => ({
                  code: section.code,
                  title: section.title,
                  description: section.description,
                  clauses: section.clauses.map(clauseTemplateToEditor),
                })),
                appendices: structure.appendices.map((appendix) => ({
                  code: appendix.code,
                  title: appendix.title,
                  type: appendix.type,
                  description: appendix.description,
                  content: appendix.content,
                })),
              })}
              className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Restaurar desde la última versión
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="panel-card p-6">
            <h2 className="text-xl font-extrabold text-slate-700">Cláusulas y requisitos</h2>
            <div className="mt-5 space-y-5">
              {structure.sections.map((section) => (
                <article key={section.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      {section.code}
                    </p>
                    <h3 className="mt-2 text-lg font-extrabold text-slate-700">{section.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                  </div>
                  <div className="mt-4 space-y-4">
                    {section.clauses.length > 0 ? (
                      renderClauseTree(
                        section.clauses,
                        selectedRequirementId,
                        setSelectedRequirementId
                      )
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                        Esta sección aún no tiene cláusulas. Usa "Editar norma" para agregarlas.
                      </div>
                    )}
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
                  <p className="mt-2 text-sm font-bold text-slate-600">
                    {selectedRequirement.code} · {selectedRequirement.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedRequirement.description || selectedRequirement.intent}
                  </p>
                  <div className="mt-5 space-y-3">
                    {evidences.map((evidence) => (
                      <article key={evidence.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-slate-700">{evidence.title}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{evidence.status}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{evidence.description}</p>
                        <p className="mt-3 text-xs text-slate-400">
                          Tipo: {evidence.objectiveType} · Responsable: {evidence.owner}
                        </p>
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
                <p className="mt-3 text-sm text-slate-500">
                  Selecciona un requisito para revisar su evidencia.
                </p>
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
      )}
    </div>
  );
};
