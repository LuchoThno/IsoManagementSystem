import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, Files, ScanSearch, ScrollText } from 'lucide-react';
import { useUIPermissions } from '../hooks/useUIPermissions';
import { DocumentFilters } from '../components/documents/DocumentFilters';
import { EditDocumentModal } from '../components/documents/EditDocumentModal';
import { DocumentTable } from '../components/documents/DocumentTable';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import type { Document, DocumentAsset, ISOStandard } from '../types/iso';
import {
  createDocumentApi,
  deleteDocumentApi,
  fetchDocumentAsset,
  listDocuments,
  registerDocumentViewApi,
  updateDocumentApi,
} from '../lib/documentsApi';
import { fetchBootstrapShell } from '../lib/api';
import { useISOStore } from '../store/useISOStore';

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No fue posible leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });

const resolveDocumentAssetUrl = async (asset: DocumentAsset) => {
  if (!asset.url.startsWith('data:')) {
    return { url: asset.url, revoke: () => {} };
  }

  const response = await fetch(asset.url);
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(
    asset.mimeType && blob.type !== asset.mimeType ? blob.slice(0, blob.size, asset.mimeType) : blob
  );

  return {
    url: objectUrl,
    revoke: () => window.URL.revokeObjectURL(objectUrl),
  };
};

const openDocumentAsset = async (asset: DocumentAsset, previewWindow?: Window | null) => {
  const { url, revoke } = await resolveDocumentAssetUrl(asset);
  const targetWindow = previewWindow ?? window.open('', '_blank');

  if (!targetWindow) {
    revoke();
    throw new Error('El navegador bloqueo la apertura del documento.');
  }

  targetWindow.opener = null;
  targetWindow.location.replace(url);
  window.setTimeout(revoke, 60_000);
};

const downloadDocumentAsset = async (asset: DocumentAsset, fileName: string) => {
  const { url, revoke } = await resolveDocumentAssetUrl(asset);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(revoke, 1_000);
};

export const Documents: React.FC = () => {
  const { canManageDocuments } = useUIPermissions();
  const documents = useISOStore((state) => state.documents);
  const bootstrapped = useISOStore((state) => state.bootstrapped);
  const hydrateShell = useISOStore((state) => state.hydrateShell);
  const replaceDocuments = useISOStore((state) => state.replaceDocuments);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<string | 'all'>('all');
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'manual' | 'procedure' | 'record' | 'all'>('all');
  const [selectedVersionDocument, setSelectedVersionDocument] = useState<Document | null>(null);
  const [selectedAuditDocument, setSelectedAuditDocument] = useState<Document | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const canManage = canManageDocuments;

  const refreshDocuments = useCallback(async () => {
    replaceDocuments(await listDocuments());
  }, [replaceDocuments]);

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
    const loadDocuments = async () => {
      try {
        setLoading(!bootstrapped || documents.length === 0);
        setLoadError(null);
        await refreshDocuments();
      } catch {
        setLoadError('No fue posible cargar los documentos desde la API.');
      } finally {
        setLoading(false);
      }
    };

    void loadDocuments();
  }, [bootstrapped, documents.length, refreshDocuments]);

  const activeDocuments = documents.filter((doc) => doc.status === 'active').length;
  const draftDocuments = documents.filter((doc) => doc.status === 'draft').length;
  const archivedDocuments = documents.filter((doc) => doc.status === 'archived').length;
  const controlledStandards = new Set(documents.map((doc) => doc.standard)).size;
  const topics = useMemo(
    () => Array.from(new Set(documents.map((doc) => doc.topic))).sort((a, b) => a.localeCompare(b)),
    [documents]
  );

  const filteredDocuments = documents.filter((doc) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch =
      doc.title.toLowerCase().includes(normalizedQuery) ||
      doc.topic.toLowerCase().includes(normalizedQuery);
    const matchesTopic = topicFilter === 'all' || doc.topic === topicFilter;
    const matchesStandard = standardFilter === 'all' || doc.standard === standardFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesTopic && matchesStandard && matchesType;
  });

  const handleUpload = async (data: {
    title: string;
    topic: string;
    type: 'manual' | 'procedure' | 'record';
    format: Document['format'];
    standard: ISOStandard;
    version: string;
    file: File;
  }) => {
    if (!canManage) {
      return;
    }

    const fileContentUrl = await readFileAsDataUrl(data.file);
    await createDocumentApi({
      title: data.title,
      topic: data.topic,
      type: data.type,
      format: data.format,
      standard: data.standard,
      version: data.version,
      fileName: data.file.name,
      fileContentUrl,
      mimeType: data.file.type || 'application/octet-stream',
      storageMode: 'google-drive',
    });

    await refreshDocuments();
    refreshShell();
  };

  const handleViewDocument = async (doc: Document) => {
    const previewWindow = window.open('', '_blank');
    previewWindow?.document.write(
      '<!doctype html><html><head><title>Abriendo documento...</title></head><body style="font-family:sans-serif;padding:24px">Cargando documento...</body></html>'
    );

    await registerDocumentViewApi(doc.id);
    const asset = await fetchDocumentAsset(doc.id);
    await refreshDocuments();
    refreshShell();
    await openDocumentAsset(asset, previewWindow);
  };

  const handleDownloadDocument = async (doc: Document) => {
    const asset = await fetchDocumentAsset(doc.id);
    await downloadDocumentAsset(
      asset,
      asset.fileName ?? doc.fileName ?? `${doc.title}.${doc.format.toLowerCase()}`
    );
  };

  const handleEditDocument = async (doc: Document) => {
    if (!canManage) {
      return;
    }

    setEditingDocument(doc);
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!canManage) {
      return;
    }

    if (!window.confirm(`Eliminar "${doc.title}"?`)) {
      return;
    }

    await deleteDocumentApi(doc.id);
    await refreshDocuments();
    refreshShell();
    if (selectedVersionDocument?.id === doc.id) {
      setSelectedVersionDocument(null);
    }
    if (selectedAuditDocument?.id === doc.id) {
      setSelectedAuditDocument(null);
    }
  };

  const versionDocument =
    selectedVersionDocument
      ? documents.find((item) => item.id === selectedVersionDocument.id) ?? selectedVersionDocument
      : null;
  const auditDocument =
    selectedAuditDocument
      ? documents.find((item) => item.id === selectedAuditDocument.id) ?? selectedAuditDocument
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-app-text">Gestión documental</h2>
          <p className="mt-1 text-sm text-app-muted">
            Tabla documental con versiones, formatos y trazabilidad.
          </p>
        </div>
        <DocumentUpload onUpload={handleUpload} disabled={!canManage} />
      </div>

      {!canManage && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Tu sesión puede consultar documentos, versiones y auditoría documental, pero no crear,
          editar ni eliminar registros en este entorno.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="app-stat-card">
          <div className="flex items-center gap-3">
            <div className="app-icon-chip">
              <Files className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-app-muted">Activos</p>
              <h3 className="mt-1 text-2xl font-extrabold text-app-text">{activeDocuments}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-app-muted">Documentos vigentes y listos para consulta operativa.</p>
        </div>

        <div className="app-stat-card">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-app-muted">Borradores</p>
              <h3 className="mt-1 text-2xl font-extrabold text-app-text">{draftDocuments}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-app-muted">Pendientes de revisión, ajuste o liberación documental.</p>
        </div>

        <div className="app-stat-card">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-app-muted">Archivados</p>
              <h3 className="mt-1 text-2xl font-extrabold text-app-text">{archivedDocuments}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-app-muted">Histórico conservado para trazabilidad y auditoría.</p>
        </div>

        <div className="app-stat-card">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-app-info/10 p-3 text-app-info">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-app-muted">Cobertura</p>
              <h3 className="mt-1 text-2xl font-extrabold text-app-text">{controlledStandards}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-app-muted">Normas ISO cubiertas por el repositorio documental actual.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="app-stat-card p-4">
          <DocumentFilters
            topics={topics}
            searchValue={searchQuery}
            onSearch={setSearchQuery}
            onFilterTopic={setTopicFilter}
            onFilterStandard={setStandardFilter}
            onFilterType={setTypeFilter}
          />
        </div>

        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTopicFilter('all')}
              className={`app-chip-filter ${
                topicFilter === 'all' ? 'app-chip-filter-active' : 'app-chip-filter-idle'
              }`}
            >
              Todos los temas
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setTopicFilter(topic)}
                className={`app-chip-filter ${
                  topicFilter === topic ? 'app-chip-filter-active' : 'app-chip-filter-idle'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {loadError ? (
          <div className="app-empty-state-danger">
            <div className="mx-auto max-w-md">
              <p className="text-lg font-extrabold text-rose-700">{loadError}</p>
              <p className="mt-2 text-sm text-rose-500">
                Revisa la API o la conexión de datos para continuar.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="app-empty-state">
            <div className="mx-auto max-w-md">
              <p className="text-lg font-extrabold text-app-text">Cargando documentos...</p>
              <p className="mt-2 text-sm text-app-muted">
                Estamos consultando el repositorio documental en la API.
              </p>
            </div>
          </div>
        ) : filteredDocuments.length > 0 ? (
          <DocumentTable
            documents={filteredDocuments}
            canManage={canManage}
            onView={handleViewDocument}
            onDownload={handleDownloadDocument}
            onEdit={handleEditDocument}
            onDelete={handleDeleteDocument}
            onShowVersions={setSelectedVersionDocument}
            onShowAudit={setSelectedAuditDocument}
          />
        ) : (
          <div className="app-empty-state">
            <div className="mx-auto max-w-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ScanSearch className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-extrabold text-app-text">
                No encontramos documentos con esos filtros
              </p>
              <p className="mt-2 text-sm text-app-muted">
                Ajusta la búsqueda o cambia el tema, la norma o el tipo documental.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="panel-title">Versiones del documento</h3>
              <p className="mt-1 text-sm text-slate-400">
                {versionDocument ? versionDocument.title : 'Selecciona una versión desde la tabla'}
              </p>
            </div>
            <Files className="h-5 w-5 text-app-primary" />
          </div>

          <div className="mt-5 space-y-3">
            {versionDocument ? (
              versionDocument.versionHistory
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-app-surface-alt p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-700">v{entry.version}</p>
                      <span className="text-xs font-medium text-slate-400">
                        {entry.date.toLocaleString('es-CL')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{entry.notes}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      {entry.author}
                    </p>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Aquí aparecerá el historial de versiones del documento seleccionado.
              </div>
            )}
          </div>
        </section>

        <section className="panel-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="panel-title">Auditoría documental</h3>
              <p className="mt-1 text-sm text-slate-400">
                {auditDocument ? auditDocument.title : 'Selecciona una auditoría desde la tabla'}
              </p>
            </div>
            <ScrollText className="h-5 w-5 text-app-info" />
          </div>

          <div className="mt-5 space-y-3">
            {auditDocument ? (
              auditDocument.auditTrail
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-app-surface-alt p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-app-surface px-3 py-1 text-xs font-bold uppercase text-slate-600">
                        {entry.action === 'created'
                          ? 'Creación'
                          : entry.action === 'updated'
                            ? 'Actualización'
                            : 'Consulta'}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {entry.date.toLocaleString('es-CL')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{entry.details}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      {entry.author}
                    </p>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Aquí aparecerá la bitácora de auditoría del documento seleccionado.
              </div>
            )}
          </div>
        </section>
      </div>

      <EditDocumentModal
        isOpen={Boolean(editingDocument)}
        document={editingDocument}
        onClose={() => setEditingDocument(null)}
        onSubmit={async (documentId, updates) => {
          await updateDocumentApi(documentId, updates);
          await refreshDocuments();
          refreshShell();
        }}
      />
    </div>
  );
};
