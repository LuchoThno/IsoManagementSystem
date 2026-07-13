import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { WORKFLOW_EXECUTION_STATUS_VALUES, WORKFLOW_TRIGGER_VALUES } from '../domain.constants';

@Schema({ timestamps: true, collection: 'workflow_executions' })
export class WorkflowExecutionEntity {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, index: true })
  ruleId!: string;

  @Prop({ required: true, enum: WORKFLOW_TRIGGER_VALUES })
  triggerType!: (typeof WORKFLOW_TRIGGER_VALUES)[number];

  @Prop({ required: true })
  resourceType!: string;

  @Prop({ required: true })
  resourceId!: string;

  @Prop({ required: true, enum: WORKFLOW_EXECUTION_STATUS_VALUES })
  status!: (typeof WORKFLOW_EXECUTION_STATUS_VALUES)[number];

  @Prop({ required: true })
  startedAt!: Date;

  @Prop({ type: Date, default: null })
  finishedAt!: Date | null;

  @Prop({ type: String, default: '' })
  summary!: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: String, default: null })
  errorMessage!: string | null;
}

export const WorkflowExecutionSchema =
  SchemaFactory.createForClass(WorkflowExecutionEntity);
WorkflowExecutionSchema.index({ tenantId: 1, triggerType: 1, startedAt: -1 });
WorkflowExecutionSchema.index({ tenantId: 1, ruleId: 1, resourceId: 1, startedAt: -1 });
