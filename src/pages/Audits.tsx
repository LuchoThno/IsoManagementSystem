import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { AuditList } from '../components/audits/AuditList';
import { AuditFilters } from '../components/audits/AuditFilters';
import { CreateAuditModal } from '../components/audits/CreateAuditModal';
import { useISOStore } from '../store/useISOStore';
import type { Audit, ISOStandard } from '../types/iso';

export const Audits: React.FC = () => {
  const audits = useISOStore((state) => state.audits);
  const addAudit = useISOStore((state) => state.addAudit);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Audit['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Audit['type'] | 'all'>('all');
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch = audit.findings.some(finding => 
      finding.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;
    const matchesType = typeFilter === 'all' || audit.type === typeFilter;
    const matchesStandard = standardFilter === 'all' || audit.standard === standardFilter;
    return matchesSearch && matchesStatus && matchesType && matchesStandard;
  });

  const handleCreateAudit = (auditData: Omit<Audit, 'id'>) => {
    const newAudit: Audit = {
      ...auditData,
      id: Math.random().toString(36).substr(2, 9),
    };
    addAudit(newAudit);
  };

  const handleStatusChange = (auditId: string, status: Audit['status']) => {
    // This would need to be implemented in the store
    console.log('Status change:', auditId, status);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Audits</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Schedule Audit</span>
        </button>
      </div>

      <AuditFilters
        onSearch={setSearchQuery}
        onFilterStatus={setStatusFilter}
        onFilterType={setTypeFilter}
        onFilterStandard={setStandardFilter}
      />

      <AuditList
        audits={filteredAudits}
        onStatusChange={handleStatusChange}
      />

      <CreateAuditModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAudit}
      />
    </div>
  );
};