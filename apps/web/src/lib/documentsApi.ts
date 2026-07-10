import type { Document, DocumentAsset } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

export type DocumentUpdatePayload = Partial<
  Pick<Document, 'title' | 'topic' | 'format' | 'version' | 'status' | 'linkedAuditIds' | 'linkedTaskIds'>
> & {
  changeSummary?: string;
};

type ApiDocument = Omit<Document, 'createdAt' | 'updatedAt' | 'versionHistory' | 'auditTrail'> & {
  createdAt: string;
  updatedAt: string;
  versionHistory: Array<{
    id: string;
    version: string;
    date: string;
    author: string;
    notes: string;
  }>;
  auditTrail: Array<{
    id: string;
    action: 'created' | 'updated' | 'viewed';
    date: string;
    author: string;
    details: string;
    relatedAuditIds?: string[];
    relatedTaskIds?: string[];
  }>;
};

type ApiDocumentAsset = DocumentAsset;

const toDocument = (document: ApiDocument): Document => ({
  ...document,
  createdAt: new Date(document.createdAt),
  updatedAt: new Date(document.updatedAt),
  versionHistory: (document.versionHistory ?? []).map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  })),
  auditTrail: (document.auditTrail ?? []).map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  })),
});

export async function listDocuments(): Promise<Document[]> {
  const documents = await requestIsoApi<ApiDocument[]>('/documents');
  return documents.map(toDocument);
}

export async function createDocumentApi(payload: {
  title: string;
  topic: string;
  type: Document['type'];
  format: Document['format'];
  standard: Document['standard'];
  version: string;
  fileName: string;
  mimeType: string;
  fileContentUrl: string;
  storageMode?: 'inline' | 'google-drive';
  linkedAuditIds?: string[];
  linkedTaskIds?: string[];
  changeSummary?: string;
}): Promise<Document> {
  const document = await requestIsoApi<ApiDocument>('/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return toDocument(document);
}

export async function updateDocumentApi(
  documentId: string,
  updates: DocumentUpdatePayload
): Promise<Document> {
  const document = await requestIsoApi<ApiDocument>(`/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  return toDocument(document);
}

export async function registerDocumentViewApi(documentId: string): Promise<Document> {
  const document = await requestIsoApi<ApiDocument>(`/documents/${documentId}/view`, {
    method: 'POST',
  });

  return toDocument(document);
}

export async function deleteDocumentApi(documentId: string): Promise<void> {
  await requestIsoApi(`/documents/${documentId}/delete`, {
    method: 'PATCH',
  });
}

export async function fetchDocumentAsset(documentId: string): Promise<DocumentAsset> {
  return requestIsoApi<ApiDocumentAsset>(`/documents/${documentId}/content`);
}
