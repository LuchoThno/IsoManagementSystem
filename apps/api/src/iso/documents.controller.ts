import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { DocumentsOperationsService } from './documents-operations.service';
import type { CreateDocumentDto, UpdateDocumentDto } from './dto/documents.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsOperationsService: DocumentsOperationsService) {}

  @Get('documents')
  getDocuments() {
    return this.documentsOperationsService.listDocuments();
  }

  @Get('documents/:id/content')
  getDocumentContent(@Param('id') id: string) {
    return this.documentsOperationsService.getDocumentContent(id);
  }

  @Post('documents')
  @Roles('admin', 'manager')
  async createDocument(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: CreateDocumentDto
  ) {
    return this.documentsOperationsService.createDocument(clerkAuth, body);
  }

  @Patch('documents/:id')
  @Roles('admin', 'manager')
  async updateDocument(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateDocumentDto
  ) {
    return this.documentsOperationsService.updateDocument(id, clerkAuth, body);
  }

  @Post('documents/:id/view')
  async registerDocumentView(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.documentsOperationsService.registerDocumentView(id, clerkAuth);
  }

  @Patch('documents/:id/delete')
  @Roles('admin', 'manager')
  async deleteDocument(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.documentsOperationsService.deleteDocument(id, clerkAuth);
  }
}
