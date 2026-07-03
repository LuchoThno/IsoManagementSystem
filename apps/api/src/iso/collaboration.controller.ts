import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { CollaborationOperationsService } from './collaboration-operations.service';
import type {
  MarkThreadAsReadDto,
  OpenDirectThreadDto,
  SendChatMessageDto,
} from './dto/collaboration.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class CollaborationController {
  constructor(
    private readonly collaborationOperationsService: CollaborationOperationsService
  ) {}

  @Get('calendar/status')
  getCalendarStatus() {
    return this.collaborationOperationsService.getCalendarStatus();
  }

  @Post('calendar/sync')
  @Roles('admin', 'manager')
  async syncCalendar(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    return this.collaborationOperationsService.syncCalendar(clerkAuth);
  }

  @Get('chat/threads/:userId')
  getChatThreads(
    @Param('userId') userId: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.collaborationOperationsService.getChatThreads(userId, clerkAuth);
  }

  @Post('chat/threads/direct')
  async openDirectThread(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: OpenDirectThreadDto
  ) {
    return this.collaborationOperationsService.openDirectThread(clerkAuth, body);
  }

  @Post('chat/threads/:id/messages')
  async sendChatMessage(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: SendChatMessageDto
  ) {
    return this.collaborationOperationsService.sendChatMessage(id, clerkAuth, body);
  }

  @Post('chat/threads/:id/read')
  async markThreadAsRead(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: MarkThreadAsReadDto
  ) {
    return this.collaborationOperationsService.markThreadAsRead(id, clerkAuth, body);
  }
}
