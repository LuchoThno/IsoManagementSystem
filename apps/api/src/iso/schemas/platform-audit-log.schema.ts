import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'platform_audit_logs' })
export class PlatformAuditLogEntity {
  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  resourceType!: string;

  @Prop({ type: String, default: null })
  resourceId!: string | null;

  @Prop({ default: null })
  actorId!: string | null;

  @Prop({ default: null })
  actorEmail!: string | null;

  @Prop({ default: null })
  actorRole!: string | null;

  @Prop({ required: true, enum: ['success', 'failure'] })
  status!: 'success' | 'failure';

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ default: null })
  errorMessage!: string | null;
}

export const PlatformAuditLogSchema = SchemaFactory.createForClass(PlatformAuditLogEntity);
