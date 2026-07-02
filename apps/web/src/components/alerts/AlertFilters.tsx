// src/components/alerts/AlertFilters.tsx
import React from 'react';
import { Filter } from 'lucide-react';
import type { Alert } from '../../types/iso';

interface AlertFiltersProps {
  onFilterType: (type: Alert['type'] | 'all') => void;
  onFilterPriority: (priority: Alert['priority'] | 'all') => void;
}

export const AlertFilters: React.FC<AlertFiltersProps> = ({ onFilterType, onFilterPriority }) => {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-app-muted" />
        <select
          onChange={(e) => onFilterType(e.target.value as Alert['type'] | 'all')}
          className="admin-select"
        >
          <option value="all">Todos los tipos</option>
          <option value="task">Tareas</option>
          <option value="audit">Auditorias</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <select
          onChange={(e) => onFilterPriority(e.target.value as Alert['priority'] | 'all')}
          className="admin-select"
        >
          <option value="all">Todas las prioridades</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
      </div>
    </div>
  );
};
