import React from 'react';
import {
  CalendarClock,
  ClipboardCheck,
  FileSearch,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useStandardOptions } from '../../hooks/useStandardOptions';
import { useISOStore } from '../../store/useISOStore';
import type { AuditUpsertPayload } from '../../lib/auditsApi';
import type { Audit, Finding, ISOStandard } from '../../types/iso';

interface AuditModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialAudit?: Audit | null;
  onClose: () => void;
  onSubmit: (audit: AuditUpsertPayload) => Promise<void> | void;
}

const emptyFinding = {
  type: 'observation' as Finding['type'],
  description: '',
  status: 'open' as Finding['status'],
  dueDate: '',
  assignedTo: '',
};

const emptyForm = {
  type: 'internal' as Audit['type'],
  standard: 'ISO9001' as ISOStandard,
  date: '',
  status: 'planned' as Audit['status'],
  findings: [] as Omit<Finding, 'id'>[],
  relatedTaskIds: [] as string[],
  relatedDocumentIds: [] as string[],
  changeSummary: '',
};

export const AuditModal: React.FC<AuditModalProps> = ({
  isOpen,
  mode,
  initialAudit,
  onClose,
  onSubmit,
}) => {
  const standardOptions = useStandardOptions();
  const tasks = useISOStore((state) => state.tasks);
  const documents = useISOStore((state) => state.documents);
  const [formData, setFormData] = React.useState(emptyForm);
  const [newFinding, setNewFinding] = React.useState(emptyFinding);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === 'edit' && initialAudit) {
      setFormData({
        type: initialAudit.type,
        standard: initialAudit.standard,
        date: initialAudit.date.toISOString().slice(0, 10),
        status: initialAudit.status,
        findings: initialAudit.findings.map((finding) => ({
          type: finding.type,
          description: finding.description,
          status: finding.status,
          dueDate: finding.dueDate.toISOString().slice(0, 10),
          assignedTo: finding.assignedTo,
        })),
        relatedTaskIds: initialAudit.relatedTaskIds ?? [],
        relatedDocumentIds: initialAudit.relatedDocumentIds ?? [],
        changeSummary: '',
      });
      setNewFinding(emptyFinding);
      return;
    }

    setFormData(emptyForm);
    setNewFinding(emptyFinding);
  }, [initialAudit, isOpen, mode]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, submitting]);

  const addFinding = () => {
    if (!newFinding.description.trim() || !newFinding.dueDate || !newFinding.assignedTo.trim()) {
      return;
    }

    setFormData((current) => ({
      ...current,
      findings: [...current.findings, newFinding],
    }));
    setNewFinding(emptyFinding);
  };

  const toggleSelection = (
    field: 'relatedTaskIds' | 'relatedDocumentIds',
    value: string
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((currentValue) => currentValue !== value)
        : [...current[field], value],
    }));
  };

  const removeFinding = (index: number) => {
    setFormData((current) => ({
      ...current,
      findings: current.findings.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const findingToneClassName = (type: Finding['type']) => {
    switch (type) {
      case 'nonconformity':
        return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100';
      case 'opportunity':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
      default:
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
    }
  };

  const statusToneClassName = (status: Finding['status']) => {
    switch (status) {
      case 'closed':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
      case 'in-progress':
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
      default:
        return 'bg-sky-50 text-sky-700 ring-1 ring-sky-100';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        date: new Date(formData.date),
        findings: formData.findings.map((finding, index) => ({
          ...finding,
          id: initialAudit?.findings[index]?.id ?? `finding-${index}-${Date.now()}`,
          dueDate: new Date(finding.dueDate),
        })),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      onClick={() => {
        if (!submitting) {
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[100vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-app-border bg-app-surface shadow-floating sm:max-h-[calc(100vh-2rem)] sm:max-w-6xl sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                Módulo de auditorías
              </p>
              <h3 className="mt-2 text-xl font-extrabold">
                {mode === 'create' ? 'Programar auditoría' : 'Actualizar auditoría'}
              </h3>
              <p className="mt-2 text-sm text-white/75">
                Ajusta alcance, fecha, estado y hallazgos desde una sola vista.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                      <ShieldCheck className="h-4 w-4" />
                      Tipo
                    </span>
                    <select
                      value={formData.type}
                      onChange={(event) =>
                        setFormData({ ...formData, type: event.target.value as Audit['type'] })
                      }
                      className="admin-select mt-2 w-full"
                    >
                      <option value="internal">Interna</option>
                      <option value="external">Externa</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Target className="h-4 w-4" />
                      Norma
                    </span>
                    <select
                      value={formData.standard}
                      onChange={(event) =>
                        setFormData({ ...formData, standard: event.target.value as ISOStandard })
                      }
                      className="admin-select mt-2 w-full"
                    >
                      {standardOptions.map((standard) => (
                        <option key={standard.id} value={standard.code}>
                          {standard.code} · {standard.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                      <CalendarClock className="h-4 w-4" />
                      Fecha
                    </span>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                      className="admin-input mt-2"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                      <ClipboardCheck className="h-4 w-4" />
                      Estado
                    </span>
                    <select
                      value={formData.status}
                      onChange={(event) =>
                        setFormData({ ...formData, status: event.target.value as Audit['status'] })
                      }
                      className="admin-select mt-2 w-full"
                    >
                      <option value="planned">Planificada</option>
                      <option value="in-progress">En progreso</option>
                      <option value="completed">Completada</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-[26px] border border-app-border bg-app-surface-alt/70 p-5">
                  <div className="flex items-center gap-3">
                    <div className="app-icon-chip">
                      <FileSearch className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-app-text">Hallazgos</h4>
                      <p className="mt-1 text-sm text-app-muted">
                        Registra no conformidades, observaciones y oportunidades con responsable y fecha de cierre.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {formData.findings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-5 text-sm text-app-muted">
                        Esta auditoría todavía no tiene hallazgos cargados.
                      </div>
                    ) : (
                      formData.findings.map((finding, index) => (
                        <div
                          key={`${finding.description}-${index}`}
                          className="rounded-2xl border border-app-border bg-app-surface px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${findingToneClassName(
                                    finding.type
                                  )}`}
                                >
                                  {finding.type}
                                </span>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${statusToneClassName(
                                    finding.status
                                  )}`}
                                >
                                  {finding.status}
                                </span>
                              </div>
                              <p className="mt-3 text-sm font-semibold text-app-text">
                                {finding.description}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                                <span className="inline-flex items-center gap-1.5">
                                  <UserRound className="h-3.5 w-3.5" />
                                  {finding.assignedTo}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  {finding.dueDate}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFinding(index)}
                              className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-5 rounded-[24px] border border-dashed border-app-border bg-white/70 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-bold text-slate-600">Tipo de hallazgo</span>
                        <select
                          value={newFinding.type}
                          onChange={(event) =>
                            setNewFinding({
                              ...newFinding,
                              type: event.target.value as Finding['type'],
                            })
                          }
                          className="admin-select mt-2 w-full"
                        >
                          <option value="nonconformity">No conformidad</option>
                          <option value="observation">Observación</option>
                          <option value="opportunity">Oportunidad</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-slate-600">Estado del hallazgo</span>
                        <select
                          value={newFinding.status}
                          onChange={(event) =>
                            setNewFinding({
                              ...newFinding,
                              status: event.target.value as Finding['status'],
                            })
                          }
                          className="admin-select mt-2 w-full"
                        >
                          <option value="open">Abierto</option>
                          <option value="in-progress">En progreso</option>
                          <option value="closed">Cerrado</option>
                        </select>
                      </label>

                      <label className="block md:col-span-2">
                        <span className="text-sm font-bold text-slate-600">Descripción</span>
                        <textarea
                          value={newFinding.description}
                          onChange={(event) =>
                            setNewFinding({ ...newFinding, description: event.target.value })
                          }
                          className="admin-input mt-2 min-h-[96px] resize-none"
                          placeholder="Describe el hallazgo observado"
                        />
                      </label>

                      <label className="block">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                          <UserRound className="h-4 w-4" />
                          Responsable
                        </span>
                        <input
                          type="text"
                          value={newFinding.assignedTo}
                          onChange={(event) =>
                            setNewFinding({ ...newFinding, assignedTo: event.target.value })
                          }
                          className="admin-input mt-2"
                        />
                      </label>

                      <label className="block">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                          <CalendarClock className="h-4 w-4" />
                          Fecha límite
                        </span>
                        <input
                          type="date"
                          value={newFinding.dueDate}
                          onChange={(event) =>
                            setNewFinding({ ...newFinding, dueDate: event.target.value })
                          }
                          className="admin-input mt-2"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={addFinding}
                      className="app-button-primary mt-4 inline-flex items-center gap-2 px-4 py-3 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar hallazgo
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[26px] border border-app-border bg-app-surface-alt/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-extrabold text-app-text">Tareas vinculadas</h4>
                  <p className="mt-1 text-sm text-app-muted">
                    Conecta responsables y acciones correctivas asociadas.
                  </p>
                </div>
                <span className="rounded-full bg-app-primary/10 px-3 py-1 text-xs font-bold text-app-primary">
                  {formData.relatedTaskIds.length}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-4"
                    >
                      <input
                        type="checkbox"
                        checked={formData.relatedTaskIds.includes(task.id)}
                        onChange={() => toggleSelection('relatedTaskIds', task.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <div>
                        <p className="font-bold text-app-text">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {task.assignedTo} · {task.status} · {task.standard}
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-5 text-sm text-app-muted">
                    No hay tareas cargadas para vincular todavía.
                  </div>
                )}
              </div>
                  </div>

                  <div className="rounded-[26px] border border-app-border bg-app-surface-alt/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-extrabold text-app-text">Documentos vinculados</h4>
                  <p className="mt-1 text-sm text-app-muted">
                    Relaciona evidencia, procedimientos o registros del proceso.
                  </p>
                </div>
                <span className="rounded-full bg-app-info/10 px-3 py-1 text-xs font-bold text-app-info">
                  {formData.relatedDocumentIds.length}
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
                        checked={formData.relatedDocumentIds.includes(document.id)}
                        onChange={() => toggleSelection('relatedDocumentIds', document.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <div>
                        <p className="font-bold text-app-text">{document.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {document.standard} · {document.type} · v{document.version}
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-5 text-sm text-app-muted">
                    No hay documentos disponibles para vincular.
                  </div>
                )}
              </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Resumen del cambio</span>
                  <textarea
                    value={formData.changeSummary}
                    onChange={(event) =>
                      setFormData({ ...formData, changeSummary: event.target.value })
                    }
                    className="admin-input mt-2 min-h-[110px] resize-none"
                    placeholder="Ej: se agregan tareas de cierre y documentos evidencia para esta auditoría."
                  />
                </label>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[26px] border border-app-border bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-app-info/80">
                    Vista rápida
                  </p>
                  <h4 className="mt-3 text-lg font-extrabold text-app-text">
                    {mode === 'create' ? 'Nueva auditoría' : 'Edición de auditoría'}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-app-muted">
                    Reúne alcance, hallazgos, evidencia relacionada y seguimiento correctivo en un solo flujo.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[22px] border border-app-border bg-app-surface-alt/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-muted">
                      Hallazgos
                    </p>
                    <p className="mt-2 text-sm font-bold text-app-text">
                      {formData.findings.length} registrados
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-app-border bg-app-surface-alt/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-muted">
                      Tareas
                    </p>
                    <p className="mt-2 text-sm font-bold text-app-text">
                      {formData.relatedTaskIds.length} vinculadas
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-app-border bg-app-surface-alt/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-muted">
                      Documentos
                    </p>
                    <p className="mt-2 text-sm font-bold text-app-text">
                      {formData.relatedDocumentIds.length} vinculados
                    </p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-app-border bg-app-surface-alt/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-muted">
                    Estado actual
                  </p>
                  <p className="mt-2 text-sm font-bold text-app-text">
                    {formData.status === 'planned'
                      ? 'Planificada'
                      : formData.status === 'in-progress'
                        ? 'En progreso'
                        : 'Completada'}
                  </p>
                  <p className="mt-2 text-sm text-app-muted">
                    {formData.type === 'internal' ? 'Auditoría interna' : 'Auditoría externa'} para {formData.standard}.
                  </p>
                </div>
              </aside>
            </div>
          </div>

          <div className="border-t border-app-border bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="app-button-secondary w-full sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="app-button-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                {submitting
                  ? 'Guardando...'
                  : mode === 'create'
                    ? 'Programar auditoría'
                    : 'Guardar cambios'}
              </span>
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
