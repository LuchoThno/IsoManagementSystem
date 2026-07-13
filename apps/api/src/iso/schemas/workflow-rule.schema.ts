import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { WORKFLOW_TRIGGER_VALUES } from '../domain.constants';

@Schema({ timestamps: true, collection: 'workflow_rules' })
export class WorkflowRuleEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: String, required: true, enum: WORKFLOW_TRIGGER_VALUES })
  triggerType!: (typeof WORKFLOW_TRIGGER_VALUES)[number];

  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ type: Number, default: 1440 })
  cooldownMinutes!: number;

  @Prop({ type: Object, default: {} })
  config!: Record<string, unknown>;

  @Prop({
    type: [
      raw({
        type: { type: String, required: true },
        enabled: { type: Boolean, required: true, default: true },
        config: { type: Object, default: {} },
      }),
    ],
    default: [],
  })
  actions!: Array<{
    type: string;
    enabled: boolean;
    config: Record<string, unknown>;
  }>;
}

export const WorkflowRuleSchema = SchemaFactory.createForClass(WorkflowRuleEntity);
WorkflowRuleSchema.index({ tenantId: 1, code: 1 }, { unique: true });
