import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'standard_clauses' })
export class StandardClauseEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  standardId!: string;

  @Prop({ required: true, index: true })
  sectionId!: string;

  @Prop({ type: String, default: null })
  parentClauseId!: string | null;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  description!: string;

  @Prop({ required: true, default: 0 })
  order!: number;
}

export const StandardClauseSchema = SchemaFactory.createForClass(StandardClauseEntity);
StandardClauseSchema.index({ tenantId: 1, standardId: 1, sectionId: 1, order: 1 });
