import React from 'react';
import { Filter } from 'lucide-react';
import { useStandardOptions } from '../../hooks/useStandardOptions';
import type { ISOStandard, CalendarEvent } from '../../types/iso';

interface CalendarFiltersProps {
  onFilterStandard: (standard: ISOStandard | 'all') => void;
  onFilterType: (type: CalendarEvent['type'] | 'all') => void;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  onFilterStandard,
  onFilterType,
}) => {
  const standardOptions = useStandardOptions();
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
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

      <select
        className="admin-select"
        onChange={(e) => onFilterType(e.target.value as CalendarEvent['type'] | 'all')}
      >
        <option value="all">Todos los tipos</option>
        <option value="task">Tareas</option>
        <option value="audit">Auditorias</option>
      </select>
    </div>
  );
};
