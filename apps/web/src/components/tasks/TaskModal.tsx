import React from 'react';
import { CalendarClock, ClipboardPenLine, Flag, UserRound, X } from 'lucide-react';
import { useStandardOptions } from '../../hooks/useStandardOptions';
import type { ISOStandard, Task } from '../../types/iso';
import { useISOStore } from '../../store/useISOStore';

interface TaskModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialTask?: Task | null;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => Promise<void> | void;
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
};

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  mode,
  initialTask,
  onClose,
  onSubmit,
}) => {
  const documents = useISOStore((state) => state.documents);
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
      });
      return;
    }

    setFormData(emptyForm);
  }, [initialTask, isOpen, mode]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
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
              className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
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

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Trazabilidad documental
                </h4>
                <p className="mt-2 text-sm text-slate-400">
                  Vincula esta tarea con los documentos que la originan o que sirven como evidencia.
                </p>
              </div>
              <span className="rounded-full bg-[#727cf5]/10 px-3 py-1.5 text-xs font-bold text-[#727cf5]">
                {formData.relatedDocuments.length} relacionado(s)
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {documents.length > 0 ? (
                documents.map((document) => (
                  <label
                    key={document.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <input
                      type="checkbox"
                      checked={formData.relatedDocuments.includes(document.id)}
                      onChange={() => toggleRelatedDocument(document.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <div>
                      <p className="font-bold text-slate-700">{document.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {document.standard} · {document.type} · v{document.version}
                      </p>
                    </div>
                  </label>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400 md:col-span-2">
                  No hay documentos disponibles para relacionar todavía.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#727cf5] px-4 py-3 font-bold text-white transition hover:bg-[#636df0] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting
                ? 'Guardando...'
                : mode === 'create'
                  ? 'Crear tarea'
                  : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
