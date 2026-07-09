import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileCheck2, Link2, PencilLine, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { exportEvidenceFulfillmentPdf } from '../lib/auditReportPdf';
import { useUIPermissions } from '../hooks/useUIPermissions';
import {
  createEvidenceApi,
  deleteEvidenceApi,
  listEvidences,
  updateEvidenceApi,
} from '../lib/standardsApi';
import { useISOStore } from '../store/useISOStore';
import type { Evidence } from '../types/iso';

type EvidenceFormState = {
  title: string;
  description: string;
  standardId: string;
  requirementId: string;
  clauseId: string;
  status: Evidence['status'];
  objectiveType: Evidence['objectiveType'];
  owner: string;
  linkedAuditId: string;
  findingId: string;
  linkedTaskIds: string[];
  documentIds: string[];
  fulfillmentSummary: string;
  completionPercentage: number;
  dueDate: string;
  collectedAt: string;
  notes: string;
  changeSummary: string;
};

const emptyForm: EvidenceFormState = {
  title: '',
  description: '',
  standardId: '',
  requirementId: '',
  clauseId: '',
  status: 'pending',
  objectiveType: 'document',
  owner: '',
  linkedAuditId: '',
  findingId: '',
  linkedTaskIds: [],
  documentIds: [],
  fulfillmentSummary: '',
  completionPercentage: 0,
  dueDate: '',
  collectedAt: '',
  notes: '',
  changeSummary: '',
};

export const Evidences: React.FC = () => {
  const { canManageAudits, canManageTasks, canManageDocuments } = useUIPermissions();
  const canManage = canManageAudits || canManageTasks || canManageDocuments;
  const audits = useISOStore((state) => state.audits);
  const tasks = useISOStore((state) => state.tasks);
  const documents = useISOStore((state) => state.documents);
  const standards = useISOStore((state) => state.standards);
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [auditFilter, setAuditFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<Evidence['status'] | 'all'>('all');
  const [selectedEvidenceId, setSelectedEvidenceId] = React.useState<string | null>(null);
  const [editingEvidence, setEditingEvidence] = React.useState<Evidence | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<EvidenceFormState>(emptyForm);
  const deferredSearch = React.useDeferredValue(search);
  const pageSize = 12;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['evidences', page, deferredSearch, auditFilter, statusFilter],
    queryFn: () =>
      listEvidences({
        page,
        pageSize,
        search: deferredSearch,
        auditId: auditFilter !== 'all' ? auditFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const evidences = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedEvidence = selectedEvidenceId
    ? evidences.find((evidence) => evidence.id === selectedEvidenceId) ?? null
    : evidences[0] ?? null;

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch, auditFilter, statusFilter]);

  React.useEffect(() => {
    if (!selectedEvidence && evidences.length > 0) {
      setSelectedEvidenceId(evidences[0].id);
    }
    if (selectedEvidence && !evidences.some((evidence) => evidence.id === selectedEvidence.id)) {
      setSelectedEvidenceId(evidences[0]?.id ?? null);
    }
  }, [evidences, selectedEvidence]);

  const evidenceMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: formData.title,
        description: formData.description,
        standardId: formData.standardId || null,
        requirementId: formData.requirementId,
        clauseId: formData.clauseId || null,
        status: formData.status,
        objectiveType: formData.objectiveType,
        owner: formData.owner,
        documentIds: formData.documentIds,
        linkedAuditIds: formData.linkedAuditId ? [formData.linkedAuditId] : [],
        findingId: formData.findingId || null,
        linkedTaskIds: formData.linkedTaskIds,
        fulfillmentSummary: formData.fulfillmentSummary,
        completionPercentage: formData.completionPercentage,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        collectedAt: formData.collectedAt ? new Date(formData.collectedAt) : null,
        notes: formData.notes,
        changeSummary: formData.changeSummary,
      };

      if (editingEvidence) {
        return updateEvidenceApi(editingEvidence.id, payload);
      }

      return createEvidenceApi(payload);
    },
    onSuccess: (evidence) => {
      void queryClient.invalidateQueries({ queryKey: ['evidences'] });
      setSelectedEvidenceId(evidence.id);
      setIsModalOpen(false);
      setEditingEvidence(null);
      setFormData(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvidenceApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evidences'] });
    },
  });

  const selectedAudit = audits.find((audit) => audit.id === formData.linkedAuditId) ?? null;
  const availableFindings = selectedAudit?.findings ?? [];
  const availableTasks = tasks.filter((task) =>
    formData.linkedAuditId ? task.relatedAuditIds?.includes(formData.linkedAuditId) : true
  );

  const openCreateModal = () => {
    setEditingEvidence(null);
    setFormData({
      ...emptyForm,
      owner: 'Administrador ISO',
      linkedAuditId: auditFilter !== 'all' ? auditFilter : '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (evidence: Evidence) => {
    setEditingEvidence(evidence);
    setFormData({
      title: evidence.title,
      description: evidence.description,
      standardId: evidence.standardId ?? '',
      requirementId: evidence.requirementId,
      clauseId: evidence.clauseId ?? '',
      status: evidence.status,
      objectiveType: evidence.objectiveType,
      owner: evidence.owner,
      linkedAuditId: evidence.linkedAuditIds[0] ?? '',
      findingId: evidence.findingId ?? '',
      linkedTaskIds: evidence.linkedTaskIds ?? [],
      documentIds: evidence.documentIds,
      fulfillmentSummary: evidence.fulfillmentSummary ?? '',
      completionPercentage: evidence.completionPercentage ?? 0,
      dueDate: evidence.dueDate ? evidence.dueDate.toISOString().slice(0, 10) : '',
      collectedAt: evidence.collectedAt ? evidence.collectedAt.toISOString().slice(0, 10) : '',
      notes: evidence.notes,
      changeSummary: '',
    });
    setIsModalOpen(true);
  };

  const toggleSelection = (field: 'linkedTaskIds' | 'documentIds', value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((currentValue) => currentValue !== value)
        : [...current[field], value],
    }));
  };

  const getAuditLabel = (auditId: string) => {
    const audit = audits.find((item) => item.id === auditId);
    if (!audit) return 'Auditoría no encontrada';
    return `${audit.type === 'internal' ? 'Interna' : 'Externa'} · ${audit.standard}`;
  };

  const getFindingLabel = (evidence: Evidence) => {
    if (!evidence.findingId) return 'Sin hallazgo asociado';
    const audit = audits.find((item) => item.id === evidence.linkedAuditIds[0]);
    const finding = audit?.findings.find((item) => item.id === evidence.findingId);
    return finding?.description ?? evidence.findingId;
  };

  const handleExportEvidencePdf = (evidence: Evidence) => {
    exportEvidenceFulfillmentPdf(
      evidence,
      getAuditLabel(evidence.linkedAuditIds[0] ?? ''),
      getFindingLabel(evidence)
    );
  };

  return (
    <div className="space-y-6">
      <section className="panel-card p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-app-text">Evidencias y cumplimiento</h1>
            <p className="mt-2 text-sm text-slate-500">
              Gestiona observaciones, incumplimientos y oportunidades de mejora con historial trazable.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-app-primary/10 p-4 text-app-primary">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <button
              type="button"
              disabled={!canManage}
              onClick={openCreateModal}
              className="app-button-primary inline-flex items-center gap-2 px-4 py-2.5"
            >
              <Plus className="h-4 w-4" />
              Nueva evidencia
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
          <input
            className="admin-input"
            placeholder="Buscar por título, responsable o nota"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={auditFilter}
            onChange={(event) => setAuditFilter(event.target.value)}
            className="admin-select w-full"
          >
            <option value="all">Todas las auditorías</option>
            {audits.map((audit) => (
              <option key={audit.id} value={audit.id}>
                {audit.type === 'internal' ? 'Interna' : 'Externa'} · {audit.standard}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as Evidence['status'] | 'all')}
            className="admin-select w-full"
          >
            <option value="all">Todos los estados</option>
            <option value="missing">Faltante</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobada</option>
            <option value="expired">Vencida</option>
          </select>
          <p className="self-center text-sm text-slate-400">
            {isFetching ? 'Actualizando...' : `${total} evidencia(s)`}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          {isLoading ? (
            <div className="app-empty-state text-slate-500">Cargando evidencias...</div>
          ) : evidences.length > 0 ? (
            evidences.map((evidence) => (
              <article
                key={evidence.id}
                className={`panel-card cursor-pointer p-5 transition ${
                  selectedEvidence?.id === evidence.id ? 'ring-2 ring-app-primary/20' : ''
                }`}
                onClick={() => setSelectedEvidenceId(evidence.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      {evidence.objectiveType}
                    </p>
                    <h2 className="mt-2 text-lg font-extrabold text-app-text">{evidence.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">{evidence.description}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {evidence.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>{evidence.owner}</span>
                  <span>{getAuditLabel(evidence.linkedAuditIds[0] ?? '')}</span>
                  <span>{getFindingLabel(evidence)}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-app-surface-alt px-3 py-1.5 text-xs font-bold text-slate-600">
                    <Link2 className="h-3.5 w-3.5" />
                    {evidence.documentIds.length} documento(s)
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    Cumplimiento {evidence.completionPercentage ?? 0}%
                  </div>
                </div>

                {canManage ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(evidence);
                      }}
                      className="app-button-secondary inline-flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <PencilLine className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!window.confirm(`Eliminar la evidencia "${evidence.title}"?`)) return;
                        deleteMutation.mutate(evidence.id);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="app-empty-state text-slate-500">
              No se encontraron evidencias para esos filtros.
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="app-button-secondary px-4 py-2 text-sm disabled:opacity-50"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <button
                type="button"
                className="app-button-secondary px-4 py-2 text-sm disabled:opacity-50"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>

        <aside className="panel-card p-6">
          {selectedEvidence ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Detalle de cumplimiento
                </p>
                <h3 className="mt-2 text-2xl font-extrabold text-app-text">{selectedEvidence.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{selectedEvidence.fulfillmentSummary || 'Sin resumen de cumplimiento cargado.'}</p>
              </div>
              <button
                type="button"
                onClick={() => handleExportEvidencePdf(selectedEvidence)}
                className="app-button-secondary inline-flex items-center gap-2 px-4 py-2.5"
              >
                <Download className="h-4 w-4" />
                Exportar PDF
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-app-surface-alt p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Hallazgo</p>
                  <p className="mt-2 text-sm font-bold text-app-text">{getFindingLabel(selectedEvidence)}</p>
                </div>
                <div className="rounded-2xl bg-app-surface-alt p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Avance</p>
                  <p className="mt-2 text-sm font-bold text-app-text">{selectedEvidence.completionPercentage ?? 0}%</p>
                </div>
              </div>

              <div className="rounded-2xl border border-app-border bg-app-surface-alt/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Notas</p>
                <p className="mt-2 text-sm text-slate-600">{selectedEvidence.notes || 'Sin notas registradas.'}</p>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-app-primary" />
                  <h4 className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">
                    Historial de actividades
                  </h4>
                </div>
                <div className="mt-4 space-y-3">
                  {(selectedEvidence.activityLog ?? []).length > 0 ? (
                    selectedEvidence.activityLog!
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <article
                          key={entry.id}
                          className="rounded-2xl border border-slate-200 bg-app-surface-alt p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                              {entry.action}
                            </span>
                            <span className="text-xs text-slate-400">
                              {entry.date.toLocaleString('es-CL')}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{entry.details}</p>
                          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                            {entry.author} · {entry.status}
                          </p>
                        </article>
                      ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                      Aquí aparecerá la bitácora del cumplimiento.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="app-empty-state text-slate-500">
              Selecciona una evidencia para revisar su cumplimiento e historial.
            </div>
          )}
        </aside>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-[30px] bg-app-surface shadow-floating">
            <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                    Evidencias de auditoría
                  </p>
                  <h3 className="mt-2 text-xl font-extrabold">
                    {editingEvidence ? 'Actualizar evidencia' : 'Nueva evidencia'}
                  </h3>
                  <p className="mt-2 text-sm text-white/75">
                    Registra cumplimiento, observaciones, soporte documental e historial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!evidenceMutation.isPending) {
                      setIsModalOpen(false);
                      setEditingEvidence(null);
                    }
                  }}
                  className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                evidenceMutation.mutate();
              }}
              className="space-y-6 p-6"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block lg:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Título</span>
                  <input
                    className="admin-input mt-2"
                    value={formData.title}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    required
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Descripción</span>
                  <textarea
                    className="admin-input mt-2 min-h-[96px] resize-none"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Norma</span>
                  <select
                    className="admin-select mt-2 w-full"
                    value={formData.standardId}
                    onChange={(event) => setFormData({ ...formData, standardId: event.target.value })}
                  >
                    <option value="">Sin norma</option>
                    {standards.map((standard) => (
                      <option key={standard.id} value={standard.id}>
                        {standard.code} · {standard.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Responsable</span>
                  <input
                    className="admin-input mt-2"
                    value={formData.owner}
                    onChange={(event) => setFormData({ ...formData, owner: event.target.value })}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Requisito</span>
                  <input
                    className="admin-input mt-2"
                    value={formData.requirementId}
                    onChange={(event) => setFormData({ ...formData, requirementId: event.target.value })}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Cláusula</span>
                  <input
                    className="admin-input mt-2"
                    value={formData.clauseId}
                    onChange={(event) => setFormData({ ...formData, clauseId: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Estado</span>
                  <select
                    className="admin-select mt-2 w-full"
                    value={formData.status}
                    onChange={(event) => setFormData({ ...formData, status: event.target.value as Evidence['status'] })}
                  >
                    <option value="missing">Faltante</option>
                    <option value="pending">Pendiente</option>
                    <option value="approved">Aprobada</option>
                    <option value="expired">Vencida</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Tipo objetivo</span>
                  <select
                    className="admin-select mt-2 w-full"
                    value={formData.objectiveType}
                    onChange={(event) =>
                      setFormData({ ...formData, objectiveType: event.target.value as Evidence['objectiveType'] })
                    }
                  >
                    <option value="document">Documento</option>
                    <option value="record">Registro</option>
                    <option value="interview">Entrevista</option>
                    <option value="observation">Observación</option>
                    <option value="contract">Contrato</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Auditoría</span>
                  <select
                    className="admin-select mt-2 w-full"
                    value={formData.linkedAuditId}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        linkedAuditId: event.target.value,
                        findingId: '',
                        linkedTaskIds: [],
                      })
                    }
                  >
                    <option value="">Sin auditoría</option>
                    {audits.map((audit) => (
                      <option key={audit.id} value={audit.id}>
                        {audit.type === 'internal' ? 'Interna' : 'Externa'} · {audit.standard}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Hallazgo</span>
                  <select
                    className="admin-select mt-2 w-full"
                    value={formData.findingId}
                    onChange={(event) => setFormData({ ...formData, findingId: event.target.value })}
                  >
                    <option value="">Sin hallazgo</option>
                    {availableFindings.map((finding) => (
                      <option key={finding.id} value={finding.id}>
                        {finding.type} · {finding.description}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Cumplimiento (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="admin-input mt-2"
                    value={formData.completionPercentage}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        completionPercentage: Number(event.target.value || 0),
                      })
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Fecha compromiso</span>
                  <input
                    type="date"
                    className="admin-input mt-2"
                    value={formData.dueDate}
                    onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })}
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Resumen del cumplimiento</span>
                  <textarea
                    className="admin-input mt-2 min-h-[100px] resize-none"
                    value={formData.fulfillmentSummary}
                    onChange={(event) =>
                      setFormData({ ...formData, fulfillmentSummary: event.target.value })
                    }
                    placeholder="Detalla cómo se está cumpliendo la observación o el incumplimiento."
                  />
                </label>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-app-border bg-app-surface-alt p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                      Tareas asociadas
                    </h4>
                    <span className="rounded-full bg-app-info/10 px-3 py-1 text-xs font-bold text-app-info">
                      {formData.linkedTaskIds.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {availableTasks.length > 0 ? (
                      availableTasks.map((task) => (
                        <label
                          key={task.id}
                          className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-4"
                        >
                          <input
                            type="checkbox"
                            checked={formData.linkedTaskIds.includes(task.id)}
                            onChange={() => toggleSelection('linkedTaskIds', task.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <div>
                            <p className="font-bold text-app-text">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {task.assignedTo} · {task.status}
                            </p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-5 text-sm text-app-muted">
                        No hay tareas disponibles para asociar.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-app-border bg-app-surface-alt p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                      Documentos soporte
                    </h4>
                    <span className="rounded-full bg-app-primary/10 px-3 py-1 text-xs font-bold text-app-primary">
                      {formData.documentIds.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {documents.length > 0 ? (
                      documents.map((document) => (
                        <label
                          key={document.id}
                          className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-4"
                        >
                          <input
                            type="checkbox"
                            checked={formData.documentIds.includes(document.id)}
                            onChange={() => toggleSelection('documentIds', document.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <div>
                            <p className="font-bold text-app-text">{document.title}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {document.standard} · {document.type}
                            </p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-5 text-sm text-app-muted">
                        No hay documentos disponibles para asociar.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Notas</span>
                  <textarea
                    className="admin-input mt-2 min-h-[96px] resize-none"
                    value={formData.notes}
                    onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Resumen del cambio</span>
                  <textarea
                    className="admin-input mt-2 min-h-[96px] resize-none"
                    value={formData.changeSummary}
                    onChange={(event) => setFormData({ ...formData, changeSummary: event.target.value })}
                    placeholder="Ej: se adjunta evidencia del cierre parcial de la observación."
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="app-button-secondary w-full"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={evidenceMutation.isPending}
                  className="app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {evidenceMutation.isPending ? 'Guardando...' : editingEvidence ? 'Guardar cambios' : 'Crear evidencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
