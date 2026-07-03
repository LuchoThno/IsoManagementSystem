import { Injectable } from '@nestjs/common';
import {
  DOCUMENT_FORMAT_VALUES,
  DOCUMENT_STATUS_VALUES,
  DOCUMENT_TYPE_VALUES,
} from './domain.constants';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import type { CreateDocumentDto, UpdateDocumentDto } from './dto/documents.dto';
import {
  ensureEnumValue,
  ensureNonEmptyString,
  ensureOptionalEnumValue,
  ensureOptionalString,
} from './request-validation';
import type { ClerkSessionIdentity } from './clerk.types';

@Injectable()
export class DocumentsOperationsService {
  constructor(
    private readonly isoService: IsoService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  listDocuments() {
    return this.isoService.getDocuments();
  }

  getDocumentContent(id: string) {
    return this.isoService.getDocumentContent(id);
  }

  async createDocument(clerkAuth: ClerkSessionIdentity | null, body: CreateDocumentDto) {
    ensureNonEmptyString(body.title, 'title');
    ensureNonEmptyString(body.topic, 'topic');
    ensureEnumValue(body.type, 'type', DOCUMENT_TYPE_VALUES);
    ensureEnumValue(body.format, 'format', DOCUMENT_FORMAT_VALUES);
    ensureNonEmptyString(body.standard, 'standard');
    ensureNonEmptyString(body.version, 'version');
    ensureNonEmptyString(body.fileName, 'fileName');
    ensureNonEmptyString(body.mimeType, 'mimeType');
    ensureNonEmptyString(body.fileContentUrl, 'fileContentUrl');

    const document = await this.isoService.createDocument(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'documents.create',
      resourceType: 'document',
      resourceId: document?.id ?? null,
      status: 'success',
      metadata: {
        title: body.title,
        standard: body.standard,
        version: body.version,
      },
    });
    return document;
  }

  async updateDocument(
    id: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: UpdateDocumentDto
  ) {
    ensureOptionalString(body.title, 'title');
    ensureOptionalString(body.topic, 'topic');
    ensureOptionalEnumValue(body.format, 'format', DOCUMENT_FORMAT_VALUES);
    ensureOptionalString(body.version, 'version');
    ensureOptionalEnumValue(body.status, 'status', DOCUMENT_STATUS_VALUES);

    const document = await this.isoService.updateDocument(id, body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'documents.update',
      resourceType: 'document',
      resourceId: id,
      status: 'success',
      metadata: {
        title: body.title ?? null,
        version: body.version ?? null,
        statusValue: body.status ?? null,
      },
    });
    return document;
  }

  async registerDocumentView(id: string, clerkAuth: ClerkSessionIdentity | null) {
    const document = await this.isoService.registerDocumentView(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'documents.view',
      resourceType: 'document',
      resourceId: id,
      status: 'success',
    });
    return document;
  }

  async deleteDocument(id: string, clerkAuth: ClerkSessionIdentity | null) {
    const result = await this.isoService.deleteDocument(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'documents.delete',
      resourceType: 'document',
      resourceId: id,
      status: 'success',
    });
    return result;
  }
}
