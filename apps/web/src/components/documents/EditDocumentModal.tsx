import React from 'react';
import { FileBadge2, ScrollText, ShieldCheck, X } from 'lucide-react';
import type { DocumentUpdatePayload } from '../../lib/documentsApi';
import { useISOStore } from '../../store/useISOStore';
import type { Document } from '../../types/iso';

interface EditDocumentModalProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
  onSubmit: (documentId: string, updates: DocumentUpdatePayload) => Promise<void> | void;
}

const validFormats: Document['format'][] = [
  'PDF',
  'DOCX',
  'XLSX',
  'PPTX',
  'TXT',
  'PNG',
  'JPG',
  'WEBP',
  'GIF',
];

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  isOpen,
  document,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = React.useState({
    title: '',
    topic: '',
    version: '',
    format: 'PDF' as Document['format'],
    status: 'draft' as Document['status'],
    linkedAuditIds: [] as string[],
    linkedTaskIds: [] as string[],
    changeSummary: '',
  });
  const [submitting, setSubmitting] = React.useState(false);
  const audits = useISOStore((state) => state.audits);
  const tasks = useISOStore((state) => state.tasks);

  React.useEffect(() => {
    if (!isOpen || !document) {
      return;
    }

    setFormData({
      title: document.title,
      topic: document.topic,
      version: document.version,
      format: document.format,
      status: document.status,
      linkedAuditIds: document.linkedAuditIds ?? [],
      linkedTaskIds: document.linkedTaskIds ?? [],
      changeSummary: '',
    });
  }, [document, isOpen]);

  React.useEffect(() => {
    if (!isOpen || !document) {
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
  }, [document, isOpen, onClose, submitting]);

  const toggleSelection = (field: 'linkedAuditIds' | 'linkedTaskIds', value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((currentValue) => currentValue !== value)
        : [...current[field], value],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!document) return;

    setSubmitting(true);
    try {
      await onSubmit(document.id, formData);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !document) return null;

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
        className="flex max-h-[100vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-app-border bg-app-surface shadow-floating sm:max-h-[calc(100vh-2rem)] sm:max-w-5xl sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                Gestión documental
              </p>
              <h3 className="mt-2 text-xl font-extrabold">Actualizar documento</h3>
              <p className="mt-2 text-sm text-white/75">
                Ajusta metadatos, versión, formato y estado sin perder trazabilidad.
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
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                      <ScrollText className="h-4 w-4" />
                      Título
                    </span>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                      className="admin-input mt-2"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-slate-600">Tema</span>
                    <input
                      type="text"
                      value={formData.topic}
                      onChange={(event) => setFormData({ ...formData, topic: event.target.value })}
                      className="admin-input mt-2"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-slate-600">Versión</span>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(event) => setFormData({ ...formData, version: event.target.value })}
                      className="admin-input mt-2"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                      <FileBadge2 className="h-4 w-4" />
                      Formato
                    </span>
                    <select
                      value={formData.format}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          format: event.target.value as Document['format'],
                        })
                      }
                      className="admin-select mt-2 w-full"
                    >
                      {validFormats.map((format) => (
                        <option key={format} value={format}>
                          {format}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                      <ShieldCheck className="h-4 w-4" />
                      Estado
                    </span>
                    <select
                      value={formData.status}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          status: event.target.value as Document['status'],
                        })
                      }
                      className="admin-select mt-2 w-full"
                    >
                      <option value="draft">Borrador</option>
                      <option value="active">Activo</option>
                      <option value="archived">Archivado</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-[28px] border border-app-border bg-app-surface-alt/70 p-5 text-sm text-slate-500">
                  Archivo actual:{' '}
                  <span className="font-semibold text-app-text">
                    {document.fileName ?? document.title}
                  </span>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Resumen del cambio</span>
                  <textarea
                    value={formData.changeSummary}
                    onChange={(event) =>
                      setFormData({ ...formData, changeSummary: event.target.value })
                    }
                    className="admin-input mt-2 min-h-[110px] resize-none"
                    placeholder="Ej: documento actualizado y vinculado a auditoría/tarea para evidencia."
                  />
                </label>
              </div>

              <aside className="space-y-6">
                <div className="rounded-[28px] border border-app-border bg-app-surface-alt/70 p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                      Auditorías vinculadas
                    </h4>
                    <span className="rounded-full bg-app-info/10 px-3 py-1 text-xs font-bold text-app-info">
                      {formData.linkedAuditIds.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {audits.length > 0 ? (
                      audits.map((audit) => (
                        <label
                          key={audit.id}
                          className="flex items-start gap-3 rounded-2xl border border-app-border bg-white/85 px-4 py-4"
                        >
                          <input
                            type="checkbox"
                            checked={formData.linkedAuditIds.includes(audit.id)}
                            onChange={() => toggleSelection('linkedAuditIds', audit.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <div>
                            <p className="font-bold text-app-text">{audit.standard}</p>
                            <p className="mt-1 text-xs text-slate-400">{audit.status}</p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-app-border bg-white/85 px-4 py-5 text-sm text-app-muted">
                        No hay auditorías para vincular.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-app-border bg-app-surface-alt/70 p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                      Tareas vinculadas
                    </h4>
                    <span className="rounded-full bg-app-primary/10 px-3 py-1 text-xs font-bold text-app-primary">
                      {formData.linkedTaskIds.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <label
                          key={task.id}
                          className="flex items-start gap-3 rounded-2xl border border-app-border bg-white/85 px-4 py-4"
                        >
                          <input
                            type="checkbox"
                            checked={formData.linkedTaskIds.includes(task.id)}
                            onChange={() => toggleSelection('linkedTaskIds', task.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <div>
                            <p className="font-bold text-app-text">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-400">{task.assignedTo}</p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-app-border bg-white/85 px-4 py-5 text-sm text-app-muted">
                        No hay tareas para vincular.
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div className="border-t border-app-border bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="app-button-secondary w-full sm:w-auto sm:min-w-[160px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70 sm:flex-1"
              >
                {submitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
