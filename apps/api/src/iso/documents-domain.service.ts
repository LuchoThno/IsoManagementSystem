import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import type { CreateDocumentDto, UpdateDocumentDto } from './dto/documents.dto';
import { GoogleDriveService } from './google-drive.service';
import { Audit } from './schemas/audit.schema';
import { DocumentEntity } from './schemas/document.schema';
import { StandardEntity } from './schemas/standard.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';
import { TraceabilitySyncService } from './traceability-sync.service';

type ChangeContext = {
  author: string;
  summary?: string;
};

@Injectable()
export class DocumentsDomainService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    @InjectModel(StandardEntity.name)
    private readonly standardModel: Model<StandardEntity>,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService,
    private readonly traceabilitySyncService: TraceabilitySyncService,
    private readonly googleDriveService: GoogleDriveService
  ) {}

  async listDocumentSummaries() {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillDocumentTenantIds(tenantId);
    const documents = await this.documentModel.find({ tenantId }).sort({ updatedAt: -1 }).lean();
    return documents.map((document) => this.serializeDocumentSummary(document));
  }

  async createDocument(payload: CreateDocumentDto, changeContext: ChangeContext) {
    const now = new Date();
    const tenantId = await this.resolveEffectiveTenantId();
    const linkedAuditIds = this.normalizeIds(payload.linkedAuditIds);
    const linkedTaskIds = this.normalizeIds(payload.linkedTaskIds);
    const storageMode = payload.storageMode === 'google-drive' ? 'google-drive' : 'inline';
    const storedAsset = await this.storeDocumentAsset({
      tenantId,
      payload,
      linkedAuditIds,
    });
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
      url: storedAsset.url,
      linkedAuditIds,
      linkedTaskIds,
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
          author: changeContext.author,
          details:
            changeContext.summary?.trim() ||
            `Documento creado con formato ${payload.format}${
              storageMode === 'google-drive' ? ` en ${storedAsset.locationLabel}` : ''
            }`,
          relatedAuditIds: linkedAuditIds,
          relatedTaskIds: linkedTaskIds,
        },
      ],
    });

    await this.traceabilitySyncService.syncDocumentRelations({
      tenantId,
      resourceId: String(document._id),
      nextAuditIds: linkedAuditIds,
      nextTaskIds: linkedTaskIds,
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

  async updateDocument(id: string, updates: UpdateDocumentDto, changeContext: ChangeContext) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillDocumentTenantIds(tenantId);
    const document = await this.documentModel.findOne({ _id: id, tenantId });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const previousAuditIds = this.normalizeIds(document.linkedAuditIds);
    const previousTaskIds = this.normalizeIds(document.linkedTaskIds);
    const previousVersion = document.version;
    if (typeof updates.title === 'string') document.title = updates.title;
    if (typeof updates.topic === 'string') document.topic = updates.topic;
    if (typeof updates.format === 'string') document.format = updates.format;
    if (typeof updates.status === 'string') document.status = updates.status;
    if (typeof updates.version === 'string') document.version = updates.version;
    if (Array.isArray(updates.linkedAuditIds)) {
      document.linkedAuditIds = this.normalizeIds(updates.linkedAuditIds);
    }
    if (Array.isArray(updates.linkedTaskIds)) {
      document.linkedTaskIds = this.normalizeIds(updates.linkedTaskIds);
    }

    document.auditTrail = [
      ...(document.auditTrail ?? []),
      {
        id: this.makeId('doc-audit'),
        action: 'updated',
        date: new Date(),
        author: changeContext.author,
        details:
          changeContext.summary?.trim() ||
          `Se actualizo el documento${updates.version ? ` a la version ${updates.version}` : ''}`,
        relatedAuditIds: this.normalizeIds(document.linkedAuditIds),
        relatedTaskIds: this.normalizeIds(document.linkedTaskIds),
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
    await this.traceabilitySyncService.syncDocumentRelations({
      tenantId,
      resourceId: id,
      previousAuditIds,
      nextAuditIds: this.normalizeIds(document.linkedAuditIds),
      previousTaskIds,
      nextTaskIds: this.normalizeIds(document.linkedTaskIds),
    });
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
        relatedAuditIds: this.normalizeIds(document.linkedAuditIds),
        relatedTaskIds: this.normalizeIds(document.linkedTaskIds),
      },
    ];

    await document.save();
    return this.serializeDocument(document.toObject());
  }

  async deleteDocument(id: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillDocumentTenantIds(tenantId);
    const document = await this.documentModel.findOneAndDelete({ _id: id, tenantId }).lean();
    if (document) {
      await this.traceabilitySyncService.syncDocumentRelations({
        tenantId,
        resourceId: id,
        previousAuditIds: this.normalizeIds(document.linkedAuditIds),
        nextAuditIds: [],
        previousTaskIds: this.normalizeIds(document.linkedTaskIds),
        nextTaskIds: [],
      });
    }
    return { success: true };
  }

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private async storeDocumentAsset({
    tenantId,
    payload,
    linkedAuditIds,
  }: {
    tenantId: string;
    payload: CreateDocumentDto;
    linkedAuditIds: string[];
  }) {
    if (payload.storageMode !== 'google-drive') {
      return {
        url: payload.fileContentUrl,
        locationLabel: 'Aplicacion',
      };
    }

    const fileBytes = this.extractBytesFromDataUrl(payload.fileContentUrl);
    const auditFolderLabel = await this.resolveAuditFolderLabel(tenantId, linkedAuditIds[0]);
    const standardFolderLabel = await this.resolveStandardFolderLabel(tenantId, payload.standard);
    const folderSegments = [
      standardFolderLabel,
      ...(auditFolderLabel ? ['Auditorias', auditFolderLabel] : []),
      this.normalizeFolderSegment(payload.topic || 'Documentos'),
    ];

    const stored = await this.googleDriveService.uploadFileArtifact({
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      fileBytes,
      folderSegments,
    });

    if (!stored.fileUrl) {
      throw new BadRequestException('No fue posible obtener la URL del archivo en Google Drive.');
    }

    return {
      url: stored.fileUrl,
      locationLabel: stored.locationLabel,
    };
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
      linkedAuditIds: document.linkedAuditIds ?? [],
      linkedTaskIds: document.linkedTaskIds ?? [],
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
        relatedAuditIds: entry.relatedAuditIds ?? [],
        relatedTaskIds: entry.relatedTaskIds ?? [],
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

  private extractBytesFromDataUrl(value: string) {
    const match = value.match(/^data:.*?;base64,(.+)$/);
    if (!match?.[1]) {
      throw new BadRequestException(
        'Para almacenar en Google Drive el archivo debe enviarse como data URL base64.'
      );
    }

    return Buffer.from(match[1], 'base64');
  }

  private normalizeIds(ids?: string[]) {
    return Array.from(
      new Set(
        (ids ?? [])
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      )
    );
  }

  private normalizeFolderSegment(value: string) {
    return value.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'General';
  }

  private async resolveAuditFolderLabel(tenantId: string, auditId?: string) {
    if (!auditId) {
      return null;
    }

    const audit = await this.auditModel.findOne({ _id: auditId, tenantId }).lean();
    if (!audit) {
      return null;
    }

    const auditTypeLabel = audit.type === 'internal' ? 'Interna' : 'Externa';
    const auditDateLabel =
      audit.date instanceof Date
        ? audit.date.toISOString().slice(0, 10)
        : new Date(audit.date).toISOString().slice(0, 10);

    return this.normalizeFolderSegment(`Auditoria ${auditTypeLabel} ${audit.standard} ${auditDateLabel}`);
  }

  private async resolveStandardFolderLabel(tenantId: string, standard: string) {
    const normalizedStandard = standard.trim();
    const standardFilters: Array<Record<string, string>> = [
      { code: normalizedStandard },
      { title: normalizedStandard },
    ];

    if (isValidObjectId(normalizedStandard)) {
      standardFilters.unshift({ _id: normalizedStandard });
    }

    const standardRecord = await this.standardModel
      .findOne({
        tenantId,
        $or: standardFilters,
      })
      .lean();

    if (!standardRecord) {
      return this.normalizeFolderSegment(normalizedStandard || 'General');
    }

    return this.normalizeFolderSegment(`${standardRecord.code} ${standardRecord.title}`);
  }
}
