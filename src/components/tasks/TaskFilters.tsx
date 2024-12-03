import React from 'react';
import { Search, Filter } from 'lucide-react';
import type { ISOStandard, Task } from '../../types/iso';

interface TaskFiltersProps {
  onSearch: (query: string) => void;
  onFilterStatus: (status: Task['status'] | 'all') => void;
  onFilterPriority: (priority: Task['priority'] | 'all') => void;
  onFilterStandard: (standard: ISOStandard | 'all') => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  onSearch,
  onFilterStatus,
  onFilterPriority,
  onFilterStandard,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center space-x-2">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks..."
          className="flex-1 border-none focus:ring-0 text-sm"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            className="border-none text-sm focus:ring-0"
            onChange={(e) => onFilterStatus(e.target.value as Task['status'] | 'all')}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        
        <select
          className="border-none text-sm focus:ring-0"
          onChange={(e) => onFilterPriority(e.target.value as Task['priority'] | 'all')}
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        
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
    </div>
  );
};