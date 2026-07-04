import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'contracts' })
export class ContractEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  counterparty!: string;

  @Prop({ required: true })
  identifier!: string;

  @Prop({ required: true, enum: ['draft', 'active', 'expired', 'closed'], default: 'draft' })
  status!: 'draft' | 'active' | 'expired' | 'closed';

  @Prop({ type: Date, default: null })
  startDate!: Date | null;

  @Prop({ type: Date, default: null })
  endDate!: Date | null;

  @Prop({ type: [String], default: [] })
  standardIds!: string[];

  @Prop({ required: true, default: 'Administrador ISO' })
  owner!: string;

  @Prop({ required: true, default: '' })
  summary!: string;
}

export const ContractSchema = SchemaFactory.createForClass(ContractEntity);
ContractSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });
