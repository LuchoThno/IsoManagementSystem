import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'standard_sections' })
export class StandardSectionEntity {
  @Prop({ required: true, index: true })
  standardId!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  description!: string;

  @Prop({ required: true, default: 0 })
  order!: number;
}

export const StandardSectionSchema = SchemaFactory.createForClass(StandardSectionEntity);
