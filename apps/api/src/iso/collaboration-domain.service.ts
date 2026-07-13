import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatThreadEntity } from './schemas/chat-thread.schema';
import { TenantBackfillService } from './tenant-backfill.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class CollaborationDomainService {
  constructor(
    @InjectModel(ChatThreadEntity.name)
    private readonly chatThreadModel: Model<ChatThreadEntity>,
    private readonly tenantBackfillService: TenantBackfillService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async getChatThreads(userId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillChatTenantIds(tenantId);
    const threads = await this.chatThreadModel
      .find({ participantIds: userId, tenantId })
      .sort({ updatedAt: -1 })
      .lean();

    return threads.map((thread) => this.serializeChatThread(thread));
  }

  async openDirectThread(participantIds: string[], title?: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillChatTenantIds(tenantId);
    const uniqueParticipants = Array.from(
      new Set(participantIds.map((participantId) => participantId.trim()).filter(Boolean))
    ).sort();
    const normalizedTitle = title?.trim() || null;
    const threadType = uniqueParticipants.length > 2 || normalizedTitle ? 'group' : 'direct';

    if (uniqueParticipants.length < 2) {
      throw new BadRequestException('At least two participants are required');
    }

    const existingThreads = await this.chatThreadModel
      .find({
        tenantId,
        participantIds: { $all: uniqueParticipants },
      })
      .lean();

    const existing = existingThreads.find((thread) => {
      const currentParticipants = [...(thread.participantIds ?? [])].sort();
      const currentTitle = thread.title?.trim() || null;
      return (
        currentParticipants.length === uniqueParticipants.length &&
        currentTitle === normalizedTitle &&
        currentParticipants.every(
          (participantId, index) => participantId === uniqueParticipants[index]
        )
      );
    });

    if (existing) {
      return this.serializeChatThread(existing);
    }

    const thread = await this.chatThreadModel.create({
      tenantId,
      threadType,
      title: normalizedTitle,
      participantIds: uniqueParticipants,
      messages: [],
      updatedAt: new Date(),
    });

    return this.serializeChatThread(thread.toObject());
  }

  async sendChatMessage(threadId: string, authorId: string, content: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillChatTenantIds(tenantId);
    const thread = await this.chatThreadModel.findOne({ _id: threadId, tenantId });

    if (!thread) {
      throw new NotFoundException('Conversation not found');
    }

    this.assertThreadParticipant(thread.participantIds, authorId);

    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException('Message content is required');
    }

    const nextMessage = {
      id: this.makeId('msg'),
      authorId,
      content: normalizedContent,
      createdAt: new Date(),
      readBy: [authorId],
    };

    thread.messages = [...(thread.messages ?? []), nextMessage];
    thread.updatedAt = nextMessage.createdAt;
    await thread.save();

    return this.serializeChatThread(thread.toObject());
  }

  async markThreadAsRead(threadId: string, userId: string) {
    const tenantId = await this.resolveEffectiveTenantId();
    await this.backfillChatTenantIds(tenantId);
    const thread = await this.chatThreadModel.findOne({ _id: threadId, tenantId });

    if (!thread) {
      throw new NotFoundException('Conversation not found');
    }

    this.assertThreadParticipant(thread.participantIds, userId);

    thread.messages = (thread.messages ?? []).map((message) => ({
      ...message,
      readBy: message.readBy.includes(userId)
        ? message.readBy
        : [...message.readBy, userId],
    }));

    await thread.save();
    return this.serializeChatThread(thread.toObject());
  }

  private assertThreadParticipant(participantIds: string[] | undefined, userId: string) {
    if (!(participantIds ?? []).includes(userId)) {
      throw new ForbiddenException('You are not allowed to access this conversation');
    }
  }

  private async resolveEffectiveTenantId() {
    return this.tenantContextService.resolveEffectiveTenantId();
  }

  private async backfillChatTenantIds(tenantId: string) {
    await this.tenantBackfillService.ensureTenantId(this.chatThreadModel, tenantId);
  }

  private serializeChatThread(thread: any) {
    return {
      id: String(thread._id),
      tenantId: thread.tenantId ?? null,
      threadType: thread.threadType ?? 'direct',
      title: thread.title ?? null,
      participantIds: thread.participantIds ?? [],
      updatedAt: thread.updatedAt,
      messages: (thread.messages ?? []).map((message: any) => ({
        id: message.id,
        authorId: message.authorId,
        content: message.content,
        createdAt: message.createdAt,
        readBy: message.readBy ?? [],
      })),
    };
  }

  private makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
