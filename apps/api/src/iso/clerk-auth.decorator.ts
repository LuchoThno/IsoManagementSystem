import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ClerkSessionIdentity } from './clerk.types';

type AuthenticatedRequest = {
  clerkAuth?: ClerkSessionIdentity;
};

export const ClerkAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ClerkSessionIdentity | null => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.clerkAuth ?? null;
  }
);
