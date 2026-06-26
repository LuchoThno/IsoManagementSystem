import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, Files, ScanSearch, ScrollText } from 'lucide-react';
import { DocumentFilters } from '../components/documents/DocumentFilters';
import { DocumentTable } from '../components/documents/DocumentTable';
import { DocumentUpload } from '../components/documents/DocumentUpload';
import type { Document, ISOStandard } from '../types/iso';
import {
  createDocumentApi,
  deleteDocumentApi,
  listDocuments,
  registerDocumentViewApi,
  updateDocumentApi,
} from '../lib/documentsApi';

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No fue posible leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<string | 'all'>('all');
  const [standardFilter, setStandardFilter] = useState<ISOStandard | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'manual' | 'procedure' | 'record' | 'all'>('all');
  const [selectedVersionDocument, setSelectedVersionDocument] = useState<Document | null>(null);
  const [selectedAuditDocument, setSelectedAuditDocument] = useState<Document | null>(null);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        setDocuments(await listDocuments());
      } catch {
        setLoadError('No fue posible cargar los documentos desde la API.');
      } finally {
        setLoading(false);
      }
    };

    void loadDocuments();
  }, []);

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

  const refreshDocuments = async () => {
    setDocuments(await listDocuments());
  };

  const handleUpload = async (data: {
    title: string;
    topic: string;
    type: 'manual' | 'procedure' | 'record';
    format: Document['format'];
    standard: ISOStandard;
    version: string;
    file: File;
  }) => {
    const fileContentUrl = await readFileAsDataUrl(data.file);
    const newDocument = await createDocumentApi({
      title: data.title,
      topic: data.topic,
      type: data.type,
      format: data.format,
      standard: data.standard,
      version: data.version,
      fileName: data.file.name,
      fileContentUrl,
      mimeType: data.file.type || 'application/octet-stream',
    });

    setDocuments((current) => [newDocument, ...current]);
    await refreshDocuments();
  };

  const handleViewDocument = async (doc: Document) => {
    await registerDocumentViewApi(doc.id);
    await refreshDocuments();
    window.open(doc.url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadDocument = (doc: Document) => {
    const anchor = window.document.createElement('a');
    anchor.href = doc.url;
    anchor.download = doc.fileName ?? `${doc.title}.${doc.format.toLowerCase()}`;
    anchor.rel = 'noopener';
    anchor.click();
  };

  const handleEditDocument = async (doc: Document) => {
    const title = window.prompt('Nuevo titulo del documento', doc.title);
    if (!title) return;

    const topic = window.prompt('Tema del documento', doc.topic);
    if (!topic) return;

    const version = window.prompt('Version del documento', doc.version);
    if (!version) return;

    const format = window.prompt(
      'Formato: PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, WEBP o GIF',
      doc.format
    ) as
      | Document['format']
      | null;
    if (!format || !['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'PNG', 'JPG', 'WEBP', 'GIF'].includes(format)) {
      return;
    }

    const status = window.prompt(
      'Estado: draft, active o archived',
      doc.status
    ) as Document['status'] | null;
    if (!status || !['draft', 'active', 'archived'].includes(status)) {
      return;
    }

    await updateDocumentApi(doc.id, {
      title,
      topic,
      version,
      format,
      status,
    });

    await refreshDocuments();
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!window.confirm(`Eliminar "${doc.title}"?`)) {
      return;
    }

    await deleteDocumentApi(doc.id);
    await refreshDocuments();
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
          <h2 className="text-2xl font-extrabold text-slate-700">Gestión documental</h2>
          <p className="mt-1 text-sm text-slate-400">
            Tabla documental con versiones, formatos y trazabilidad.
          </p>
        </div>
        <DocumentUpload onUpload={handleUpload} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#727cf5]/10 p-3 text-[#727cf5]">
              <Files className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Activos</p>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-700">{activeDocuments}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400">Documentos vigentes y listos para consulta operativa.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Borradores</p>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-700">{draftDocuments}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400">Pendientes de revisión, ajuste o liberación documental.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Archivados</p>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-700">{archivedDocuments}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400">Histórico conservado para trazabilidad y auditoría.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#39afd1]/10 p-3 text-[#39afd1]">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Cobertura</p>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-700">{controlledStandards}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400">Normas ISO cubiertas por el repositorio documental actual.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
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
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                topicFilter === 'all'
                  ? 'bg-[#727cf5] text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              Todos los temas
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setTopicFilter(topic)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  topicFilter === topic
                    ? 'bg-[#727cf5] text-white shadow-sm'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {loadError ? (
          <div className="overflow-hidden rounded-[28px] border border-dashed border-rose-200 bg-rose-50 py-14 text-center">
            <div className="mx-auto max-w-md">
              <p className="text-lg font-extrabold text-rose-700">{loadError}</p>
              <p className="mt-2 text-sm text-rose-500">
                Revisa la API o la conexión de datos para continuar.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="overflow-hidden rounded-[28px] border border-dashed border-slate-200 bg-white py-14 text-center">
            <div className="mx-auto max-w-md">
              <p className="text-lg font-extrabold text-slate-700">Cargando documentos...</p>
              <p className="mt-2 text-sm text-slate-400">
                Estamos consultando el repositorio documental en la API.
              </p>
            </div>
          </div>
        ) : filteredDocuments.length > 0 ? (
          <DocumentTable
            documents={filteredDocuments}
            onView={handleViewDocument}
            onDownload={handleDownloadDocument}
            onEdit={handleEditDocument}
            onDelete={handleDeleteDocument}
            onShowVersions={setSelectedVersionDocument}
            onShowAudit={setSelectedAuditDocument}
          />
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-dashed border-slate-200 bg-white py-14 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ScanSearch className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-extrabold text-slate-700">
                No encontramos documentos con esos filtros
              </p>
              <p className="mt-2 text-sm text-slate-400">
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
            <Files className="h-5 w-5 text-[#727cf5]" />
          </div>

          <div className="mt-5 space-y-3">
            {versionDocument ? (
              versionDocument.versionHistory
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
            <ScrollText className="h-5 w-5 text-[#39afd1]" />
          </div>

          <div className="mt-5 space-y-3">
            {auditDocument ? (
              auditDocument.auditTrail
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase text-slate-600">
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
    </div>
  );
};
