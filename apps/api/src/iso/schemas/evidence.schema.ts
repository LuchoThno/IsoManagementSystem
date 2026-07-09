import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

const evidenceActivitySchema = {
  id: { type: String, required: true },
  date: { type: Date, required: true },
  author: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  status: { type: String, required: true },
};

@Schema({ timestamps: true, collection: 'evidences' })
export class EvidenceEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  description!: string;

  @Prop({ type: String, default: null })
  standardId!: string | null;

  @Prop({ required: true, index: true })
  requirementId!: string;

  @Prop({ type: String, default: null })
  clauseId!: string | null;

  @Prop({ required: true, enum: ['missing', 'pending', 'approved', 'expired'], default: 'pending' })
  status!: 'missing' | 'pending' | 'approved' | 'expired';

  @Prop({
    required: true,
    enum: ['document', 'record', 'interview', 'observation', 'contract'],
    default: 'document',
  })
  objectiveType!: 'document' | 'record' | 'interview' | 'observation' | 'contract';

  @Prop({ required: true, default: 'Administrador ISO' })
  owner!: string;

  @Prop({ type: String, default: null })
  sourceDocumentId!: string | null;

  @Prop({ type: [String], default: [] })
  documentIds!: string[];

  @Prop({ type: [String], default: [] })
  linkedAuditIds!: string[];

  @Prop({ type: String, default: null })
  findingId!: string | null;

  @Prop({ type: [String], default: [] })
  linkedTaskIds!: string[];

  @Prop({ required: true, default: '' })
  fulfillmentSummary!: string;

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  completionPercentage!: number;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;

  @Prop({ type: Date, default: null })
  collectedAt!: Date | null;

  @Prop({ required: true, default: '' })
  notes!: string;

  @Prop({ type: [evidenceActivitySchema], default: [] })
  activityLog!: Array<{
    id: string;
    date: Date;
    author: string;
    action: string;
    details: string;
    status: string;
  }>;
}

export const EvidenceSchema = SchemaFactory.createForClass(EvidenceEntity);
EvidenceSchema.index({ tenantId: 1, requirementId: 1, updatedAt: -1 });
