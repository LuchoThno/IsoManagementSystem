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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      dueDate: new Date(formData.dueDate),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-app-surface p-6 shadow-floating">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-app-text">Crear tarea</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 transition hover:bg-app-surface-alt hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Titulo</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="admin-input mt-2"
                required
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Descripcion</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="admin-input mt-2"
                rows={3}
                required
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Responsable</label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="admin-input mt-2"
                required
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Fecha limite</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="admin-input mt-2"
                required
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                className="admin-select mt-2 w-full"
              >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Norma</label>
              <select
                value={formData.standard}
                onChange={(e) => setFormData({ ...formData, standard: e.target.value as ISOStandard })}
                className="admin-select mt-2 w-full"
              >
              <option value="ISO9001">ISO 9001</option>
              <option value="ISO14001">ISO 14001</option>
              <option value="ISO45001">ISO 45001</option>
            </select>
          </div>

          <button
            type="submit"
            className="app-button-primary w-full"
          >
            Crear tarea
          </button>
        </form>
      </div>
    </div>
  );
};
