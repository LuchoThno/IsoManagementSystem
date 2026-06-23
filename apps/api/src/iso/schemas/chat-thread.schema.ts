import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ChatMessageEntity {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  authorId!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: [String], default: [] })
  readBy!: string[];
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessageEntity);

@Schema({ timestamps: true, collection: 'chat_threads' })
export class ChatThreadEntity {
  @Prop({ type: [String], default: [] })
  participantIds!: string[];

  @Prop({ type: [ChatMessageSchema], default: [] })
  messages!: ChatMessageEntity[];

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const ChatThreadSchema = SchemaFactory.createForClass(ChatThreadEntity);
