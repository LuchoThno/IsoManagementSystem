import { shouldUseClerkDirectory } from './authConfig';
import type { UserAccount } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

type ApiDirectoryUser = Omit<UserAccount, 'createdAt' | 'password'> & {
  externalId: string;
  createdAt: string;
};

export type DirectoryUser = UserAccount & {
  externalId?: string;
};

export async function listClerkDirectoryUsers(): Promise<DirectoryUser[]> {
  if (!(await shouldUseClerkDirectory())) {
    return [];
  }

  const users = await requestIsoApi<ApiDirectoryUser[]>('/users/clerk');

  return users.map((user) => ({
    ...user,
    password: '',
    createdAt: new Date(user.createdAt),
  }));
}

export async function fetchCurrentClerkUser(): Promise<DirectoryUser | null> {
  if (!(await shouldUseClerkDirectory())) {
    return null;
  }

  const user = await requestIsoApi<ApiDirectoryUser | null>('/auth/clerk/me');

  if (!user) {
    return null;
  }

  return {
    ...user,
    password: '',
    createdAt: new Date(user.createdAt),
  };
}
