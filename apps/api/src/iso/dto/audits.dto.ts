import type { AuditStatus, AuditType, FindingStatus, FindingType } from '../domain.constants';

export type AuditFindingDto = {
  id: string;
  type: FindingType;
  description: string;
  status: FindingStatus;
  dueDate: string;
  assignedTo: string;
};

export type CreateAuditDto = {
  type: AuditType;
  standard: string;
  date: string;
  status: AuditStatus;
  findings: AuditFindingDto[];
};

export type UpdateAuditDto = {
  type?: AuditType;
  standard?: string;
  date?: string;
  status?: AuditStatus;
  findings?: AuditFindingDto[];
};

export type UpdateAuditStatusDto = {
  status: AuditStatus;
};
