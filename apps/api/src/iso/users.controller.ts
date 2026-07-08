import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';
import type { CreateManagedUserDto, UpdateManagedUserDto } from './dto/users.dto';
import { UsersOperationsService } from './users-operations.service';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersOperationsService: UsersOperationsService) {}

  @Get('users')
  @Roles('admin', 'manager')
  async listUsers(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    return this.usersOperationsService.listDirectoryUsers(clerkAuth);
  }

  @Get('users/clerk')
  @Roles('admin', 'manager')
  async getClerkUsers(@ClerkAuth() clerkAuth: ClerkSessionIdentity | null) {
    return this.usersOperationsService.listDirectoryUsers(clerkAuth);
  }

  @Post('users')
  @Roles('admin')
  async createUser(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: CreateManagedUserDto
  ) {
    return this.usersOperationsService.createManagedUser(clerkAuth, body);
  }

  @Patch('users/:id')
  @Roles('admin')
  async updateUser(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: UpdateManagedUserDto
  ) {
    return this.usersOperationsService.updateManagedUser(id, clerkAuth, body);
  }

  @Patch('users/:id/delete')
  @Roles('admin')
  async deleteUser(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.usersOperationsService.deleteManagedUser(id, clerkAuth);
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
