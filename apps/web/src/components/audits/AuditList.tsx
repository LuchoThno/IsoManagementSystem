import React from 'react';
import { format } from 'date-fns';
import { ClipboardCheck, AlertCircle, Clock, Pencil, Trash2 } from 'lucide-react';
import type { Audit } from '../../types/iso';

interface AuditListProps {
  audits: Audit[];
  onStatusChange: (auditId: string, status: Audit['status']) => void;
  onEdit: (audit: Audit) => void;
  onDelete: (audit: Audit) => void;
}

export const AuditList: React.FC<AuditListProps> = ({ audits, onStatusChange, onEdit, onDelete }) => {
  const getStatusIcon = (status: Audit['status']) => {
    switch (status) {
      case 'completed':
        return <ClipboardCheck className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="panel-card overflow-hidden">
      <div className="hidden grid-cols-[1.5fr_150px_170px_140px_180px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 lg:grid">
        <span>Auditoria</span>
        <span>Fecha</span>
        <span>Hallazgos</span>
        <span>Estado</span>
        <span>Acciones</span>
      </div>
      {audits.map((audit) => (
        <div
          key={audit.id}
          className="grid grid-cols-1 gap-4 border-b border-slate-100 px-5 py-5 transition-colors hover:bg-slate-50 lg:grid-cols-[1.5fr_150px_170px_140px_180px]"
        >
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              {getStatusIcon(audit.status)}
              <div>
                <h3 className="text-base font-extrabold text-slate-700">
                  {audit.type === 'internal' ? 'Auditoria interna' : 'Auditoria externa'} - {audit.standard}
                </h3>
                <p className="text-sm text-slate-400">
                  Alcance y seguimiento del proceso auditado
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm font-semibold text-slate-500">
            {format(audit.date, 'MMM d, yyyy')}
          </div>

          <div className="space-y-2">
            {audit.findings.slice(0, 2).map((finding) => (
              <div key={finding.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {finding.type}
                </p>
                <p className="mt-1 text-sm text-slate-600">{finding.description}</p>
              </div>
            ))}
          </div>

          <div>
            <select
              value={audit.status}
              onChange={(e) => onStatusChange(audit.id, e.target.value as Audit['status'])}
              className="admin-select w-full"
            >
              <option value="planned">Planificada</option>
              <option value="in-progress">En progreso</option>
              <option value="completed">Completada</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(audit)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => onDelete(audit)}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>
      ))}
      {audits.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No se encontraron auditorias con esos filtros.
        </div>
      )}
    </div>
  );
};
