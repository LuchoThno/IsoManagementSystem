import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthModeService } from './auth-mode.service';
import { ClerkAuthService } from './clerk-auth.service';
import type { DirectoryUser } from './clerk.types';

@Injectable()
export class ClerkDirectoryService {
  constructor(
    private readonly authModeService: AuthModeService,
    private readonly clerkAuthService: ClerkAuthService
  ) {}

  async listUsers(): Promise<DirectoryUser[]> {
    if (!this.authModeService.isClerkMode()) {
      return [];
    }

    const users = await this.clerkAuthService.getClerkUsers(100);
    return (users?.data ?? [])
      .map((user) => this.toDirectoryUser(user))
      .filter((user): user is DirectoryUser => Boolean(user));
  }

  async getCurrentUser(userId: string): Promise<DirectoryUser> {
    this.authModeService.assertClerkReady();
    const user = await this.clerkAuthService.getClerkUser(userId);
    const directoryUser = this.toDirectoryUser(user);

    if (!directoryUser) {
      throw new BadRequestException(
        'El usuario de Clerk no tiene un correo principal disponible.'
      );
    }

    return directoryUser;
  }

  private resolveRole(
    publicMetadata?: Record<string, unknown> | null,
    unsafeMetadata?: Record<string, unknown> | null
  ): DirectoryUser['role'] {
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
  }): DirectoryUser | null {
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

    return {
      id: `clerk-${user.id}`,
      externalId: user.id,
      name: fullName || email,
      email,
      role: this.resolveRole(user.publicMetadata, user.unsafeMetadata),
      active: !user.banned,
      createdAt: new Date(user.createdAt || Date.now()).toISOString(),
    };
  }
}
