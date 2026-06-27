import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchBootstrap } from '../lib/api';
import { AuditList } from '../components/audits/AuditList';
import { AuditFilters } from '../components/audits/AuditFilters';
import { AuditModal } from '../components/audits/AuditModal';
import type { Audit, ISOStandard } from '../types/iso';
import {
  createAuditApi,
  deleteAuditApi,
  updateAuditApi,
} from '../lib/auditsApi';
import { useISOStore } from '../store/useISOStore';

export const Audits: React.FC = () => {
  const hydrate = useISOStore((state) => state.hydrate);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Audit['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Audit['type'] | 'all'>('all');
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');

  const refreshAudits = useCallback(async () => {
    const bootstrap = await fetchBootstrap();
    hydrate(bootstrap);
    setAudits(bootstrap.audits);
  }, [hydrate]);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const loadAudits = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        await refreshAudits();
      } catch {
        setLoadError('No fue posible cargar las auditorías desde la API.');
      } finally {
        setLoading(false);
      }
    };

    void loadAudits();
  }, [refreshAudits]);

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch =
      searchQuery.length === 0 ||
      audit.standard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.findings.some(finding => 
        finding.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;
    const matchesType = typeFilter === 'all' || audit.type === typeFilter;
    const matchesStandard = standardFilter === 'all' || audit.standard === standardFilter;
    return matchesSearch && matchesStatus && matchesType && matchesStandard;
  });

  const handleCreateAudit = async (auditData: Omit<Audit, 'id'>) => {
    const newAudit = await createAuditApi(auditData);
    setAudits((current) => [...current, newAudit]);
    await refreshAudits();
  };

  const handleEditAudit = async (audit: Audit) => {
    setEditingAudit(audit);
  };

  const handleDeleteAudit = async (audit: Audit) => {
    if (!window.confirm(`Eliminar la auditoria ${audit.standard}?`)) {
      return;
    }

    await deleteAuditApi(audit.id);
    await refreshAudits();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-700">Auditorias</h2>
          <p className="mt-1 text-sm text-slate-400">
            Programa revisiones internas y externas con hallazgos y responsables.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 rounded-lg bg-[#727cf5] px-4 py-2.5 text-white transition-colors hover:bg-[#636df0]"
        >
          <Plus className="w-5 h-5" />
          <span>Programar auditoria</span>
        </button>
      </div>

      <div className="panel-card p-4">
        <AuditFilters
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          onFilterStatus={setStatusFilter}
          onFilterType={setTypeFilter}
          onFilterStandard={setStandardFilter}
        />
      </div>

      {loadError ? (
        <div className="rounded-[28px] border border-dashed border-rose-200 bg-rose-50 py-14 text-center">
          <div className="mx-auto max-w-md">
            <p className="text-lg font-extrabold text-rose-700">{loadError}</p>
            <p className="mt-2 text-sm text-rose-500">
              Revisa la API de auditorías o la conexión de datos para continuar.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white py-14 text-center">
          <div className="mx-auto max-w-md">
            <p className="text-lg font-extrabold text-slate-700">Cargando auditorías...</p>
            <p className="mt-2 text-sm text-slate-400">
              Estamos consultando el módulo de auditorías en la API.
            </p>
          </div>
        </div>
      ) : (
        <AuditList
          audits={filteredAudits}
          onEdit={handleEditAudit}
          onDelete={handleDeleteAudit}
        />
      )}

      <AuditModal
        isOpen={isCreateModalOpen}
        mode="create"
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAudit}
      />

      <AuditModal
        isOpen={Boolean(editingAudit)}
        mode="edit"
        initialAudit={editingAudit}
        onClose={() => setEditingAudit(null)}
        onSubmit={async (auditData) => {
          if (!editingAudit) return;
          await updateAuditApi(editingAudit.id, auditData);
          await refreshAudits();
        }}
      />
    </div>
  );
};
