import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';
import { UsersOperationsService } from './users-operations.service';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersOperationsService: UsersOperationsService) {}

  @Get('users/clerk')
  @Roles('admin', 'manager')
  async getClerkUsers(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    return this.usersOperationsService.listDirectoryUsers(clerkAuth);
  }

  @Get('platform/audit-logs')
  @Roles('admin')
  async getPlatformAuditLogs(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Query('limit') limit?: string
  ) {
    return this.usersOperationsService.listPlatformAuditLogs(clerkAuth, limit);
  }
}
