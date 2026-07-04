import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

const versionEntrySchema = {
  id: { type: String, required: true },
  version: { type: String, required: true },
  date: { type: Date, required: true },
  author: { type: String, required: true },
  notes: { type: String, required: true },
};

const auditEntrySchema = {
  id: { type: String, required: true },
  action: { type: String, enum: ['created', 'updated', 'viewed'], required: true },
  date: { type: Date, required: true },
  author: { type: String, required: true },
  details: { type: String, required: true },
};

@Schema({ timestamps: true, collection: 'documents' })
export class DocumentEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: 'General' })
  topic!: string;

  @Prop()
  fileName?: string;

  @Prop()
  mimeType?: string;

  @Prop({ required: true, enum: ['manual', 'procedure', 'record'] })
  type!: 'manual' | 'procedure' | 'record';

  @Prop({
    required: true,
    enum: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'PNG', 'JPG', 'WEBP', 'GIF'],
    default: 'TXT',
  })
  format!: 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'TXT' | 'PNG' | 'JPG' | 'WEBP' | 'GIF';

  @Prop({ required: true })
  standard!: string;

  @Prop({ required: true, default: '1.0' })
  version!: string;

  @Prop({ required: true, enum: ['draft', 'active', 'archived'], default: 'draft' })
  status!: 'draft' | 'active' | 'archived';

  @Prop({ required: true })
  url!: string;

  @Prop({ type: [versionEntrySchema], default: [] })
  versionHistory!: Array<{
    id: string;
    version: string;
    date: Date;
    author: string;
    notes: string;
  }>;

  @Prop({ type: [auditEntrySchema], default: [] })
  auditTrail!: Array<{
    id: string;
    action: 'created' | 'updated' | 'viewed';
    date: Date;
    author: string;
    details: string;
  }>;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentEntity);
DocumentSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });
