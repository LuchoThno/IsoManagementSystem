import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createClerkClient, verifyToken } from '@clerk/backend';
import type { ClerkSessionIdentity } from './clerk.types';

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

  isEnabled() {
    return this.secretKey.length > 0;
  }

  async authenticateRequest(request: RequestLike): Promise<ClerkSessionIdentity> {
    if (!this.isEnabled()) {
      throw new UnauthorizedException('Clerk no está configurado en el backend.');
    }

    const token = this.getBearerToken(request);
    return this.authenticateToken(token);
  }

  async authenticateToken(token: string | null | undefined): Promise<ClerkSessionIdentity> {
    if (!this.isEnabled()) {
      throw new UnauthorizedException('Clerk no está configurado en el backend.');
    }

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
    if (!this.clerkClient) {
      throw new UnauthorizedException('Clerk no está configurado en el backend.');
    }

    return this.clerkClient.users.getUser(userId);
  }

  async getClerkUsers(limit = 100) {
    if (!this.clerkClient) {
      throw new UnauthorizedException('Clerk no está configurado en el backend.');
    }

    return this.clerkClient.users.getUserList({ limit });
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
