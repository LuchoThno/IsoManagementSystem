import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DOCUMENT_FORMAT_VALUES, DOCUMENT_STATUS_VALUES, DOCUMENT_TYPE_VALUES } from './domain.constants';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import type { CreateDocumentDto, UpdateDocumentDto } from './dto/documents.dto';
import {
  ensureEnumValue,
  ensureNonEmptyString,
  ensureOptionalEnumValue,
  ensureOptionalString,
} from './request-validation';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(
    private readonly isoService: IsoService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  @Get('documents')
  getDocuments() {
    return this.isoService.getDocuments();
  }

  @Get('documents/:id/content')
  getDocumentContent(@Param('id') id: string) {
    return this.isoService.getDocumentContent(id);
  }

  @Post('documents')
  @Roles('admin', 'manager')
  async createDocument(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: CreateDocumentDto
  ) {
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

  @Patch('documents/:id')
  @Roles('admin', 'manager')
  async updateDocument(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
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

  @Post('documents/:id/view')
  async registerDocumentView(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    const document = await this.isoService.registerDocumentView(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'documents.view',
      resourceType: 'document',
      resourceId: id,
      status: 'success',
    });
    return document;
  }

  @Patch('documents/:id/delete')
  @Roles('admin', 'manager')
  async deleteDocument(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
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
