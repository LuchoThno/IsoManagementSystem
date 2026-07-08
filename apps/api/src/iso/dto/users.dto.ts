import type { AppUserRole } from '../roles.decorator';

export type ManagedUserDto = {
  id: string;
  externalId: string;
  name: string;
  email: string;
  role: AppUserRole;
  active: boolean;
  createdAt: string;
};

export type CreateManagedUserDto = {
  name: string;
  email: string;
  role: AppUserRole;
  password: string;
  active: boolean;
};

export type UpdateManagedUserDto = {
  name?: string;
  email?: string;
  role?: AppUserRole;
  password?: string;
  active?: boolean;
};
