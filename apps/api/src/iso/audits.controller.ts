import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuditsOperationsService } from './audits-operations.service';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import type { CreateAuditDto, UpdateAuditDto, UpdateAuditStatusDto } from './dto/audits.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class AuditsController {
  constructor(private readonly auditsOperationsService: AuditsOperationsService) {}

  @Get('audits')
  getAudits() {
    return this.auditsOperationsService.listAudits();
  }

  @Get('audits/:id/checklist')
  getAuditChecklist(@Param('id') id: string) {
    return this.auditsOperationsService.getAuditChecklist(id);
  }

  @Post('audits')
  @Roles('admin', 'manager', 'auditor')
  async createAudit(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: CreateAuditDto
  ) {
    return this.auditsOperationsService.createAudit(clerkAuth, body);
  }

  @Patch('audits/:id')
  @Roles('admin', 'manager', 'auditor')
  async updateAudit(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateAuditDto
  ) {
    return this.auditsOperationsService.updateAudit(id, clerkAuth, body);
  }

  @Patch('audits/:id/status')
  @Roles('admin', 'manager', 'auditor')
  async updateAuditStatus(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: UpdateAuditStatusDto
  ) {
    return this.auditsOperationsService.updateAuditStatus(id, clerkAuth, body);
  }

  @Patch('audits/:id/delete')
  @Roles('admin', 'manager')
  async deleteAudit(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.auditsOperationsService.deleteAudit(id, clerkAuth);
  }
}
