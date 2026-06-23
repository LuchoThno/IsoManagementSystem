import React from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import type { Task } from '../../types/iso';

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onStatusChange, onEdit, onDelete }) => {
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
    }
  };

  return (
    <div className="panel-card overflow-hidden">
      <div className="hidden grid-cols-[1.6fr_1fr_140px_130px_180px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 lg:grid">
        <span>Tarea</span>
        <span>Responsable / Norma</span>
        <span>Fecha limite</span>
        <span>Estado</span>
        <span>Acciones</span>
      </div>
      {tasks.map((task) => (
        <div key={task.id} className="grid grid-cols-1 gap-4 border-b border-slate-100 px-4 py-4 transition-colors hover:bg-slate-50 lg:grid-cols-[1.6fr_1fr_140px_130px_180px]">
          <div>
            <div className="flex items-center space-x-3">
              <span>{getStatusIcon(task.status)}</span>
              <h3 className="text-base font-extrabold text-slate-700">{task.title}</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getPriorityColor(task.priority)}`}>
                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">{task.description}</p>
          </div>
          <div className="text-sm">
            <p className="font-bold text-slate-600">{task.assignedTo}</p>
            <p className="mt-1 text-slate-400">{task.standard}</p>
          </div>
          <div className="text-sm font-semibold text-slate-500">
            {format(task.dueDate, 'MMM d, yyyy')}
          </div>
          <div>
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
              className="admin-select w-full"
            >
              <option value="pending">Pendiente</option>
              <option value="in-progress">En progreso</option>
              <option value="completed">Completada</option>
              <option value="overdue">Vencida</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => onDelete(task)}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No se encontraron tareas con esos filtros.
        </div>
      )}
    </div>
  );
};
