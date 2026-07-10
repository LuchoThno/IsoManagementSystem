import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import type {
  CreateContractDto,
  CreateCorrectiveActionDto,
  CreateEvidenceDto,
  PaginationParams,
  StandardPayload,
  UploadEvidenceDocumentDto,
  UpdateEvidenceDto,
} from './dto/grc.dto';
import { GrcOperationsService } from './grc-operations.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class GrcController {
  constructor(private readonly grcOperationsService: GrcOperationsService) {}

  @Get('standards')
  getStandards() {
    return this.grcOperationsService.listStandards();
  }

  @Post('standards')
  @Roles('admin', 'manager')
  async createStandard(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: StandardPayload
  ) {
    return this.grcOperationsService.createStandard(clerkAuth, body);
  }

  @Put('standards/:id')
  @Roles('admin', 'manager')
  async updateStandard(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: StandardPayload
  ) {
    return this.grcOperationsService.updateStandard(id, clerkAuth, body);
  }

  @Delete('standards/:id')
  @Roles('admin')
  async deleteStandard(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.grcOperationsService.deleteStandard(id, clerkAuth);
  }

  @Get('standards/:id/structure')
  getStandardStructure(@Param('id') id: string) {
    return this.grcOperationsService.getStandardStructure(id);
  }

  @Get('requirements/:id/evidences')
  getRequirementEvidences(@Param('id') id: string) {
    return this.grcOperationsService.getRequirementEvidences(id);
  }

  @Get('evidences')
  getEvidences(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('auditId') auditId?: string,
    @Query('findingId') findingId?: string,
    @Query('status') status?: string
  ) {
    const params: PaginationParams = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      auditId,
      findingId,
      status,
    };
    return this.grcOperationsService.getEvidences(params);
  }

  @Post('evidences')
  @Roles('admin', 'manager', 'auditor')
  async createEvidence(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: CreateEvidenceDto
  ) {
    return this.grcOperationsService.createEvidence(clerkAuth, body);
  }

  @Put('evidences/:id')
  @Roles('admin', 'manager', 'auditor')
  async updateEvidence(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: UpdateEvidenceDto
  ) {
    return this.grcOperationsService.updateEvidence(id, clerkAuth, body);
  }

  @Delete('evidences/:id')
  @Roles('admin', 'manager')
  async deleteEvidence(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.grcOperationsService.deleteEvidence(id, clerkAuth);
  }

  @Post('evidences/:id/export')
  async exportEvidenceBundle(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.grcOperationsService.createEvidenceExportBundle(id, clerkAuth);
  }

  @Post('evidences/:id/documents')
  @Roles('admin', 'manager', 'auditor')
  async uploadEvidenceDocument(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: UploadEvidenceDocumentDto
  ) {
    return this.grcOperationsService.uploadEvidenceDocument(id, clerkAuth, body);
  }

  @Get('contracts')
  getContracts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string
  ) {
    const params: PaginationParams = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
    };
    return this.grcOperationsService.getContracts(params);
  }

  @Post('contracts')
  @Roles('admin', 'manager')
  async createContract(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: CreateContractDto
  ) {
    return this.grcOperationsService.createContract(clerkAuth, body);
  }

  @Get('contracts/:id/obligations')
  getContractObligations(@Param('id') id: string) {
    return this.grcOperationsService.getContractObligations(id);
  }

  @Get('corrective-actions')
  getCorrectiveActions() {
    return this.grcOperationsService.getCorrectiveActions();
  }

  @Post('corrective-actions')
  @Roles('admin', 'manager', 'auditor')
  async createCorrectiveAction(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: CreateCorrectiveActionDto
  ) {
    return this.grcOperationsService.createCorrectiveAction(clerkAuth, body);
  }

  @Get('grc/summary')
  getGrcSummary() {
    return this.grcOperationsService.getGrcSummary();
  }

  @Get('audits/:id/execution-report')
  getAuditExecutionReport(@Param('id') id: string) {
    return this.grcOperationsService.getAuditExecutionReport(id);
  }

  @Post('audits/:id/export')
  async exportAuditBundle(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.grcOperationsService.createAuditExportBundle(id, clerkAuth);
  }
}
