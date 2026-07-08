import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthModeService } from './auth-mode.service';
import { ClerkAuthService } from './clerk-auth.service';
import type { DirectoryUser } from './clerk.types';
import type { CreateManagedUserDto, ManagedUserDto, UpdateManagedUserDto } from './dto/users.dto';
import type { AppUserRole } from './roles.decorator';
import { AppUserEntity } from './schemas/app-user.schema';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class ClerkDirectoryService {
  private readonly logger = new Logger(ClerkDirectoryService.name);

  constructor(
    @InjectModel(AppUserEntity.name)
    private readonly appUserModel: Model<AppUserEntity>,
    private readonly authModeService: AuthModeService,
    private readonly clerkAuthService: ClerkAuthService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async listUsers(): Promise<DirectoryUser[]> {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();
    const profiles = await this.listTenantProfiles(tenantId);

    if (!this.authModeService.isClerkMode()) {
      return profiles.map((profile) => this.serializeProfile(profile));
    }

    const users = await this.clerkAuthService.getClerkUsers(100);
    return (users?.data ?? [])
      .map((user) => this.toDirectoryUser(user, profiles))
      .filter((user): user is DirectoryUser => Boolean(user));
  }

  async getCurrentUser(userId: string): Promise<DirectoryUser> {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();
    const profiles = await this.listTenantProfiles(tenantId);

    if (!this.authModeService.isClerkMode()) {
      const profile = profiles.find((item) => item.externalId === userId || String((item as any)._id) === userId);
      if (!profile) {
        throw new NotFoundException('No fue posible resolver el usuario solicitado.');
      }

      return this.serializeProfile(profile);
    }

    const user = await this.clerkAuthService.getClerkUser(userId);
    const directoryUser = this.toDirectoryUser(user, profiles);

    if (!directoryUser) {
      throw new BadRequestException(
        'El usuario de Clerk no tiene un correo principal disponible.'
      );
    }

    return directoryUser;
  }

  async createManagedUser(payload: CreateManagedUserDto): Promise<ManagedUserDto> {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();
    const normalizedEmail = payload.email.trim().toLowerCase();
    await this.ensureEmailAvailable(tenantId, normalizedEmail);

    if (!this.authModeService.isClerkMode()) {
      const profile = await this.appUserModel.create({
        tenantId,
        email: normalizedEmail,
        name: payload.name.trim(),
        role: payload.role,
        active: payload.active,
        identityProvider: 'local',
        externalId: null,
      });

      return this.serializeProfile(profile);
    }

    const { firstName, lastName } = this.splitName(payload.name);
    const clerkUser = await this.clerkAuthService
      .createClerkUser({
        email: normalizedEmail,
        password: payload.password,
        firstName,
        lastName,
        role: payload.role,
        active: payload.active,
      })
      .catch((error: unknown) => {
        throw this.mapClerkWriteError(error, 'create', normalizedEmail);
      });

    const profile = await this.upsertTenantProfile(tenantId, {
      externalId: clerkUser.id,
      email: normalizedEmail,
      name: payload.name.trim(),
      role: payload.role,
      active: payload.active,
      identityProvider: 'clerk',
    });

    return this.serializeProfile(profile, {
      externalId: clerkUser.id,
      createdAt: clerkUser.createdAt,
    });
  }

  async updateManagedUser(userId: string, payload: UpdateManagedUserDto): Promise<ManagedUserDto> {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();

    if (!this.authModeService.isClerkMode()) {
      const profile = await this.updateLocalProfile(userId, tenantId, payload);
      return this.serializeProfile(profile);
    }

    const externalId = this.resolveExternalId(userId);
    const currentUser = await this.getCurrentUser(externalId);
    const nextName = payload.name?.trim() || currentUser.name;
    const nextEmail = payload.email?.trim().toLowerCase() || currentUser.email;
    await this.ensureEmailAvailable(tenantId, nextEmail, externalId);
    const nextRole = payload.role ?? currentUser.role;
    const nextActive = payload.active ?? currentUser.active;
    const { firstName, lastName } = this.splitName(nextName);

    await this.clerkAuthService
      .updateClerkUser(externalId, {
        email: nextEmail !== currentUser.email ? nextEmail : undefined,
        password: payload.password?.trim() ? payload.password.trim() : undefined,
        firstName,
        lastName,
        role: nextRole,
        active: nextActive,
      })
      .catch((error: unknown) => {
        throw this.mapClerkWriteError(error, 'update', nextEmail, externalId);
      });

    const profile = await this.upsertTenantProfile(tenantId, {
      externalId,
      email: nextEmail,
      name: nextName,
      role: nextRole,
      active: nextActive,
      identityProvider: 'clerk',
    });

    return this.serializeProfile(profile, {
      externalId,
      createdAt: currentUser.createdAt,
    });
  }

  async deleteManagedUser(userId: string) {
    const tenantId = await this.tenantContextService.resolveEffectiveTenantId();

    if (!this.authModeService.isClerkMode()) {
      const result = await this.appUserModel.findOneAndDelete({
        _id: userId,
        tenantId,
      });
      if (!result) {
        throw new NotFoundException('No fue posible encontrar el usuario a eliminar.');
      }
      return { success: true };
    }

    const externalId = this.resolveExternalId(userId);
    await this.clerkAuthService.deleteClerkUser(externalId).catch((error: unknown) => {
      throw this.mapClerkWriteError(error, 'delete', null, externalId);
    });
    await this.appUserModel.deleteOne({
      tenantId,
      externalId,
    });

    return { success: true };
  }

  private resolveRole(
    profileRole: AppUserRole | null | undefined,
    publicMetadata?: Record<string, unknown> | null,
    unsafeMetadata?: Record<string, unknown> | null
  ): DirectoryUser['role'] {
    if (profileRole) {
      return profileRole;
    }

    const rawRole = unsafeMetadata?.role ?? publicMetadata?.role;

    switch (rawRole) {
      case 'admin':
      case 'manager':
      case 'auditor':
      case 'viewer':
        return rawRole;
      default:
        return 'viewer';
    }
  }

  private serializeProfile(
    profile: AppUserEntity & {
      _id?: unknown;
      createdAt?: Date;
    },
    overrides?: {
      externalId?: string | null;
      createdAt?: number | string | Date;
    }
  ): ManagedUserDto {
    return {
      id:
        profile.identityProvider === 'clerk' && (overrides?.externalId ?? profile.externalId)
          ? `clerk-${overrides?.externalId ?? profile.externalId}`
          : String((profile as any)._id),
      externalId: overrides?.externalId ?? profile.externalId ?? String((profile as any)._id),
      name: profile.name,
      email: profile.email,
      role: profile.role,
      active: profile.active,
      createdAt: new Date(
        overrides?.createdAt ?? profile.createdAt ?? Date.now()
      ).toISOString(),
    };
  }

  private async listTenantProfiles(tenantId: string) {
    return this.appUserModel.find({ tenantId }).sort({ name: 1 }).lean();
  }

  private findProfileForClerkUser(
    user: {
      id: string;
      emailAddresses: Array<{ emailAddress: string; id: string }>;
      primaryEmailAddressId: string | null;
    },
    profiles: AppUserEntity[]
  ) {
    const primaryEmail =
      user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId) ??
      user.emailAddresses[0];
    const email = primaryEmail?.emailAddress?.trim().toLowerCase();

    return profiles.find(
      (profile) =>
        profile.externalId === user.id || (email ? profile.email === email : false)
    );
  }

  private toDirectoryUser(user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    banned: boolean;
    createdAt: number;
    publicMetadata: Record<string, unknown>;
    unsafeMetadata: Record<string, unknown>;
    emailAddresses: Array<{
      emailAddress: string;
      id: string;
    }>;
    primaryEmailAddressId: string | null;
  }, profiles: AppUserEntity[]): DirectoryUser | null {
    const primaryEmail =
      user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId) ??
      user.emailAddresses[0];
    const email = primaryEmail?.emailAddress?.trim().toLowerCase();

    if (!email) {
      return null;
    }

    const firstName = user.firstName?.trim() || '';
    const lastName = user.lastName?.trim() || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const profile = this.findProfileForClerkUser(user, profiles);

    return {
      id: `clerk-${user.id}`,
      externalId: user.id,
      name: profile?.name || fullName || email,
      email: profile?.email || email,
      role: this.resolveRole(profile?.role, user.publicMetadata, user.unsafeMetadata),
      active: profile?.active ?? !user.banned,
      createdAt: new Date(user.createdAt || Date.now()).toISOString(),
    };
  }

  private splitName(name: string) {
    const segments = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (segments.length <= 1) {
      return {
        firstName: segments[0] ?? '',
        lastName: '',
      };
    }

    return {
      firstName: segments.slice(0, -1).join(' '),
      lastName: segments[segments.length - 1] ?? '',
    };
  }

  private resolveExternalId(userId: string) {
    return userId.startsWith('clerk-') ? userId.slice('clerk-'.length) : userId;
  }

  private async ensureEmailAvailable(
    tenantId: string,
    email: string,
    excludeExternalId?: string | null
  ) {
    const existing = await this.appUserModel.findOne({
      tenantId,
      email,
    });

    if (!existing) {
      return;
    }

    if (excludeExternalId && existing.externalId === excludeExternalId) {
      return;
    }

    throw new ConflictException('Ya existe un usuario con ese correo electrónico.');
  }

  private mapClerkWriteError(
    error: unknown,
    operation: 'create' | 'update' | 'delete',
    email?: string | null,
    externalId?: string | null
  ) {
    const typedError = error as {
      status?: number;
      clerkTraceId?: string;
      errors?: Array<{
        code?: string;
        message?: string;
        longMessage?: string;
        meta?: Record<string, unknown>;
      }>;
      message?: string;
    };

    const message = typedError.errors
      ?.map((entry) => entry.longMessage || entry.message || entry.code)
      .filter(Boolean)
      .join(' ');

    this.logger.warn(
      [
        `Clerk user ${operation} failed.`,
        `status=${String(typedError.status ?? 'unknown')}`,
        `email=${email ?? 'n/a'}`,
        `externalId=${externalId ?? 'n/a'}`,
        `trace=${typedError.clerkTraceId ?? 'n/a'}`,
        `message=${message ?? typedError.message ?? 'unknown_error'}`,
      ].join(' ')
    );

    if (typedError.status === 409) {
      return new ConflictException(message || 'Clerk rechazó la operación por conflicto.');
    }

    if (typedError.status === 400 || typedError.status === 422) {
      return new BadRequestException(
        message || 'Clerk rechazó los datos enviados para la operación de usuario.'
      );
    }

    return error instanceof Error
      ? error
      : new BadRequestException('No fue posible completar la operación de usuario en Clerk.');
  }

  private async upsertTenantProfile(
    tenantId: string,
    payload: {
      externalId: string;
      email: string;
      name: string;
      role: AppUserRole;
      active: boolean;
      identityProvider: 'clerk' | 'local';
    }
  ) {
    return this.appUserModel.findOneAndUpdate(
      {
        tenantId,
        externalId: payload.externalId,
      },
      {
        tenantId,
        externalId: payload.externalId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        active: payload.active,
        identityProvider: payload.identityProvider,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  private async updateLocalProfile(
    userId: string,
    tenantId: string,
    payload: UpdateManagedUserDto
  ) {
    const profile = await this.appUserModel.findOne({
      _id: userId,
      tenantId,
    });

    if (!profile) {
      throw new NotFoundException('No fue posible encontrar el usuario solicitado.');
    }

    if (payload.name !== undefined) {
      profile.name = payload.name.trim();
    }
    if (payload.email !== undefined) {
      const nextEmail = payload.email.trim().toLowerCase();
      await this.ensureEmailAvailable(tenantId, nextEmail, profile.externalId);
      profile.email = nextEmail;
    }
    if (payload.role !== undefined) {
      profile.role = payload.role;
    }
    if (payload.active !== undefined) {
      profile.active = payload.active;
    }

    await profile.save();
    return profile;
  }
}
