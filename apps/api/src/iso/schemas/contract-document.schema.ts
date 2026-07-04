import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: false, collection: 'contract_documents' })
export class ContractDocumentEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  contractId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, enum: ['contract', 'annex', 'policy', 'evidence'], default: 'contract' })
  kind!: 'contract' | 'annex' | 'policy' | 'evidence';

  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true, default: Date.now })
  uploadedAt!: Date;
}

export const ContractDocumentSchema = SchemaFactory.createForClass(ContractDocumentEntity);
ContractDocumentSchema.index({ tenantId: 1, contractId: 1 });
