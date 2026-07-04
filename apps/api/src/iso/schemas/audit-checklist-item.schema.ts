import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'audit_checklist_items' })
export class AuditChecklistItemEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  checklistId!: string;

  @Prop({ required: true, index: true })
  auditId!: string;

  @Prop({ type: String, default: null })
  requirementId!: string | null;

  @Prop({ type: String, default: null })
  clauseId!: string | null;

  @Prop({ required: true, default: '' })
  clauseCode!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  prompt!: string;

  @Prop({
    required: true,
    enum: ['pending', 'conforming', 'nonconforming', 'observation'],
    default: 'pending',
  })
  status!: 'pending' | 'conforming' | 'nonconforming' | 'observation';

  @Prop({ type: [String], default: [] })
  evidenceIds!: string[];

  @Prop({ required: true, default: '' })
  notes!: string;

  @Prop({ required: true, default: 0 })
  order!: number;
}

export const AuditChecklistItemSchema =
  SchemaFactory.createForClass(AuditChecklistItemEntity);
AuditChecklistItemSchema.index({ tenantId: 1, checklistId: 1, order: 1 });
