import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { IsoService } from './iso.service';

@Controller('iso')
export class IsoController {
  constructor(
    private readonly isoService: IsoService,
    private readonly chatGateway: ChatGateway
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
  getBootstrap() {
    return this.isoService.getBootstrap();
  }

  @Get('chat/threads/:userId')
  getChatThreads(@Param('userId') userId: string) {
    return this.isoService.getChatThreads(userId);
  }

  @Post('chat/threads/direct')
  async openDirectThread(
    @Body()
    body: {
      participantIds: string[];
    }
  ) {
    const thread = await this.isoService.openDirectThread(body.participantIds);
    this.chatGateway.emitThreadUpsert(thread);
    return thread;
  }

  @Post('chat/threads/:id/messages')
  async sendChatMessage(
    @Param('id') id: string,
    @Body()
    body: {
      authorId: string;
      content: string;
    }
  ) {
    const thread = await this.isoService.sendChatMessage(id, body.authorId, body.content);
    this.chatGateway.emitThreadUpsert(thread);
    return thread;
  }

  @Post('chat/threads/:id/read')
  async markThreadAsRead(
    @Param('id') id: string,
    @Body()
    body: {
      userId: string;
    }
  ) {
    const thread = await this.isoService.markThreadAsRead(id, body.userId);
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
}
