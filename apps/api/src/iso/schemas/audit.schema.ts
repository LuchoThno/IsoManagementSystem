import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Finding {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true, enum: ['nonconformity', 'observation', 'opportunity'] })
  type!: 'nonconformity' | 'observation' | 'opportunity';

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, enum: ['open', 'in-progress', 'closed'] })
  status!: 'open' | 'in-progress' | 'closed';

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({ required: true })
  assignedTo!: string;
}

@Schema({ timestamps: true, collection: 'audits' })
export class Audit {
  @Prop({ required: true, enum: ['internal', 'external'] })
  type!: 'internal' | 'external';

  @Prop({ required: true, enum: ['ISO9001', 'ISO14001', 'ISO45001'] })
  standard!: 'ISO9001' | 'ISO14001' | 'ISO45001';

  @Prop({ required: true })
  date!: Date;

  @Prop({ required: true, enum: ['planned', 'in-progress', 'completed'], default: 'planned' })
  status!: 'planned' | 'in-progress' | 'completed';

  @Prop({
    type: [
      raw({
        id: { type: String, required: true },
        type: {
          type: String,
          enum: ['nonconformity', 'observation', 'opportunity'],
          required: true,
        },
        description: { type: String, required: true },
        status: {
          type: String,
          enum: ['open', 'in-progress', 'closed'],
          required: true,
        },
        dueDate: { type: Date, required: true },
        assignedTo: { type: String, required: true },
      }),
    ],
    default: [],
  })
  findings!: Finding[];
}

export const AuditSchema = SchemaFactory.createForClass(Audit);
