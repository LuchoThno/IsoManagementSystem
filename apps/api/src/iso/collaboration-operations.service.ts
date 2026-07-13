import { Injectable } from '@nestjs/common';
import { AuthModeService } from './auth-mode.service';
import { ChatGateway } from './chat.gateway';
import type { ClerkSessionIdentity } from './clerk.types';
import { CollaborationDomainService } from './collaboration-domain.service';
import type {
  MarkThreadAsReadDto,
  OpenDirectThreadDto,
  SendChatMessageDto,
} from './dto/collaboration.dto';
import { GoogleCalendarService } from './google-calendar.service';
import { PlatformAuditService } from './platform-audit.service';
import { ensureNonEmptyString, ensureStringArray } from './request-validation';

@Injectable()
export class CollaborationOperationsService {
  constructor(
    private readonly collaborationDomainService: CollaborationDomainService,
    private readonly chatGateway: ChatGateway,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly authModeService: AuthModeService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  getCalendarStatus() {
    return this.googleCalendarService.getStatus();
  }

  async syncCalendar(clerkAuth: ClerkSessionIdentity | null) {
    const result = await this.googleCalendarService.syncEvents();
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'calendar.sync',
      resourceType: 'calendar-sync',
      status: 'success',
      metadata: result,
    });
    return result;
  }

  getChatThreads(userId: string, clerkAuth: ClerkSessionIdentity | null) {
    ensureNonEmptyString(userId, 'userId');
    return this.collaborationDomainService.getChatThreads(
      this.authModeService.isClerkMode() ? (clerkAuth?.appUserId ?? userId) : userId
    );
  }

  async openDirectThread(
    clerkAuth: ClerkSessionIdentity | null,
    body: OpenDirectThreadDto
  ) {
    ensureStringArray(body.participantIds, 'participantIds');

    const participantIds = this.authModeService.isClerkMode() && clerkAuth
      ? [
          clerkAuth.appUserId,
          ...body.participantIds.filter(
            (participantId) =>
              participantId !== clerkAuth.appUserId && participantId.startsWith('clerk-')
          ),
        ]
      : body.participantIds;

    const thread = await this.collaborationDomainService.openDirectThread(
      participantIds,
      body.title
    );
    this.chatGateway.emitThreadUpsert(thread);
    return thread;
  }

  async sendChatMessage(
    id: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: SendChatMessageDto
  ) {
    ensureNonEmptyString(id, 'id');
    ensureNonEmptyString(body.authorId, 'authorId');
    ensureNonEmptyString(body.content, 'content');

    const thread = await this.collaborationDomainService.sendChatMessage(
      id,
      this.authModeService.isClerkMode() ? (clerkAuth?.appUserId ?? body.authorId) : body.authorId,
      body.content
    );
    this.chatGateway.emitThreadUpsert(thread);
    return thread;
  }

  async markThreadAsRead(
    id: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: MarkThreadAsReadDto
  ) {
    ensureNonEmptyString(id, 'id');
    ensureNonEmptyString(body.userId, 'userId');

    const thread = await this.collaborationDomainService.markThreadAsRead(
      id,
      this.authModeService.isClerkMode() ? (clerkAuth?.appUserId ?? body.userId) : body.userId
    );
    this.chatGateway.emitThreadUpsert(thread);
    return thread;
  }
}
