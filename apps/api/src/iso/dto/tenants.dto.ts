export type TenantSummaryDto = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  timezone: string;
  defaultLanguage: string;
  isDefault: boolean;
  organizationId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};
