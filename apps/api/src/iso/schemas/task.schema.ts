import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'tasks' })
export class TaskEntity {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  assignedTo!: string;

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({
    required: true,
    enum: ['pending', 'in-progress', 'completed', 'overdue'],
    default: 'pending',
  })
  status!: 'pending' | 'in-progress' | 'completed' | 'overdue';

  @Prop({ required: true, enum: ['low', 'medium', 'high'], default: 'medium' })
  priority!: 'low' | 'medium' | 'high';

  @Prop({ required: true })
  standard!: string;

  @Prop({ type: [String], default: [] })
  relatedDocuments!: string[];
}

export const TaskSchema = SchemaFactory.createForClass(TaskEntity);
