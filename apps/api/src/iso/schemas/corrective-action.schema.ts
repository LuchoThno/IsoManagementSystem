import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'corrective_actions' })
export class CorrectiveActionEntity {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  description!: string;

  @Prop({
    required: true,
    enum: ['finding', 'audit', 'contract', 'requirement', 'evidence'],
  })
  sourceType!: 'finding' | 'audit' | 'contract' | 'requirement' | 'evidence';

  @Prop({ required: true })
  sourceId!: string;

  @Prop({ default: null })
  standardId!: string | null;

  @Prop({ default: null })
  auditId!: string | null;

  @Prop({ required: true, default: 'Administrador ISO' })
  assignedTo!: string;

  @Prop({ default: null })
  dueDate!: Date | null;

  @Prop({ required: true, enum: ['open', 'in-progress', 'verified', 'closed'], default: 'open' })
  status!: 'open' | 'in-progress' | 'verified' | 'closed';

  @Prop({ required: true, enum: ['low', 'medium', 'high'], default: 'medium' })
  priority!: 'low' | 'medium' | 'high';

  @Prop({ type: [String], default: [] })
  evidenceIds!: string[];

  @Prop({ required: true, default: '' })
  verificationNotes!: string;
}

export const CorrectiveActionSchema =
  SchemaFactory.createForClass(CorrectiveActionEntity);
