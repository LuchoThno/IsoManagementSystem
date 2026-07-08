import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'tenants', timestamps: true })
export class TenantEntity {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active', index: true })
  status!: 'active' | 'inactive';

  @Prop({ required: true, default: 'America/Santiago' })
  timezone!: string;

  @Prop({ required: true, default: 'es' })
  defaultLanguage!: string;

  @Prop({ required: true, default: true, index: true })
  isDefault!: boolean;

  @Prop({ type: String, required: false, default: null, trim: true })
  organizationId!: string | null;
}

export const TenantSchema = SchemaFactory.createForClass(TenantEntity);
