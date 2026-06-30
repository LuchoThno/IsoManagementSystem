import React from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  ClipboardCheck,
  Clock,
  FileSearch,
  PencilLine,
  Trash2,
} from 'lucide-react';
import type { Audit } from '../../types/iso';

interface AuditListProps {
  audits: Audit[];
  onEdit: (audit: Audit) => void;
  onDelete: (audit: Audit) => void;
  onSelect?: (audit: Audit) => void;
  selectedAuditId?: string | null;
}

export const AuditList: React.FC<AuditListProps> = ({
  audits,
  onEdit,
  onDelete,
  onSelect,
  selectedAuditId,
}) => {
  const getStatusIcon = (status: Audit['status']) => {
    switch (status) {
      case 'completed':
        return <ClipboardCheck className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <FileSearch className="w-5 h-5 text-sky-500" />;
    }
  };

  const getStatusLabel = (status: Audit['status']) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'in-progress':
        return 'En progreso';
      default:
        return 'Planificada';
    }
  };

  const getStatusTone = (status: Audit['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
      case 'in-progress':
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
      default:
        return 'bg-sky-50 text-sky-700 ring-1 ring-sky-100';
    }
  };

  const getFindingTone = (type: Audit['findings'][number]['type']) => {
    switch (type) {
      case 'nonconformity':
        return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100';
      case 'opportunity':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
      default:
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
    }
  };

  const actionButtonClassName =
    'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700';

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-lg font-extrabold text-slate-700">Agenda de auditorías</h3>
          <p className="mt-1 text-sm text-slate-400">
            {audits.length} auditorías visibles con seguimiento de hallazgos y avance operativo.
          </p>
        </div>
      </div>
      <div className="hidden grid-cols-[1.9fr_150px_1.1fr_150px_120px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 lg:grid">
        <span>Auditoría</span>
        <span>Fecha</span>
        <span>Hallazgos</span>
        <span>Estado</span>
        <span className="text-right">Acciones</span>
      </div>
      {audits.map((audit) => (
        <div
          key={audit.id}
          onClick={() => onSelect?.(audit)}
          className="grid grid-cols-1 gap-4 border-b border-slate-100 px-6 py-5 transition hover:bg-[linear-gradient(90deg,rgba(114,124,245,0.05),rgba(57,175,209,0.03))] lg:grid-cols-[1.9fr_150px_1.1fr_150px_120px]"
          style={
            selectedAuditId === audit.id
              ? { background: 'linear-gradient(90deg,rgba(114,124,245,0.08),rgba(57,175,209,0.05))' }
              : undefined
          }
        >
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#727cf5]/10 p-3 text-[#727cf5]">
                {getStatusIcon(audit.status)}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-700">
                  {audit.type === 'internal' ? 'Auditoria interna' : 'Auditoria externa'} - {audit.standard}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Alcance y seguimiento del proceso auditado
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                  <span>{audit.type === 'internal' ? 'Interna' : 'Externa'}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{audit.findings.length} hallazgos registrados</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-600">
              {format(audit.date, 'dd MMM yyyy')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {audit.date < new Date() && audit.status !== 'completed' ? 'Requiere cierre' : 'Agenda vigente'}
            </p>
          </div>

          <div className="space-y-2">
            {audit.findings.slice(0, 2).map((finding) => (
              <div key={finding.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getFindingTone(finding.type)}`}
                >
                  {finding.type}
                </span>
                <p className="mt-2 text-sm text-slate-600">{finding.description}</p>
              </div>
            ))}
            {audit.findings.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-400">
                Sin hallazgos registrados.
              </div>
            )}
          </div>

          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStatusTone(audit.status)}`}
            >
              {getStatusLabel(audit.status)}
            </span>
          </div>
          <div className="flex items-start justify-end">
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(audit);
                }}
                className={actionButtonClassName}
                title="Editar auditoría"
                aria-label="Editar auditoría"
              >
                <PencilLine className="h-4 w-4" />
                <span className="sr-only">Editar auditoría</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(audit);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                title="Eliminar auditoría"
                aria-label="Eliminar auditoría"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Eliminar auditoría</span>
              </button>
            </div>
          </div>
        </div>
      ))}
      {audits.length === 0 && (
        <div className="p-10 text-center text-slate-500">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="mt-4 text-lg font-extrabold text-slate-700">
            No se encontraron auditorías con esos filtros
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Ajusta la búsqueda o cambia estado, tipo y norma para encontrar resultados.
          </p>
        </div>
      )}
    </div>
  );
};
