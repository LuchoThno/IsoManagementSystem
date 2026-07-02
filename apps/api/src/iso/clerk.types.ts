import type { AppUserRole } from './roles.decorator';

export type DirectoryUser = {
  id: string;
  externalId: string;
  name: string;
  email: string;
  role: AppUserRole;
  active: boolean;
  createdAt: string;
};

export type ClerkSessionIdentity = {
  userId: string;
  appUserId: string;
  sessionId: string | null;
};
