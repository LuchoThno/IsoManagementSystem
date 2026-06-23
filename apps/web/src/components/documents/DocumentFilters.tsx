import React from 'react';
import { Filter, Search } from 'lucide-react';
import type { ISOStandard } from '../../types/iso';

interface DocumentFiltersProps {
  onSearch: (query: string) => void;
  onFilterTopic: (topic: string | 'all') => void;
  onFilterStandard: (standard: ISOStandard | 'all') => void;
  onFilterType: (type: 'manual' | 'procedure' | 'record' | 'all') => void;
  searchValue?: string;
  topics: string[];
}

export const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  onSearch,
  onFilterTopic,
  onFilterStandard,
  onFilterType,
  searchValue = '',
  topics,
}) => {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar documento o tema..."
          className="w-full border-none bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="h-4 w-4" />
          <select
            className="admin-select"
            onChange={(e) => onFilterTopic(e.target.value as string | 'all')}
          >
            <option value="all">Todos los temas</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        <select
          className="admin-select"
          onChange={(e) => onFilterStandard(e.target.value as ISOStandard | 'all')}
        >
          <option value="all">Todas las normas</option>
          <option value="ISO9001">ISO 9001</option>
          <option value="ISO14001">ISO 14001</option>
          <option value="ISO45001">ISO 45001</option>
        </select>

        <select
          className="admin-select"
          onChange={(e) => onFilterType(e.target.value as 'manual' | 'procedure' | 'record' | 'all')}
        >
          <option value="all">Todos los tipos</option>
          <option value="manual">Manual</option>
          <option value="procedure">Procedimiento</option>
          <option value="record">Registro</option>
        </select>
      </div>
    </div>
  );
};
