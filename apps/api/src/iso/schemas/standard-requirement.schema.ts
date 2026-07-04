import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'standard_requirements' })
export class StandardRequirementEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  standardId!: string;

  @Prop({ type: String, default: null })
  sectionId!: string | null;

  @Prop({ required: true, index: true })
  clauseId!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  description!: string;

  @Prop({ required: true, default: '' })
  intent!: string;

  @Prop({ required: true, default: 0 })
  order!: number;

  @Prop({ required: true, enum: ['low', 'medium', 'high'], default: 'medium' })
  criticality!: 'low' | 'medium' | 'high';

  @Prop({ required: true, enum: ['draft', 'active', 'obsolete'], default: 'active' })
  status!: 'draft' | 'active' | 'obsolete';
}

export const StandardRequirementSchema =
  SchemaFactory.createForClass(StandardRequirementEntity);
StandardRequirementSchema.index({ tenantId: 1, standardId: 1, clauseId: 1, order: 1 });
