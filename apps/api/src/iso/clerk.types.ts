export type DirectoryUser = {
  id: string;
  externalId: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'auditor' | 'viewer';
  active: boolean;
  createdAt: string;
};

export type ClerkSessionIdentity = {
  userId: string;
  appUserId: string;
  sessionId: string | null;
};
