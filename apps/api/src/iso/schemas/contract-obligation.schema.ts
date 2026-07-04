import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'contract_obligations' })
export class ContractObligationEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  contractId!: string;

  @Prop({ type: String, default: null })
  standardId!: string | null;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, default: '' })
  description!: string;

  @Prop({ required: true, default: '' })
  sourceClause!: string;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;

  @Prop({ required: true, enum: ['open', 'in-progress', 'fulfilled', 'overdue'], default: 'open' })
  status!: 'open' | 'in-progress' | 'fulfilled' | 'overdue';

  @Prop({ required: true, enum: ['low', 'medium', 'high'], default: 'medium' })
  priority!: 'low' | 'medium' | 'high';

  @Prop({ required: true, default: 'Administrador ISO' })
  owner!: string;

  @Prop({ type: [String], default: [] })
  evidenceIds!: string[];
}

export const ContractObligationSchema =
  SchemaFactory.createForClass(ContractObligationEntity);
ContractObligationSchema.index({ tenantId: 1, contractId: 1, dueDate: 1 });
