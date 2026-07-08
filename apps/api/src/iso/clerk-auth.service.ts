import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { AuthModeService } from './auth-mode.service';
import type { ClerkSessionIdentity } from './clerk.types';
import type { AppUserRole } from './roles.decorator';

type RequestLike = {
  headers: {
    authorization?: string;
  };
};

@Injectable()
export class ClerkAuthService {
  private readonly logger = new Logger(ClerkAuthService.name);
  private readonly secretKey = process.env.CLERK_SECRET_KEY?.trim() || '';
  private readonly apiUrl = process.env.CLERK_API_URL?.trim() || 'https://api.clerk.com';
  private readonly jwtKey = process.env.CLERK_JWT_KEY?.trim() || undefined;
  private readonly useStaticJwtKey = process.env.CLERK_USE_STATIC_JWT_KEY?.trim() === 'true';
  private readonly authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  private readonly clerkClient = this.secretKey
    ? createClerkClient({
        secretKey: this.secretKey,
        apiUrl: this.apiUrl,
      })
    : null;

  constructor(private readonly authModeService: AuthModeService) {}

  isEnabled() {
    return this.authModeService.isClerkMode() && this.secretKey.length > 0;
  }

  async authenticateRequest(request: RequestLike): Promise<ClerkSessionIdentity> {
    this.authModeService.assertClerkReady();

    const token = this.getBearerToken(request);
    return this.authenticateToken(token);
  }

  async authenticateToken(token: string | null | undefined): Promise<ClerkSessionIdentity> {
    this.authModeService.assertClerkReady();

    if (!token) {
      throw new UnauthorizedException('Falta el token de sesión de Clerk.');
    }

    const payload = await verifyToken(token, {
      secretKey: this.secretKey,
      apiUrl: this.apiUrl,
      ...(this.useStaticJwtKey && this.jwtKey ? { jwtKey: this.jwtKey } : {}),
      authorizedParties: this.authorizedParties.length ? this.authorizedParties : undefined,
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'unknown verification error';
      const configuredParties = this.authorizedParties.length
        ? this.authorizedParties.join(', ')
        : 'not configured';

      this.logger.warn(
        `Clerk token rejected. apiUrl=${this.apiUrl} jwtKeyMode=${this.useStaticJwtKey ? 'static' : 'dynamic'} jwtKey=${this.jwtKey ? 'configured' : 'missing'} authorizedParties=${configuredParties} reason=${message}`
      );

      throw new UnauthorizedException(
        'El token de Clerk no es válido para esta aplicación o su configuración de backend.'
      );
    });

    if (!payload?.sub) {
      throw new UnauthorizedException('No fue posible identificar al usuario de Clerk.');
    }

    return {
      userId: payload.sub,
      appUserId: `clerk-${payload.sub}`,
      sessionId: typeof payload.sid === 'string' ? payload.sid : null,
    };
  }

  async getClerkUser(userId: string) {
    this.authModeService.assertClerkReady();

    return this.clerkClient!.users.getUser(userId);
  }

  async getClerkUsers(limit = 100) {
    this.authModeService.assertClerkReady();

    return this.clerkClient!.users.getUserList({ limit });
  }

  async createClerkUser(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: AppUserRole;
    active: boolean;
  }) {
    this.authModeService.assertClerkReady();

    return (this.clerkClient!.users as any).createUser({
      emailAddress: [payload.email],
      password: payload.password,
      firstName: payload.firstName || undefined,
      lastName: payload.lastName || undefined,
      banned: !payload.active,
      publicMetadata: {
        role: payload.role,
      },
      unsafeMetadata: {
        role: payload.role,
      },
    });
  }

  async updateClerkUser(
    userId: string,
    payload: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: 'admin' | 'manager' | 'auditor' | 'viewer';
      active?: boolean;
    }
  ) {
    this.authModeService.assertClerkReady();

    const updates: Record<string, unknown> = {};

    if (payload.password) {
      updates.password = payload.password;
    }
    if (payload.firstName !== undefined) {
      updates.firstName = payload.firstName || null;
    }
    if (payload.lastName !== undefined) {
      updates.lastName = payload.lastName || null;
    }
    if (payload.active !== undefined) {
      updates.banned = !payload.active;
    }
    if (payload.role) {
      updates.publicMetadata = { role: payload.role };
      updates.unsafeMetadata = { role: payload.role };
    }

    return (this.clerkClient!.users as any).updateUser(userId, updates);
  }

  async deleteClerkUser(userId: string) {
    this.authModeService.assertClerkReady();

    return (this.clerkClient!.users as any).deleteUser(userId);
  }

  private getBearerToken(request: RequestLike) {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token?.trim()) {
      return null;
    }

    return token.trim();
  }
}
