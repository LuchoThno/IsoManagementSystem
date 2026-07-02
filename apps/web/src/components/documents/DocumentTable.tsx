import React from 'react';
import {
  ArrowDownToLine,
  Eye,
  FileBadge2,
  FileClock,
  FileSpreadsheet,
  FileText,
  History,
  PencilLine,
  ReceiptText,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { Document } from '../../types/iso';

interface DocumentTableProps {
  documents: Document[];
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onShowVersions: (doc: Document) => void;
  onShowAudit: (doc: Document) => void;
}

const typeLabel: Record<Document['type'], string> = {
  manual: 'Manual',
  procedure: 'Procedimiento',
  record: 'Registro',
};

const typeIcon: Record<Document['type'], React.ComponentType<{ className?: string }>> = {
  manual: FileText,
  procedure: ShieldCheck,
  record: ReceiptText,
};

const formatClasses: Record<Document['format'], string> = {
  PDF: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  DOCX: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
  XLSX: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  PPTX: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
  TXT: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  PNG: 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100',
  JPG: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  WEBP: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  GIF: 'bg-pink-50 text-pink-700 ring-1 ring-pink-100',
};

const formatIcon: Record<Document['format'], React.ComponentType<{ className?: string }>> = {
  PDF: FileBadge2,
  DOCX: FileText,
  XLSX: FileSpreadsheet,
  PPTX: FileClock,
  TXT: FileText,
  PNG: FileBadge2,
  JPG: FileBadge2,
  WEBP: FileBadge2,
  GIF: FileBadge2,
};

const getDisplayFileName = (document: Document) => {
  if (document.fileName) return document.fileName;
  if (document.url?.startsWith('data:')) {
    return `${document.title.toLowerCase().replace(/\s+/g, '-')}.${document.format.toLowerCase()}`;
  }

  if (!document.url) {
    return `${document.title.toLowerCase().replace(/\s+/g, '-')}.${document.format.toLowerCase()}`;
  }

  try {
    return decodeURIComponent(document.url.split('/').pop() || document.title);
  } catch {
    return document.title;
  }
};

const actionButtonClassName =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface text-slate-500 transition hover:border-slate-300 hover:bg-app-surface-alt hover:text-slate-700';

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onView,
  onDownload,
  onEdit,
  onDelete,
  onShowVersions,
  onShowAudit,
}) => {
  return (
    <div className="overflow-hidden rounded-[28px] border border-app-border bg-app-surface shadow-panel">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-lg font-extrabold text-app-text">Repositorio documental</h3>
          <p className="mt-1 text-sm text-app-muted">
            {documents.length} documentos visibles con acceso a trazabilidad y control de versiones.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-app-surface-alt text-left text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-6 py-4">Documento</th>
              <th className="px-5 py-4">Clasificación</th>
              <th className="px-5 py-4">Control</th>
              <th className="px-5 py-4">Actualización</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((document) => {
              const TypeIcon = typeIcon[document.type];
              const FormatIcon = formatIcon[document.format];

              return (
              <tr
                key={document.id}
                className="align-top transition hover:bg-[linear-gradient(90deg,rgba(114,124,245,0.05),rgba(57,175,209,0.03))]"
              >
                <td className="px-6 py-5">
                  <div className="flex items-start gap-4">
                    <div className="app-icon-chip">
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-app-text">{document.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                        <span>{typeLabel[document.type]}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{document.standard}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="max-w-[220px] truncate">{getDisplayFileName(document)}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      {document.topic}
                    </span>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${formatClasses[document.format]}`}>
                      <FormatIcon className="h-3.5 w-3.5" />
                      {document.format}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => onShowVersions(document)}
                      className="inline-flex items-center gap-2 rounded-full bg-app-primary/10 px-3 py-1.5 text-xs font-bold text-app-primary transition hover:bg-app-primary/15"
                    >
                      <History className="h-3.5 w-3.5" />
                      v{document.version}
                    </button>
                    <div>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          document.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : document.status === 'draft'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {document.status === 'active'
                          ? 'Activo'
                          : document.status === 'draft'
                            ? 'Borrador'
                            : 'Archivado'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-bold text-slate-600">
                    {document.updatedAt.toLocaleDateString('es-CL')}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {document.auditTrail.length} eventos de auditoría
                  </p>
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-end">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onView(document)}
                        className={actionButtonClassName}
                        title="Ver documento"
                        aria-label="Ver documento"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="sr-only">Ver documento</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(document)}
                        className={actionButtonClassName}
                        title="Descargar documento"
                        aria-label="Descargar documento"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                        <span className="sr-only">Descargar documento</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onShowAudit(document)}
                        className={actionButtonClassName}
                        title="Ver auditoría documental"
                        aria-label="Ver auditoría documental"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span className="sr-only">Ver auditoría documental</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(document)}
                        className={actionButtonClassName}
                        title="Editar documento"
                        aria-label="Editar documento"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        <span className="sr-only">Editar documento</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(document)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                        title="Eliminar documento"
                        aria-label="Eliminar documento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Eliminar documento</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
