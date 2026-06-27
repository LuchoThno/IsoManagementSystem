import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClerkAuthService } from './clerk-auth.service';
import type { ClerkSessionIdentity } from './clerk.types';
import { IS_PUBLIC_KEY } from './public.decorator';

type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  clerkAuth?: ClerkSessionIdentity;
};

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly clerkAuthService: ClerkAuthService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!this.clerkAuthService.isEnabled()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.clerkAuth = await this.clerkAuthService.authenticateRequest(request);
    return true;
  }
}
