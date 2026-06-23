import type { Document } from '../types/iso';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
  }>;
};

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/iso${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listDocuments(): Promise<Document[]> {
  const documents = await request<ApiDocument[]>('/documents');
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
}): Promise<Document> {
  const document = await request<ApiDocument>('/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return toDocument(document);
}

export async function updateDocumentApi(
  documentId: string,
  updates: Partial<Pick<Document, 'title' | 'topic' | 'format' | 'version' | 'status'>>
): Promise<Document> {
  const document = await request<ApiDocument>(`/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  return toDocument(document);
}

export async function registerDocumentViewApi(documentId: string): Promise<Document> {
  const document = await request<ApiDocument>(`/documents/${documentId}/view`, {
    method: 'POST',
  });

  return toDocument(document);
}

export async function deleteDocumentApi(documentId: string): Promise<void> {
  await request(`/documents/${documentId}/delete`, {
    method: 'PATCH',
  });
}
