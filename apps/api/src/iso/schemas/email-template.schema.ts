import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'email_templates' })
export class EmailTemplateEntity {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  content!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplateEntity);
