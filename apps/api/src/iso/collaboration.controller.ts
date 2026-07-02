import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthModeService } from './auth-mode.service';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ChatGateway } from './chat.gateway';
import { GoogleCalendarService } from './google-calendar.service';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import type {
  MarkThreadAsReadDto,
  OpenDirectThreadDto,
  SendChatMessageDto,
} from './dto/collaboration.dto';
import { ensureNonEmptyString, ensureStringArray } from './request-validation';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class CollaborationController {
  constructor(
    private readonly isoService: IsoService,
    private readonly chatGateway: ChatGateway,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly authModeService: AuthModeService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  @Get('calendar/status')
  getCalendarStatus() {
    return this.googleCalendarService.getStatus();
  }

  @Post('calendar/sync')
  @Roles('admin', 'manager')
  async syncCalendar(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    const result = await this.googleCalendarService.syncEvents();
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'calendar.sync',
      resourceType: 'calendar-sync',
      status: 'success',
      metadata: result,
    });
    return result;
  }

  @Get('chat/threads/:userId')
  getChatThreads(
    @Param('userId') userId: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    ensureNonEmptyString(userId, 'userId');
    return this.isoService.getChatThreads(
      this.authModeService.isClerkMode() ? (clerkAuth?.appUserId ?? userId) : userId
    );
  }

  @Post('chat/threads/direct')
  async openDirectThread(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
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

    const thread = await this.isoService.openDirectThread(participantIds);
    this.chatGateway.emitThreadUpsert(thread);
    return thread;
  }

  @Post('chat/threads/:id/messages')
  async sendChatMessage(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: SendChatMessageDto
  ) {
    ensureNonEmptyString(id, 'id');
    ensureNonEmptyString(body.authorId, 'authorId');
    ensureNonEmptyString(body.content, 'content');

    const thread = await this.isoService.sendChatMessage(
      id,
      this.authModeService.isClerkMode() ? (clerkAuth?.appUserId ?? body.authorId) : body.authorId,
      body.content
    );
    this.chatGateway.emitThreadUpsert(thread);
    return thread;
  }

  @Post('chat/threads/:id/read')
  async markThreadAsRead(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: MarkThreadAsReadDto
  ) {
    ensureNonEmptyString(id, 'id');
    ensureNonEmptyString(body.userId, 'userId');

    const thread = await this.isoService.markThreadAsRead(
      id,
      this.authModeService.isClerkMode() ? (clerkAuth?.appUserId ?? body.userId) : body.userId
    );
    this.chatGateway.emitThreadUpsert(thread);
    return thread;
  }
}
