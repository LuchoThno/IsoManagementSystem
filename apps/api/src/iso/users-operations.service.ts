import { BadRequestException, Injectable } from '@nestjs/common';
import { ClerkDirectoryService } from './clerk-directory.service';
import type { ClerkSessionIdentity, DirectoryUser } from './clerk.types';
import type {
  CreateManagedUserDto,
  ManagedUserDto,
  UpdateManagedUserDto,
} from './dto/users.dto';
import { PlatformAuditService } from './platform-audit.service';
import {
  ensureBoolean,
  ensureEmailString,
  ensureEnumValue,
  ensureIntegerInRange,
  ensureNonEmptyString,
  ensureObject,
  ensureOptionalBoolean,
  ensureOptionalEmailString,
  ensureOptionalEnumValue,
  ensureOptionalString,
} from './request-validation';
import type { AppUserRole } from './roles.decorator';

const APP_USER_ROLE_VALUES: AppUserRole[] = ['admin', 'manager', 'auditor', 'viewer'];

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

  async createManagedUser(
    clerkAuth: ClerkSessionIdentity | null,
    body: CreateManagedUserDto
  ): Promise<ManagedUserDto> {
    ensureObject(body, 'body');
    ensureNonEmptyString(body.name, 'name');
    ensureEmailString(body.email, 'email');
    ensureEnumValue(body.role, 'role', APP_USER_ROLE_VALUES);
    ensureNonEmptyString(body.password, 'password');
    if (String(body.password).trim().length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    }
    ensureBoolean(body.active, 'active');

    const user = await this.clerkDirectoryService.createManagedUser(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'users.create',
      resourceType: 'user',
      resourceId: user.id,
      status: 'success',
      metadata: {
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
    return user;
  }

  async updateManagedUser(
    userId: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: UpdateManagedUserDto
  ): Promise<ManagedUserDto> {
    ensureNonEmptyString(userId, 'id');
    ensureObject(body, 'body');
    ensureOptionalString(body.name, 'name');
    ensureOptionalEmailString(body.email, 'email');
    ensureOptionalEnumValue(body.role, 'role', APP_USER_ROLE_VALUES);
    ensureOptionalString(body.password, 'password');
    if (body.password !== undefined && body.password.trim().length > 0 && body.password.trim().length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    }
    ensureOptionalBoolean(body.active, 'active');
    if (body.active === false && clerkAuth?.appUserId === userId) {
      throw new BadRequestException('No puedes desactivar el usuario con sesión activa.');
    }

    const user = await this.clerkDirectoryService.updateManagedUser(userId, body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'users.update',
      resourceType: 'user',
      resourceId: userId,
      status: 'success',
      metadata: {
        email: body.email ?? null,
        role: body.role ?? null,
        active: body.active ?? null,
      },
    });
    return user;
  }

  async deleteManagedUser(userId: string, clerkAuth: ClerkSessionIdentity | null) {
    ensureNonEmptyString(userId, 'id');
    if (clerkAuth?.appUserId === userId) {
      throw new BadRequestException('No puedes eliminar el usuario con sesión activa.');
    }
    const result = await this.clerkDirectoryService.deleteManagedUser(userId);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'users.delete',
      resourceType: 'user',
      resourceId: userId,
      status: 'success',
    });
    return result;
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
    ensureIntegerInRange(parsed, 'limit', { min: 1, max: 200 });
    return parsed;
  }
}
