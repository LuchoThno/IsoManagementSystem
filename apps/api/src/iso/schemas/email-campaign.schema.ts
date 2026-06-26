import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'email_campaigns' })
export class EmailCampaignEntity {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  templateId!: string;

  @Prop({ required: true })
  templateName!: string;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: [String], default: [] })
  recipientIds!: string[];

  @Prop({ required: true, default: 0 })
  recipientCount!: number;

  @Prop({ type: [String], default: [] })
  taskIds!: string[];

  @Prop({ required: true, default: 0 })
  taskCount!: number;

  @Prop({ required: true, default: 0 })
  daysAhead!: number;

  @Prop({ required: true, enum: ['draft', 'sent'], default: 'sent' })
  status!: 'draft' | 'sent';

  @Prop({ type: Date, default: Date.now })
  sentAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const EmailCampaignSchema = SchemaFactory.createForClass(EmailCampaignEntity);
