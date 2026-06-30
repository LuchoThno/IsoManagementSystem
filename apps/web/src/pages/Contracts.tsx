import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, FileSignature, Hourglass, PlusCircle } from 'lucide-react';
import { useStandardOptions } from '../hooks/useStandardOptions';
import { createContractApi, listContracts } from '../lib/contractsApi';

const emptyContract = {
  title: '',
  counterparty: '',
  identifier: '',
  owner: '',
  summary: '',
  obligationTitle: '',
  obligationClause: '',
  obligationDueDate: '',
  standardId: '',
};

export const Contracts: React.FC = () => {
  const standardOptions = useStandardOptions();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const pageSize = 8;
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['contracts', page, deferredSearch],
    queryFn: () => listContracts({ page, pageSize, search: deferredSearch }),
  });
  const contracts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [selectedContractId, setSelectedContractId] = React.useState<string>('');
  const [formData, setFormData] = React.useState({
    ...emptyContract,
    standardId: standardOptions[0]?.id ?? '',
  });

  const createMutation = useMutation({
    mutationFn: createContractApi,
    onSuccess: async () => {
      setFormData({
        ...emptyContract,
        standardId: standardOptions[0]?.id ?? '',
      });
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const selectedContract =
    contracts.find((contract) => contract.id === selectedContractId) ?? contracts[0] ?? null;

  React.useEffect(() => {
    if (contracts.length === 0) {
      setSelectedContractId('');
      return;
    }

    if (!contracts.some((contract) => contract.id === selectedContractId)) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-700">Control contractual</h1>
              <p className="mt-2 text-sm text-slate-500">
                Administra contratos, obligaciones, anexos y vencimientos con trazabilidad GRC.
              </p>
            </div>
            <div className="rounded-2xl bg-[#39afd1]/10 p-4 text-[#39afd1]">
              <FileSignature className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Contratos</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{total}</p></article>
            <article className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Obligaciones visibles</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{contracts.reduce((total, contract) => total + (contract.obligations?.length ?? 0), 0)}</p></article>
            <article className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Vencimientos visibles</p><p className="mt-2 text-2xl font-extrabold text-slate-700">{contracts.reduce((total, contract) => total + (contract.obligations?.filter((obligation) => obligation.status !== 'fulfilled').length ?? 0), 0)}</p></article>
          </div>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              className="admin-input md:max-w-md"
              placeholder="Buscar por contrato, contraparte o identificador"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <p className="text-sm text-slate-400">
              {isFetching ? 'Actualizando...' : `${total} contrato(s) encontrados`}
            </p>
          </div>
        </section>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate({
              title: formData.title,
              counterparty: formData.counterparty,
              identifier: formData.identifier,
              owner: formData.owner || 'Administrador ISO',
              summary: formData.summary,
              status: 'active',
              obligations: formData.obligationTitle ? [
                {
                  standardId: formData.standardId || null,
                  title: formData.obligationTitle,
                  sourceClause: formData.obligationClause,
                  dueDate: formData.obligationDueDate ? new Date(formData.obligationDueDate) : null,
                  priority: 'high',
                },
              ] : [],
            });
          }}
          className="panel-card p-6"
        >
          <div className="flex items-center gap-3">
            <PlusCircle className="h-5 w-5 text-[#727cf5]" />
            <div>
              <h2 className="text-lg font-extrabold text-slate-700">Nuevo contrato</h2>
              <p className="text-sm text-slate-400">Alta rápida con obligación inicial y vencimiento.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input className="admin-input md:col-span-2" placeholder="Título" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} required />
            <input className="admin-input" placeholder="Contraparte" value={formData.counterparty} onChange={(event) => setFormData({ ...formData, counterparty: event.target.value })} required />
            <input className="admin-input" placeholder="Identificador" value={formData.identifier} onChange={(event) => setFormData({ ...formData, identifier: event.target.value })} required />
            <textarea className="admin-input md:col-span-2 min-h-[96px]" placeholder="Resumen" value={formData.summary} onChange={(event) => setFormData({ ...formData, summary: event.target.value })} />
            <input className="admin-input md:col-span-2" placeholder="Obligación inicial" value={formData.obligationTitle} onChange={(event) => setFormData({ ...formData, obligationTitle: event.target.value })} />
            <input className="admin-input" placeholder="Cláusula origen" value={formData.obligationClause} onChange={(event) => setFormData({ ...formData, obligationClause: event.target.value })} />
            <input className="admin-input" type="date" value={formData.obligationDueDate} onChange={(event) => setFormData({ ...formData, obligationDueDate: event.target.value })} />
            <select className="admin-select md:col-span-2 w-full" value={formData.standardId} onChange={(event) => setFormData({ ...formData, standardId: event.target.value })}>
              <option value="">Sin norma asociada</option>
              {standardOptions.map((standard) => (
                <option key={standard.id} value={standard.id}>{standard.code} · {standard.title}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={createMutation.isPending} className="mt-4 w-full rounded-xl bg-[#727cf5] px-4 py-3 font-bold text-white transition hover:bg-[#636df0] disabled:opacity-70">
            {createMutation.isPending ? 'Guardando...' : 'Crear contrato'}
          </button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="panel-card p-6">
          <h2 className="text-xl font-extrabold text-slate-700">Contratos activos</h2>
          {isLoading ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-500">Cargando contratos...</div>
          ) : (
            <div className="mt-5 space-y-3">
              {contracts.map((contract) => (
                <button
                  key={contract.id}
                  type="button"
                  onClick={() => setSelectedContractId(contract.id)}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    selectedContract?.id === contract.id ? 'border-[#727cf5] bg-[#727cf5]/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{contract.identifier}</p>
                      <h3 className="mt-2 text-lg font-extrabold text-slate-700">{contract.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{contract.counterparty}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{contract.status}</span>
                  </div>
                </button>
              ))}
              {contracts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-500">
                  No se encontraron contratos para esta búsqueda.
                </div>
              )}
              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-sm text-slate-400">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel-card p-6">
          {selectedContract ? (
            <>
              <h2 className="text-2xl font-extrabold text-slate-700">{selectedContract.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{selectedContract.summary}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5"><FileSignature className="h-4 w-4" />{selectedContract.counterparty}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5"><CalendarDays className="h-4 w-4" />{selectedContract.startDate ? selectedContract.startDate.toLocaleDateString('es-CL') : 'Sin inicio'} - {selectedContract.endDate ? selectedContract.endDate.toLocaleDateString('es-CL') : 'Sin término'}</span>
              </div>
              <div className="mt-6 space-y-3">
                {(selectedContract.obligations ?? []).map((obligation) => (
                  <article key={obligation.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-700">{obligation.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{obligation.description || obligation.sourceClause}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{obligation.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1"><Hourglass className="h-3.5 w-3.5" />{obligation.dueDate ? obligation.dueDate.toLocaleDateString('es-CL') : 'Sin vencimiento'}</span>
                      <span className="rounded-full bg-white px-3 py-1">Prioridad {obligation.priority}</span>
                      <span className="rounded-full bg-white px-3 py-1">{obligation.owner}</span>
                    </div>
                  </article>
                ))}
                {(selectedContract.obligations?.length ?? 0) === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                    Este contrato aún no tiene obligaciones registradas.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-500">
              No hay contratos registrados todavía.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
