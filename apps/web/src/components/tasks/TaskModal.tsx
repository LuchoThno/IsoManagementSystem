import React from 'react';
import { CalendarClock, ClipboardPenLine, Flag, UserRound, X } from 'lucide-react';
import { useStandardOptions } from '../../hooks/useStandardOptions';
import type { TaskUpsertPayload } from '../../lib/tasksApi';
import type { ISOStandard, Task } from '../../types/iso';
import { useISOStore } from '../../store/useISOStore';

interface TaskModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialTask?: Task | null;
  onClose: () => void;
  onSubmit: (task: TaskUpsertPayload) => Promise<void> | void;
}

const emptyForm = {
  title: '',
  description: '',
  assignedTo: '',
  dueDate: '',
  priority: 'medium' as Task['priority'],
  standard: 'ISO9001' as ISOStandard,
  status: 'pending' as Task['status'],
  relatedDocuments: [] as string[],
  relatedAuditIds: [] as string[],
  relatedFindingIds: [] as string[],
  changeSummary: '',
};

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  mode,
  initialTask,
  onClose,
  onSubmit,
}) => {
  const documents = useISOStore((state) => state.documents);
  const audits = useISOStore((state) => state.audits);
  const standardOptions = useStandardOptions();
  const [formData, setFormData] = React.useState(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === 'edit' && initialTask) {
      setFormData({
        title: initialTask.title,
        description: initialTask.description,
        assignedTo: initialTask.assignedTo,
        dueDate: initialTask.dueDate.toISOString().slice(0, 10),
        priority: initialTask.priority,
        standard: initialTask.standard,
        status: initialTask.status,
        relatedDocuments: initialTask.relatedDocuments,
        relatedAuditIds: initialTask.relatedAuditIds ?? [],
        relatedFindingIds: initialTask.relatedFindingIds ?? [],
        changeSummary: '',
      });
      return;
    }

    setFormData(emptyForm);
  }, [initialTask, isOpen, mode]);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        dueDate: new Date(formData.dueDate),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const toggleRelatedDocument = (documentId: string) => {
    setFormData((current) => ({
      ...current,
      relatedDocuments: current.relatedDocuments.includes(documentId)
        ? current.relatedDocuments.filter((currentId) => currentId !== documentId)
        : [...current.relatedDocuments, documentId],
    }));
  };

  const toggleRelatedAudit = (auditId: string) => {
    setFormData((current) => ({
      ...current,
      relatedAuditIds: current.relatedAuditIds.includes(auditId)
        ? current.relatedAuditIds.filter((currentId) => currentId !== auditId)
        : [...current.relatedAuditIds, auditId],
    }));
  };

  const toggleRelatedFinding = (findingId: string) => {
    setFormData((current) => ({
      ...current,
      relatedFindingIds: current.relatedFindingIds.includes(findingId)
        ? current.relatedFindingIds.filter((currentId) => currentId !== findingId)
        : [...current.relatedFindingIds, findingId],
    }));
  };

  const availableFindings = audits
    .filter((audit) => formData.relatedAuditIds.includes(audit.id))
    .flatMap((audit) =>
      audit.findings.map((finding) => ({
        ...finding,
        auditId: audit.id,
        auditLabel: `${audit.type === 'internal' ? 'Interna' : 'Externa'} · ${audit.standard}`,
      }))
    );

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
        className="flex max-h-[100vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-app-border bg-app-surface shadow-floating sm:max-h-[calc(100vh-2rem)] sm:max-w-4xl sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                Módulo de tareas
              </p>
              <h3 className="mt-2 text-xl font-extrabold">
                {mode === 'create' ? 'Crear tarea operativa' : 'Actualizar tarea'}
              </h3>
              <p className="mt-2 text-sm text-white/75">
                Centraliza responsable, prioridad, fecha límite y estado en una sola edición.
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
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-slate-600">Título</span>
              <input
                type="text"
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                className="admin-input mt-2"
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-slate-600">Descripción</span>
              <textarea
                value={formData.description}
                onChange={(event) =>
                  setFormData({ ...formData, description: event.target.value })
                }
                className="admin-input mt-2 min-h-[110px] resize-none"
                required
              />
            </label>

            <label className="block">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                <UserRound className="h-4 w-4" />
                Responsable
              </span>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(event) =>
                  setFormData({ ...formData, assignedTo: event.target.value })
                }
                className="admin-input mt-2"
                required
              />
            </label>

            <label className="block">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                <CalendarClock className="h-4 w-4" />
                Fecha límite
              </span>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })}
                className="admin-input mt-2"
                required
              />
            </label>

            <label className="block">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                <Flag className="h-4 w-4" />
                Prioridad
              </span>
              <select
                value={formData.priority}
                onChange={(event) =>
                  setFormData({ ...formData, priority: event.target.value as Task['priority'] })
                }
                className="admin-select mt-2 w-full"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </label>

            <label className="block">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                <ClipboardPenLine className="h-4 w-4" />
                Estado
              </span>
              <select
                value={formData.status}
                onChange={(event) =>
                  setFormData({ ...formData, status: event.target.value as Task['status'] })
                }
                className="admin-select mt-2 w-full"
              >
                <option value="pending">Pendiente</option>
                <option value="in-progress">En progreso</option>
                <option value="completed">Completada</option>
                <option value="overdue">Vencida</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-slate-600">Norma</span>
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
          </div>

          <div className="rounded-[24px] border border-app-border bg-app-surface-alt/80 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Trazabilidad documental
                </h4>
                <p className="mt-2 text-sm text-slate-400">
                  Vincula esta tarea con los documentos que la originan o que sirven como evidencia.
                </p>
              </div>
              <span className="rounded-full bg-app-primary/10 px-3 py-1.5 text-xs font-bold text-app-primary">
                {formData.relatedDocuments.length} relacionado(s)
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {documents.length > 0 ? (
                documents.map((document) => (
                  <label
                    key={document.id}
                    className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-4"
                  >
                    <input
                      type="checkbox"
                      checked={formData.relatedDocuments.includes(document.id)}
                      onChange={() => toggleRelatedDocument(document.id)}
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
                <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-5 text-sm text-app-muted md:col-span-2">
                  No hay documentos disponibles para relacionar todavía.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-app-border bg-app-surface-alt/80 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Auditorías relacionadas
                </h4>
                <p className="mt-2 text-sm text-slate-400">
                  Deja esta tarea conectada con el proceso de auditoría que la originó.
                </p>
              </div>
              <span className="rounded-full bg-app-info/10 px-3 py-1.5 text-xs font-bold text-app-info">
                {formData.relatedAuditIds.length} vinculada(s)
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {audits.length > 0 ? (
                audits.map((audit) => (
                  <label
                    key={audit.id}
                    className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-4"
                  >
                    <input
                      type="checkbox"
                      checked={formData.relatedAuditIds.includes(audit.id)}
                      onChange={() => toggleRelatedAudit(audit.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <div>
                      <p className="font-bold text-app-text">
                        {audit.type === 'internal' ? 'Auditoría interna' : 'Auditoría externa'} · {audit.standard}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {audit.status} · {audit.date.toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </label>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-5 text-sm text-app-muted">
                  No hay auditorías disponibles para relacionar.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-app-border bg-app-surface-alt/80 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Hallazgos vinculados
                </h4>
                <p className="mt-2 text-sm text-slate-400">
                  Asocia esta tarea a observaciones, incumplimientos u oportunidades de mejora.
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
                {formData.relatedFindingIds.length} hallazgo(s)
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {availableFindings.length > 0 ? (
                availableFindings.map((finding) => (
                  <label
                    key={`${finding.auditId}-${finding.id}`}
                    className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-4"
                  >
                    <input
                      type="checkbox"
                      checked={formData.relatedFindingIds.includes(finding.id)}
                      onChange={() => toggleRelatedFinding(finding.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <div>
                      <p className="font-bold text-app-text">{finding.description}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {finding.auditLabel} · {finding.type} · {finding.status}
                      </p>
                    </div>
                  </label>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-4 py-5 text-sm text-app-muted">
                  Selecciona una auditoría para habilitar sus hallazgos.
                </div>
              )}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-slate-600">Resumen del cambio</span>
            <textarea
              value={formData.changeSummary}
              onChange={(event) => setFormData({ ...formData, changeSummary: event.target.value })}
              className="admin-input mt-2 min-h-[96px] resize-none"
              placeholder="Ej: tarea creada desde hallazgo de auditoría y enlazada con evidencia documental."
            />
          </label>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-app-border bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-app-info/80">
                Vista rapida
              </p>
              <h4 className="mt-3 text-lg font-extrabold text-app-text">
                {mode === 'create' ? 'Nueva tarea operativa' : 'Edición de tarea'}
              </h4>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                Un modal más estable en móvil y desktop, con scroll interno y acciones siempre accesibles.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[22px] border border-app-border bg-app-surface-alt/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-muted">
                  Prioridad
                </p>
                <p className="mt-2 text-sm font-bold text-app-text">
                  {formData.priority === 'high'
                    ? 'Alta'
                    : formData.priority === 'medium'
                      ? 'Media'
                      : 'Baja'}
                </p>
              </div>
              <div className="rounded-[22px] border border-app-border bg-app-surface-alt/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-muted">
                  Estado
                </p>
                <p className="mt-2 text-sm font-bold text-app-text">
                  {formData.status === 'pending'
                    ? 'Pendiente'
                    : formData.status === 'in-progress'
                      ? 'En progreso'
                      : formData.status === 'completed'
                        ? 'Completada'
                        : 'Vencida'}
                </p>
              </div>
              <div className="rounded-[22px] border border-app-border bg-app-surface-alt/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-muted">
                  Documentos
                </p>
                <p className="mt-2 text-sm font-bold text-app-text">
                  {formData.relatedDocuments.length} docs · {formData.relatedAuditIds.length} auditorías · {formData.relatedFindingIds.length} hallazgos
                </p>
              </div>
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
              {submitting
                ? 'Guardando...'
                : mode === 'create'
                  ? 'Crear tarea'
                  : 'Guardar cambios'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
