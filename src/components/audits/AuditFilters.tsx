import React from 'react';
import { Search, Filter } from 'lucide-react';
import type { ISOStandard, Audit } from '../../types/iso';

interface AuditFiltersProps {
  onSearch: (query: string) => void;
  onFilterStatus: (status: Audit['status'] | 'all') => void;
  onFilterType: (type: Audit['type'] | 'all') => void;
  onFilterStandard: (standard: ISOStandard | 'all') => void;
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  onSearch,
  onFilterStatus,
  onFilterType,
  onFilterStandard,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center space-x-2">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search audits..."
          className="flex-1 border-none focus:ring-0 text-sm"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            className="border-none text-sm focus:ring-0"
            onChange={(e) => onFilterStatus(e.target.value as Audit['status'] | 'all')}
          >
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <select
          className="border-none text-sm focus:ring-0"
          onChange={(e) => onFilterType(e.target.value as Audit['type'] | 'all')}
        >
          <option value="all">All Types</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
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