import React from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock,
  PencilLine,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type { Task } from '../../types/iso';
import { useISOStore } from '../../store/useISOStore';

interface TaskListProps {
  tasks: Task[];
  canManage?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, canManage = true, onEdit, onDelete }) => {
  const documents = useISOStore((state) => state.documents);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <CircleDashed className="w-5 h-5 text-sky-500" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-700 bg-red-50 ring-1 ring-red-100';
      case 'medium':
        return 'text-amber-700 bg-amber-50 ring-1 ring-amber-100';
      case 'low':
        return 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'in-progress':
        return 'En progreso';
      case 'overdue':
        return 'Vencida';
      default:
        return 'Pendiente';
    }
  };

  const getStatusTone = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
      case 'in-progress':
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
      case 'overdue':
        return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100';
      default:
        return 'bg-sky-50 text-sky-700 ring-1 ring-sky-100';
    }
  };

  const actionButtonClassName =
    'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface text-slate-500 transition hover:border-slate-300 hover:bg-app-surface-alt hover:text-slate-700';

  return (
    <div className="overflow-hidden rounded-[28px] border border-app-border bg-app-surface shadow-panel">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="text-lg font-extrabold text-app-text">Backlog operativo</h3>
          <p className="mt-1 text-sm text-app-muted">
            {tasks.length} tareas visibles con responsables, prioridad y seguimiento.
          </p>
        </div>
      </div>
      <div className="hidden grid-cols-[1.9fr_1fr_150px_170px_120px] gap-4 border-b border-slate-100 bg-app-surface-alt px-6 py-4 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 lg:grid">
        <span>Tarea</span>
        <span>Responsable</span>
        <span>Fecha límite</span>
        <span>Estado</span>
        <span className="text-right">Acciones</span>
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="grid grid-cols-1 gap-4 border-b border-slate-100 px-6 py-5 transition hover:bg-[linear-gradient(90deg,rgba(114,124,245,0.05),rgba(57,175,209,0.03))] lg:grid-cols-[1.9fr_1fr_150px_170px_120px]"
        >
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <div className="app-icon-chip">
                {getStatusIcon(task.status)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold text-app-text">{task.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-app-muted">{task.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                  <span>{task.standard}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{task.relatedDocuments.length} documentos relacionados</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{task.relatedAuditIds?.length ?? 0} auditorías</span>
                </div>
                {task.relatedDocuments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.relatedDocuments
                      .map((documentId) => documents.find((document) => document.id === documentId))
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((document) => (
                        <span
                          key={document!.id}
                          className="rounded-full bg-app-primary/10 px-3 py-1 text-xs font-bold text-app-primary"
                        >
                          {document!.title}
                        </span>
                      ))}
                  </div>
                )}
                {(task.relatedAuditIds?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.relatedAuditIds?.slice(0, 2).map((auditId) => (
                      <span
                        key={auditId}
                        className="rounded-full bg-app-info/10 px-3 py-1 text-xs font-bold text-app-info"
                      >
                        Auditoría vinculada
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-bold text-slate-700">{task.assignedTo}</p>
            <p className="mt-1 text-slate-400">Responsable principal</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">
              {format(task.dueDate, 'dd MMM yyyy')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {task.dueDate < new Date() && task.status !== 'completed' ? 'Requiere atención' : 'Seguimiento vigente'}
            </p>
          </div>
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStatusTone(task.status)}`}
            >
              {getStatusLabel(task.status)}
            </span>
          </div>
          <div className="flex items-start justify-end">
            <div className="flex flex-wrap justify-end gap-2">
              {canManage ? (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className={actionButtonClassName}
                    title="Editar tarea"
                    aria-label="Editar tarea"
                  >
                    <PencilLine className="h-4 w-4" />
                    <span className="sr-only">Editar tarea</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(task)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                    title="Eliminar tarea"
                    aria-label="Eliminar tarea"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar tarea</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="p-10 text-center text-slate-500">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="mt-4 text-lg font-extrabold text-app-text">
            No se encontraron tareas con esos filtros
          </p>
          <p className="mt-2 text-sm text-app-muted">
            Ajusta la búsqueda o cambia estado, prioridad y norma para encontrar resultados.
          </p>
        </div>
      )}
    </div>
  );
};
