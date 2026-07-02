import React from 'react';
import { FileBadge2, ScrollText, ShieldCheck, X } from 'lucide-react';
import type { Document } from '../../types/iso';

interface EditDocumentModalProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
  onSubmit: (
    documentId: string,
    updates: Partial<Pick<Document, 'title' | 'topic' | 'format' | 'version' | 'status'>>
  ) => Promise<void> | void;
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
  });
  const [submitting, setSubmitting] = React.useState(false);

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
    });
  }, [document, isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-[30px] bg-app-surface shadow-floating">
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
              className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
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
                  setFormData({ ...formData, format: event.target.value as Document['format'] })
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
                  setFormData({ ...formData, status: event.target.value as Document['status'] })
                }
                className="admin-select mt-2 w-full"
              >
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="archived">Archivado</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-app-border bg-app-surface-alt px-4 py-4 text-sm text-slate-500">
            Archivo actual: <span className="font-semibold text-app-text">{document.fileName ?? document.title}</span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="app-button-secondary w-full"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
