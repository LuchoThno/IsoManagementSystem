import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'audit_checklists' })
export class AuditChecklistEntity {
  @Prop({ required: true, unique: true, index: true })
  auditId!: string;

  @Prop({ required: true })
  standardId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  summary!: string;

  @Prop({ required: true, default: 0 })
  progress!: number;

  @Prop({ required: true, default: 0 })
  itemCount!: number;
}

export const AuditChecklistSchema = SchemaFactory.createForClass(AuditChecklistEntity);
