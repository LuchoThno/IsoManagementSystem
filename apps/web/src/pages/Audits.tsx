import React, { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchBootstrapShell } from '../lib/api';
import { useUIPermissions } from '../hooks/useUIPermissions';
import { fetchAuditChecklist } from '../lib/auditChecklistApi';
import { listCorrectiveActions } from '../lib/correctiveActionsApi';
import { AuditList } from '../components/audits/AuditList';
import { AuditFilters } from '../components/audits/AuditFilters';
import { AuditModal } from '../components/audits/AuditModal';
import type { Audit, ISOStandard } from '../types/iso';
import {
  createAuditApi,
  deleteAuditApi,
  listAudits,
  updateAuditApi,
} from '../lib/auditsApi';
import { useISOStore } from '../store/useISOStore';

export const Audits: React.FC = () => {
  const { canManageAudits } = useUIPermissions();
  const audits = useISOStore((state) => state.audits);
  const bootstrapped = useISOStore((state) => state.bootstrapped);
  const hydrateShell = useISOStore((state) => state.hydrateShell);
  const replaceAudits = useISOStore((state) => state.replaceAudits);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Audit['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Audit['type'] | 'all'>('all');
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const canManage = canManageAudits;

  const refreshAudits = useCallback(async () => {
    replaceAudits(await listAudits());
  }, [replaceAudits]);

  const refreshShell = useCallback(() => {
    void fetchBootstrapShell({ force: true })
      .then((data) => {
        hydrateShell(data);
      })
      .catch(() => {});
  }, [hydrateShell]);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const loadAudits = async () => {
      try {
        setLoading(!bootstrapped || audits.length === 0);
        setLoadError(null);
        await refreshAudits();
      } catch {
        setLoadError('No fue posible cargar las auditorías desde la API.');
      } finally {
        setLoading(false);
      }
    };

    void loadAudits();
  }, [audits.length, bootstrapped, refreshAudits]);

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

  useEffect(() => {
    if (filteredAudits.length === 0) {
      setSelectedAuditId(null);
      return;
    }

    if (!selectedAuditId || !filteredAudits.some((audit) => audit.id === selectedAuditId)) {
      setSelectedAuditId(filteredAudits[0].id);
    }
  }, [filteredAudits, selectedAuditId]);

  const { data: auditChecklist } = useQuery({
    queryKey: ['audit-checklist', selectedAuditId],
    queryFn: () => fetchAuditChecklist(selectedAuditId ?? ''),
    enabled: Boolean(selectedAuditId),
  });

  const { data: correctiveActions = [] } = useQuery({
    queryKey: ['corrective-actions'],
    queryFn: listCorrectiveActions,
  });

  const selectedAuditActions = correctiveActions.filter(
    (action) => action.auditId === selectedAuditId
  );

  const handleCreateAudit = async (auditData: Omit<Audit, 'id'>) => {
    if (!canManage) {
      return;
    }

    await createAuditApi(auditData);
    await refreshAudits();
    refreshShell();
  };

  const handleEditAudit = async (audit: Audit) => {
    if (!canManage) {
      return;
    }

    setEditingAudit(audit);
  };

  const handleDeleteAudit = async (audit: Audit) => {
    if (!canManage) {
      return;
    }

    if (!window.confirm(`Eliminar la auditoria ${audit.standard}?`)) {
      return;
    }

    await deleteAuditApi(audit.id);
    await refreshAudits();
    refreshShell();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-app-text">Auditorias</h2>
          <p className="mt-1 text-sm text-app-muted">
            Programa revisiones internas y externas con hallazgos y responsables.
          </p>
        </div>
        <button
          type="button"
          disabled={!canManage}
          onClick={() => setIsCreateModalOpen(true)}
          className="app-button-primary inline-flex items-center gap-2 px-4 py-2.5"
        >
          <Plus className="h-5 w-5" />
          <span>Programar auditoria</span>
        </button>
      </div>

      {!canManage && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Tu sesión puede revisar auditorías, checklist y acciones relacionadas, pero no programar,
          editar ni eliminar auditorías en este entorno.
        </div>
      )}

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
        <div className="app-empty-state-danger">
          <div className="mx-auto max-w-md">
            <p className="text-lg font-extrabold text-rose-700">{loadError}</p>
            <p className="mt-2 text-sm text-rose-500">
              Revisa la API de auditorías o la conexión de datos para continuar.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="app-empty-state">
          <div className="mx-auto max-w-md">
            <p className="text-lg font-extrabold text-app-text">Cargando auditorías...</p>
            <p className="mt-2 text-sm text-app-muted">
              Estamos consultando el módulo de auditorías en la API.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <AuditList
            audits={filteredAudits}
            canManage={canManage}
            onEdit={handleEditAudit}
            onDelete={handleDeleteAudit}
            onSelect={(audit) => setSelectedAuditId(audit.id)}
            selectedAuditId={selectedAuditId}
          />

          {selectedAuditId && auditChecklist ? (
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="panel-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-app-text">
                      Checklist de auditoría
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{auditChecklist.summary}</p>
                  </div>
                  <span className="rounded-full bg-app-primary/10 px-3 py-1.5 text-xs font-bold text-app-primary">
                    {auditChecklist.progress}% completado
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {auditChecklist.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-app-surface-alt p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            {item.clauseCode || 'Sin cláusula'}
                          </p>
                          <h4 className="mt-2 font-extrabold text-app-text">{item.title}</h4>
                          <p className="mt-2 text-sm text-slate-500">{item.prompt}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span>{item.evidenceIds.length} evidencia(s)</span>
                        <span>{item.notes || 'Sin observaciones registradas'}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel-card p-6">
                <div>
                    <h3 className="text-xl font-extrabold text-app-text">
                      Acciones correctivas relacionadas
                    </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Seguimiento de acciones derivadas de esta auditoría.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {selectedAuditActions.map((action) => (
                    <article key={action.id} className="rounded-2xl border border-slate-200 bg-app-surface-alt p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-app-text">{action.title}</p>
                          <p className="mt-2 text-sm text-slate-500">{action.description}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                          {action.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span>Responsable: {action.assignedTo}</span>
                        <span>
                          Vence: {action.dueDate ? action.dueDate.toLocaleDateString('es-CL') : 'Sin fecha'}
                        </span>
                      </div>
                    </article>
                  ))}

                  {selectedAuditActions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                      Esta auditoría aún no tiene acciones correctivas vinculadas.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}
        </div>
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
          refreshShell();
        }}
      />
    </div>
  );
};
