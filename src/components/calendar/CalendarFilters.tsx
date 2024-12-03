import React from 'react';
import { Filter } from 'lucide-react';
import type { ISOStandard, CalendarEvent } from '../../types/iso';

interface CalendarFiltersProps {
  onFilterStandard: (standard: ISOStandard | 'all') => void;
  onFilterType: (type: CalendarEvent['type'] | 'all') => void;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  onFilterStandard,
  onFilterType,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            className="border-none text-sm focus:ring-0"
            onChange={(e) => onFilterStandard(e.target.value as ISOStandard | 'all')}
          >
            <option value="all">All Standards</option>
            <option value="ISO9001">ISO 9001</option>
            <option value="ISO14001">ISO 14001</option>
            <option value="ISO45001">ISO 45001</option>
          </select>
        </div>
        
        <select
          className="border-none text-sm focus:ring-0"
          onChange={(e) => onFilterType(e.target.value as CalendarEvent['type'] | 'all')}
        >
          <option value="all">All Types</option>
          <option value="task">Tasks</option>
          <option value="audit">Audits</option>
        </select>
      </div>
    </div>
  );
};