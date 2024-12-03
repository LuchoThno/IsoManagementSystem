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
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center space-x-2">
        <Filter className="w-5 h-5 text-gray-400" />
        <select onChange={(e) => onFilterType(e.target.value as Alert['type'] | 'all')} className="border-none text-sm focus:ring-0">
          <option value="all">All Types</option>
          <option value="task">Tasks</option>
          <option value="audit">Audits</option>
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <select onChange={(e) => onFilterPriority(e.target.value as Alert['priority'] | 'all')} className="border-none text-sm focus:ring-0">
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>
  );
};