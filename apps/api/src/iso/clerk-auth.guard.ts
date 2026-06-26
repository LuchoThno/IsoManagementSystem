import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ClerkAuthService } from './clerk-auth.service';
import type { ClerkSessionIdentity } from './clerk.types';

type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  clerkAuth?: ClerkSessionIdentity;
};

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly clerkAuthService: ClerkAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.clerkAuthService.isEnabled()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.clerkAuth = await this.clerkAuthService.authenticateRequest(request);
    return true;
  }
}
