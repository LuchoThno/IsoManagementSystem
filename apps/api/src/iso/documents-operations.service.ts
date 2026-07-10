import { Injectable } from '@nestjs/common';
import {
  DOCUMENT_FORMAT_VALUES,
  DOCUMENT_STATUS_VALUES,
  DOCUMENT_TYPE_VALUES,
} from './domain.constants';
import { PlatformAuditService } from './platform-audit.service';
import type { CreateDocumentDto, UpdateDocumentDto } from './dto/documents.dto';
import {
  ensureEnumValue,
  ensureNonEmptyString,
  ensureObject,
  ensureOptionalEnumValue,
  ensureOptionalString,
  ensureStringArray,
} from './request-validation';
import type { ClerkSessionIdentity } from './clerk.types';
import { DocumentsDomainService } from './documents-domain.service';

@Injectable()
export class DocumentsOperationsService {
  constructor(
    private readonly documentsDomainService: DocumentsDomainService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  listDocuments() {
    return this.documentsDomainService.listDocumentSummaries();
  }

  getDocumentContent(id: string) {
    ensureNonEmptyString(id, 'id');
    return this.documentsDomainService.getDocumentContent(id);
  }

  async createDocument(clerkAuth: ClerkSessionIdentity | null, body: CreateDocumentDto) {
    ensureObject(body, 'body');
    ensureNonEmptyString(body.title, 'title');
    ensureNonEmptyString(body.topic, 'topic');
    ensureEnumValue(body.type, 'type', DOCUMENT_TYPE_VALUES);
    ensureEnumValue(body.format, 'format', DOCUMENT_FORMAT_VALUES);
    ensureNonEmptyString(body.standard, 'standard');
    ensureNonEmptyString(body.version, 'version');
    ensureNonEmptyString(body.fileName, 'fileName');
    ensureNonEmptyString(body.mimeType, 'mimeType');
    ensureNonEmptyString(body.fileContentUrl, 'fileContentUrl');
    ensureOptionalEnumValue(body.storageMode, 'storageMode', ['inline', 'google-drive'] as const);
    if (body.linkedAuditIds !== undefined) ensureStringArray(body.linkedAuditIds, 'linkedAuditIds');
    if (body.linkedTaskIds !== undefined) ensureStringArray(body.linkedTaskIds, 'linkedTaskIds');
    ensureOptionalString(body.changeSummary, 'changeSummary');

    const document = await this.documentsDomainService.createDocument(body, {
      author: await this.platformAuditService.getActorLabel(clerkAuth),
      summary: body.changeSummary,
    });
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
    ensureNonEmptyString(id, 'id');
    ensureObject(body, 'body');
    ensureOptionalString(body.title, 'title');
    ensureOptionalString(body.topic, 'topic');
    ensureOptionalEnumValue(body.format, 'format', DOCUMENT_FORMAT_VALUES);
    ensureOptionalString(body.version, 'version');
    ensureOptionalEnumValue(body.status, 'status', DOCUMENT_STATUS_VALUES);
    if (body.linkedAuditIds !== undefined) ensureStringArray(body.linkedAuditIds, 'linkedAuditIds');
    if (body.linkedTaskIds !== undefined) ensureStringArray(body.linkedTaskIds, 'linkedTaskIds');
    ensureOptionalString(body.changeSummary, 'changeSummary');

    const document = await this.documentsDomainService.updateDocument(id, body, {
      author: await this.platformAuditService.getActorLabel(clerkAuth),
      summary: body.changeSummary,
    });
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
    ensureNonEmptyString(id, 'id');
    const document = await this.documentsDomainService.registerDocumentView(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'documents.view',
      resourceType: 'document',
      resourceId: id,
      status: 'success',
    });
    return document;
  }

  async deleteDocument(id: string, clerkAuth: ClerkSessionIdentity | null) {
    ensureNonEmptyString(id, 'id');
    const result = await this.documentsDomainService.deleteDocument(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'documents.delete',
      resourceType: 'document',
      resourceId: id,
      status: 'success',
    });
    return result;
  }
}
