import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'evidences' })
export class EvidenceEntity {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  description!: string;

  @Prop({ default: null })
  standardId!: string | null;

  @Prop({ required: true, index: true })
  requirementId!: string;

  @Prop({ default: null })
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

  @Prop({ default: null })
  sourceDocumentId!: string | null;

  @Prop({ type: [String], default: [] })
  documentIds!: string[];

  @Prop({ type: [String], default: [] })
  linkedAuditIds!: string[];

  @Prop({ default: null })
  dueDate!: Date | null;

  @Prop({ default: null })
  collectedAt!: Date | null;

  @Prop({ required: true, default: '' })
  notes!: string;
}

export const EvidenceSchema = SchemaFactory.createForClass(EvidenceEntity);
