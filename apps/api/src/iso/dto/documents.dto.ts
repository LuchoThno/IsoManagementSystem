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
};

export type UpdateDocumentDto = {
  title?: string;
  topic?: string;
  format?: DocumentFormat;
  version?: string;
  status?: DocumentStatus;
};
