import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'standard_appendices' })
export class StandardAppendixEntity {
  @Prop({ required: true, index: true })
  standardId!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, enum: ['annex', 'appendix', 'guide'], default: 'annex' })
  type!: 'annex' | 'appendix' | 'guide';

  @Prop({ required: true, default: '' })
  description!: string;

  @Prop({ required: true, default: '' })
  content!: string;

  @Prop({ required: true, default: 0 })
  order!: number;
}

export const StandardAppendixSchema = SchemaFactory.createForClass(StandardAppendixEntity);
