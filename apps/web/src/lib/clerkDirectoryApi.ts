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

  const users = await requestIsoApi<ApiDirectoryUser[]>('/users');

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

export async function createClerkDirectoryUser(payload: {
  name: string;
  email: string;
  role: DirectoryUser['role'];
  password: string;
  active: boolean;
}): Promise<DirectoryUser> {
  const user = await requestIsoApi<ApiDirectoryUser>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    ...user,
    password: '',
    createdAt: new Date(user.createdAt),
  };
}

export async function updateClerkDirectoryUser(
  userId: string,
  updates: Partial<Pick<DirectoryUser, 'name' | 'email' | 'role' | 'active'>> & {
    password?: string;
  }
): Promise<DirectoryUser> {
  const user = await requestIsoApi<ApiDirectoryUser>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  return {
    ...user,
    password: '',
    createdAt: new Date(user.createdAt),
  };
}

export async function deleteClerkDirectoryUser(userId: string): Promise<void> {
  await requestIsoApi(`/users/${userId}/delete`, {
    method: 'PATCH',
  });
}
