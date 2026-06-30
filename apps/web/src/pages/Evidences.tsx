import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, ShieldCheck } from 'lucide-react';
import { listEvidences } from '../lib/standardsApi';

export const Evidences: React.FC = () => {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const pageSize = 12;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['evidences', page, deferredSearch],
    queryFn: () => listEvidences({ page, pageSize, search: deferredSearch }),
  });
  const evidences = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  return (
    <div className="space-y-6">
      <section className="panel-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-700">Evidencia objetiva</h1>
            <p className="mt-2 text-sm text-slate-500">
              Repositorio transversal para demostrar cumplimiento por cláusula y requisito.
            </p>
          </div>
          <div className="rounded-2xl bg-[#727cf5]/10 p-4 text-[#727cf5]">
            <ShieldCheck className="h-8 w-8" />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            className="admin-input md:max-w-md"
            placeholder="Buscar por título, responsable o nota"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p className="text-sm text-slate-400">
            {isFetching ? 'Actualizando...' : `${total} evidencia(s) registradas`}
          </p>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white py-14 text-center text-slate-500">
          Cargando evidencias...
        </div>
      ) : (
        <div className="space-y-4">
          {evidences.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {evidences.map((evidence) => (
                <article key={evidence.id} className="panel-card p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{evidence.objectiveType}</p>
                      <h2 className="mt-2 text-lg font-extrabold text-slate-700">{evidence.title}</h2>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{evidence.status}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{evidence.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span>Responsable: {evidence.owner}</span>
                    <span>Requisito: {evidence.requirementId}</span>
                    <span>Norma: {evidence.standardId ?? 'No asignada'}</span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                    <Link2 className="h-3.5 w-3.5" />
                    {evidence.documentIds.length} documento(s) relacionado(s)
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white py-14 text-center text-slate-500">
              No se encontraron evidencias para esta búsqueda.
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
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
    </div>
  );
};
