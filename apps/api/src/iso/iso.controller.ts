import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ChatGateway } from './chat.gateway';
import { ClerkDirectoryService } from './clerk-directory.service';
import { GoogleCalendarService } from './google-calendar.service';
import { IsoService } from './iso.service';
import type { ClerkSessionIdentity } from './clerk.types';
import { Public } from './public.decorator';

@Controller('iso')
@UseGuards(ClerkAuthGuard)
export class IsoController {
  constructor(
    private readonly isoService: IsoService,
    private readonly chatGateway: ChatGateway,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly clerkDirectoryService: ClerkDirectoryService
  ) {}

  @Get('documents')
  getDocuments() {
    return this.isoService.getDocuments();
  }

  @Get('tasks')
  getTasks() {
    return this.isoService.getTasks();
  }

  @Get('audits')
  getAudits() {
    return this.isoService.getAudits();
  }

  @Get('bootstrap')
  @Public()
  getBootstrap() {
    return this.isoService.getBootstrap();
  }

  @Get('calendar/status')
  getCalendarStatus() {
    return this.googleCalendarService.getStatus();
  }

  @Get('users/clerk')
  getClerkUsers() {
    return this.clerkDirectoryService.listUsers();
  }

  @Get('auth/clerk/me')
  getCurrentClerkUser(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    if (!clerkAuth) {
      return null;
    }

    return this.clerkDirectoryService.getCurrentUser(clerkAuth.userId);
  }

  @Post('calendar/sync')
  syncCalendar() {
    return this.googleCalendarService.syncEvents();
  }

  @Get('chat/threads/:userId')
  getChatThreads(
    @Param('userId') userId: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.isoService.getChatThreads(clerkAuth?.appUserId ?? userId);
  }

  @Post('chat/threads/direct')
  async openDirectThread(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: {
      participantIds: string[];
    }
  ) {
    const participantIds = clerkAuth
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
    body: {
      authorId: string;
      content: string;
    }
  ) {
    const thread = await this.isoService.sendChatMessage(
      id,
      clerkAuth?.appUserId ?? body.authorId,
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
    body: {
      userId: string;
    }
  ) {
    const thread = await this.isoService.markThreadAsRead(
      id,
      clerkAuth?.appUserId ?? body.userId
    );
    this.chatGateway.emitThreadUpsert(thread);
    return thread;
  }

  @Post('documents')
  createDocument(
    @Body()
    body: {
      title: string;
      topic: string;
      type: 'manual' | 'procedure' | 'record';
      format: 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'TXT' | 'PNG' | 'JPG' | 'WEBP' | 'GIF';
      standard: 'ISO9001' | 'ISO14001' | 'ISO45001';
      version: string;
      fileName: string;
      mimeType: string;
      fileContentUrl: string;
    }
  ) {
    return this.isoService.createDocument(body);
  }

  @Patch('documents/:id')
  updateDocument(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      topic?: string;
      format?: 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'TXT' | 'PNG' | 'JPG' | 'WEBP' | 'GIF';
      version?: string;
      status?: 'draft' | 'active' | 'archived';
    }
  ) {
    return this.isoService.updateDocument(id, body);
  }

  @Post('documents/:id/view')
  registerDocumentView(@Param('id') id: string) {
    return this.isoService.registerDocumentView(id);
  }

  @Patch('documents/:id/delete')
  deleteDocument(@Param('id') id: string) {
    return this.isoService.deleteDocument(id);
  }

  @Post('tasks')
  createTask(
    @Body()
    body: {
      title: string;
      description: string;
      assignedTo: string;
      dueDate: string;
      status: 'pending' | 'in-progress' | 'completed' | 'overdue';
      priority: 'low' | 'medium' | 'high';
      standard: 'ISO9001' | 'ISO14001' | 'ISO45001';
      relatedDocuments: string[];
    }
  ) {
    return this.isoService.createTask(body);
  }

  @Patch('tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      assignedTo?: string;
      dueDate?: string;
      status?: 'pending' | 'in-progress' | 'completed' | 'overdue';
      priority?: 'low' | 'medium' | 'high';
      standard?: 'ISO9001' | 'ISO14001' | 'ISO45001';
      relatedDocuments?: string[];
    }
  ) {
    return this.isoService.updateTask(id, body);
  }

  @Patch('tasks/:id/status')
  updateTaskStatus(
    @Param('id') id: string,
    @Body() body: { status: 'pending' | 'in-progress' | 'completed' | 'overdue' }
  ) {
    return this.isoService.updateTaskStatus(id, body.status);
  }

  @Patch('tasks/:id/delete')
  deleteTask(@Param('id') id: string) {
    return this.isoService.deleteTask(id);
  }

  @Post('audits')
  createAudit(
    @Body()
    body: {
      type: 'internal' | 'external';
      standard: 'ISO9001' | 'ISO14001' | 'ISO45001';
      date: string;
      status: 'planned' | 'in-progress' | 'completed';
      findings: Array<{
        id: string;
        type: 'nonconformity' | 'observation' | 'opportunity';
        description: string;
        status: 'open' | 'in-progress' | 'closed';
        dueDate: string;
        assignedTo: string;
      }>;
    }
  ) {
    return this.isoService.createAudit(body);
  }

  @Patch('audits/:id')
  updateAudit(
    @Param('id') id: string,
    @Body()
    body: {
      type?: 'internal' | 'external';
      standard?: 'ISO9001' | 'ISO14001' | 'ISO45001';
      date?: string;
      status?: 'planned' | 'in-progress' | 'completed';
      findings?: Array<{
        id: string;
        type: 'nonconformity' | 'observation' | 'opportunity';
        description: string;
        status: 'open' | 'in-progress' | 'closed';
        dueDate: string;
        assignedTo: string;
      }>;
    }
  ) {
    return this.isoService.updateAudit(id, body);
  }

  @Patch('audits/:id/status')
  updateAuditStatus(
    @Param('id') id: string,
    @Body() body: { status: 'planned' | 'in-progress' | 'completed' }
  ) {
    return this.isoService.updateAuditStatus(id, body.status);
  }

  @Patch('audits/:id/delete')
  deleteAudit(@Param('id') id: string) {
    return this.isoService.deleteAudit(id);
  }

  @Put('settings')
  updateSettings(
    @Body()
    body: {
      settings: {
        companyName: string;
        standards: {
          ISO9001: boolean;
          ISO14001: boolean;
          ISO45001: boolean;
        };
        defaultLanguage: string;
        timezone: string;
      };
      notifications: {
        email: {
          enabled: boolean;
          taskReminders: boolean;
          auditReminders: boolean;
          documentUpdates: boolean;
        };
        inApp: {
          enabled: boolean;
          taskReminders: boolean;
          auditReminders: boolean;
          documentUpdates: boolean;
        };
      };
    }
  ) {
    return this.isoService.updateSettings(body.settings, body.notifications);
  }

  @Put('communications/settings')
  updateCommunicationSettings(
    @Body()
    body: {
      enabled: boolean;
      providerName: string;
      senderName: string;
      senderEmail: string;
      replyTo: string;
      apiBaseUrl: string;
      apiKeyHint: string;
    }
  ) {
    return this.isoService.updateCommunicationSettings(body);
  }

  @Post('communications/templates')
  createEmailTemplate(
    @Body()
    body: {
      name: string;
      subject: string;
      content: string;
    }
  ) {
    return this.isoService.createEmailTemplate(body);
  }

  @Patch('communications/templates/:id')
  updateEmailTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      subject?: string;
      content?: string;
    }
  ) {
    return this.isoService.updateEmailTemplate(id, body);
  }

  @Patch('communications/templates/:id/delete')
  deleteEmailTemplate(@Param('id') id: string) {
    return this.isoService.deleteEmailTemplate(id);
  }

  @Post('communications/campaigns/send')
  sendBulkTaskReminderCampaign(
    @Body()
    body: {
      name: string;
      templateId: string;
      daysAhead: number;
      recipientIds: string[];
      recipientNames: string[];
    }
  ) {
    return this.isoService.sendBulkTaskReminderCampaign(body);
  }
}
