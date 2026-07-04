import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'standards' })
export class StandardEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, trim: true })
  code!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, default: '' })
  description!: string;

  @Prop({
    required: true,
    enum: ['standard', 'framework', 'regulation', 'contractual'],
    default: 'standard',
  })
  category!: 'standard' | 'framework' | 'regulation' | 'contractual';

  @Prop({ required: true, enum: ['draft', 'active', 'archived'], default: 'active' })
  status!: 'draft' | 'active' | 'archived';

  @Prop({ required: true, default: '1.0' })
  version!: string;

  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ required: true, default: 'Administrador ISO' })
  owner!: string;

  @Prop({ type: Date, default: null })
  publishedAt?: Date | null;
}

export const StandardSchema = SchemaFactory.createForClass(StandardEntity);
StandardSchema.index({ tenantId: 1, code: 1 }, { unique: true });
