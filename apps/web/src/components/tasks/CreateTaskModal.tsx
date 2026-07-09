import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ISOStandard, Task } from '../../types/iso';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium' as Task['priority'],
    standard: 'ISO9001' as ISOStandard,
    status: 'pending' as Task['status'],
    relatedDocuments: [] as string[],
  });

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...formData,
      dueDate: new Date(formData.dueDate),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[100vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-app-border bg-app-surface shadow-floating sm:max-h-[calc(100vh-2rem)] sm:max-w-2xl sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-[linear-gradient(135deg,#313a46_0%,#3f4d5f_100%)] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                Módulo de tareas
              </p>
              <h3 className="mt-2 text-xl font-extrabold">Crear tarea</h3>
              <p className="mt-2 text-sm text-white/75">
                Define responsable, prioridad y fecha límite con el mismo flujo del sistema.
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
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
                <span className="text-sm font-bold text-slate-600">Responsable</span>
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
                <span className="text-sm font-bold text-slate-600">Fecha límite</span>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })}
                  className="admin-input mt-2"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600">Prioridad</span>
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
                <span className="text-sm font-bold text-slate-600">Norma</span>
                <select
                  value={formData.standard}
                  onChange={(event) =>
                    setFormData({ ...formData, standard: event.target.value as ISOStandard })
                  }
                  className="admin-select mt-2 w-full"
                >
                  <option value="ISO9001">ISO 9001</option>
                  <option value="ISO14001">ISO 14001</option>
                  <option value="ISO45001">ISO 45001</option>
                </select>
              </label>
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
              <button type="submit" className="app-button-primary w-full sm:flex-1">
                Crear tarea
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
