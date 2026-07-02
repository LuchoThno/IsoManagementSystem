import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useStandardOptions } from '../../hooks/useStandardOptions';
import type { ISOStandard, Task } from '../../types/iso';

interface TaskFiltersProps {
  onSearch: (query: string) => void;
  onFilterStatus: (status: Task['status'] | 'all') => void;
  onFilterPriority: (priority: Task['priority'] | 'all') => void;
  onFilterStandard: (standard: ISOStandard | 'all') => void;
  searchValue?: string;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  onSearch,
  onFilterStatus,
  onFilterPriority,
  onFilterStandard,
  searchValue = '',
}) => {
  const standardOptions = useStandardOptions();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-app-border bg-app-surface-alt px-3 py-2.5">
        <Search className="h-4 w-4 text-app-muted" />
        <input
          type="text"
          placeholder="Buscar tareas..."
          className="w-full border-none bg-transparent text-sm text-app-text outline-none placeholder:text-app-muted"
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-app-muted" />
          <select
            className="admin-select"
            onChange={(e) => onFilterStatus(e.target.value as Task['status'] | 'all')}
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="in-progress">En progreso</option>
            <option value="completed">Completada</option>
            <option value="overdue">Vencida</option>
          </select>
        </div>
        
        <select
          className="admin-select"
          onChange={(e) => onFilterPriority(e.target.value as Task['priority'] | 'all')}
        >
          <option value="all">Todas las prioridades</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
        
        <select
          className="admin-select"
          onChange={(e) => onFilterStandard(e.target.value as ISOStandard | 'all')}
        >
          <option value="all">Todas las normas</option>
          {standardOptions.map((standard) => (
            <option key={standard.id} value={standard.code}>
              {standard.code}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
