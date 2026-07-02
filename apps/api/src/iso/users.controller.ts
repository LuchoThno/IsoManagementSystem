import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ClerkDirectoryService } from './clerk-directory.service';
import { PlatformAuditService } from './platform-audit.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly clerkDirectoryService: ClerkDirectoryService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  @Get('users/clerk')
  @Roles('admin', 'manager')
  async getClerkUsers(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    const users = await this.clerkDirectoryService.listUsers();
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'users.directory.list',
      resourceType: 'user-directory',
      status: 'success',
      metadata: {
        count: users.length,
      },
    });
    return users;
  }

  @Get('platform/audit-logs')
  @Roles('admin')
  async getPlatformAuditLogs(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Query('limit') limit?: string
  ) {
    const logs = await this.platformAuditService.listRecent(limit ? Number(limit) : undefined);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'platform.audit.list',
      resourceType: 'platform-audit-log',
      status: 'success',
      metadata: {
        limit: limit ? Number(limit) : 50,
        resultCount: logs.length,
      },
    });
    return logs;
  }
}
