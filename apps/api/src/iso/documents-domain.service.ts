import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CreateDocumentDto, UpdateDocumentDto } from './dto/documents.dto';
import { DocumentEntity } from './schemas/document.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class DocumentsDomainService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntity>,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async listDocumentSummaries() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillDocumentTenantIds(tenantId);
    const documents = await this.documentModel.find({ tenantId }).sort({ updatedAt: -1 }).lean();
    return documents.map((document) => this.serializeDocumentSummary(document));
  }

  async createDocument(payload: CreateDocumentDto) {
    const now = new Date();
    const tenantId = await this.resolveEffectiveTenantId();
    const document = await this.documentModel.create({
      tenantId,
      title: payload.title,
      topic: payload.topic,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      type: payload.type,
      format: payload.format,
      standard: payload.standard,
      version: payload.version || '1.0',
      status: 'draft',
      url: payload.fileContentUrl,
      versionHistory: [
        {
          id: this.makeId('doc-version'),
          version: payload.version || '1.0',
          date: now,
          author: 'Administrador ISO',
          notes: `Carga inicial del archivo ${payload.fileName}`,
        },
      ],
      auditTrail: [
        {
          id: this.makeId('doc-audit'),
          action: 'created',
          date: now,
          author: 'Administrador ISO',
          details: `Documento creado con formato ${payload.format}`,
        },
      ],
    });

    return this.serializeDocument(document.toObject());
  }

  async getDocumentContent(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillDocumentTenantIds(tenantId);
    const document = await this.documentModel.findOne({ _id: id, tenantId }).lean();
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return {
      url: document.url,
      fileName: document.fileName ?? undefined,
      mimeType: document.mimeType ?? undefined,
    };
  }

  async updateDocument(id: string, updates: UpdateDocumentDto) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillDocumentTenantIds(tenantId);
    const document = await this.documentModel.findOne({ _id: id, tenantId });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const previousVersion = document.version;
    if (typeof updates.title === 'string') document.title = updates.title;
    if (typeof updates.topic === 'string') document.topic = updates.topic;
    if (typeof updates.format === 'string') document.format = updates.format;
    if (typeof updates.status === 'string') document.status = updates.status;
    if (typeof updates.version === 'string') document.version = updates.version;

    document.auditTrail = [
      ...(document.auditTrail ?? []),
      {
        id: this.makeId('doc-audit'),
        action: 'updated',
        date: new Date(),
        author: 'Administrador ISO',
        details: `Se actualizo el documento${updates.version ? ` a la version ${updates.version}` : ''}`,
      },
    ];

    if (updates.version && updates.version !== previousVersion) {
      document.versionHistory = [
        ...(document.versionHistory ?? []),
        {
          id: this.makeId('doc-version'),
          version: updates.version,
          date: new Date(),
          author: 'Administrador ISO',
          notes: `Cambio de version desde ${previousVersion}`,
        },
      ];
    }

    await document.save();
    return this.serializeDocument(document.toObject());
  }

  async registerDocumentView(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillDocumentTenantIds(tenantId);
    const document = await this.documentModel.findOne({ _id: id, tenantId });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    document.auditTrail = [
      ...(document.auditTrail ?? []),
      {
        id: this.makeId('doc-audit'),
        action: 'viewed',
        date: new Date(),
        author: 'Administrador ISO',
        details: 'Se consulto la vista del documento',
      },
    ];

    await document.save();
    return this.serializeDocument(document.toObject());
  }

  async deleteDocument(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillDocumentTenantIds(tenantId);
    await this.documentModel.findOneAndDelete({ _id: id, tenantId });
    return { success: true };
  }

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private async backfillDocumentTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantId(this.documentModel, tenantId);
  }

  private serializeDocument(document: any) {
    return {
      id: String(document._id),
      tenantId: document.tenantId ?? null,
      title: document.title,
      fileName: document.fileName ?? undefined,
      mimeType: document.mimeType ?? undefined,
      topic: document.topic ?? 'General',
      type: document.type,
      format: document.format ?? 'TXT',
      standard: document.standard,
      version: document.version,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      status: document.status,
      url: document.url,
      versionHistory: (document.versionHistory ?? []).map((entry: any) => ({
        id: entry.id,
        version: entry.version,
        date: entry.date,
        author: entry.author,
        notes: entry.notes,
      })),
      auditTrail: (document.auditTrail ?? []).map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        date: entry.date,
        author: entry.author,
        details: entry.details,
      })),
    };
  }

  private serializeDocumentSummary(document: any) {
    const serialized = this.serializeDocument(document);
    return {
      ...serialized,
      url: undefined,
    };
  }

  private makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
