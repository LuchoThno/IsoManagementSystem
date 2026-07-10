import type { DocumentFormat, DocumentStatus, DocumentType } from '../domain.constants';

export type CreateDocumentDto = {
  title: string;
  topic: string;
  type: DocumentType;
  format: DocumentFormat;
  standard: string;
  version: string;
  fileName: string;
  mimeType: string;
  fileContentUrl: string;
  storageMode?: 'inline' | 'google-drive';
  linkedAuditIds?: string[];
  linkedTaskIds?: string[];
  changeSummary?: string;
};

export type UpdateDocumentDto = {
  title?: string;
  topic?: string;
  format?: DocumentFormat;
  version?: string;
  status?: DocumentStatus;
  linkedAuditIds?: string[];
  linkedTaskIds?: string[];
  changeSummary?: string;
};
