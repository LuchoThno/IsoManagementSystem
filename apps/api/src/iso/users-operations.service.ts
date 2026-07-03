import { Injectable } from '@nestjs/common';
import { ClerkDirectoryService } from './clerk-directory.service';
import type { ClerkSessionIdentity, DirectoryUser } from './clerk.types';
import { PlatformAuditService } from './platform-audit.service';

@Injectable()
export class UsersOperationsService {
  constructor(
    private readonly clerkDirectoryService: ClerkDirectoryService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  async listDirectoryUsers(clerkAuth: ClerkSessionIdentity | null): Promise<DirectoryUser[]> {
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

  async listPlatformAuditLogs(
    clerkAuth: ClerkSessionIdentity | null,
    rawLimit?: string
  ) {
    const limit = this.resolveAuditLimit(rawLimit);
    const logs = await this.platformAuditService.listRecent(limit);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'platform.audit.list',
      resourceType: 'platform-audit-log',
      status: 'success',
      metadata: {
        limit,
        resultCount: logs.length,
      },
    });
    return logs;
  }

  private resolveAuditLimit(rawLimit?: string) {
    if (!rawLimit) {
      return 50;
    }

    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed)) {
      return 50;
    }

    return Math.max(1, Math.min(200, parsed));
  }
}
