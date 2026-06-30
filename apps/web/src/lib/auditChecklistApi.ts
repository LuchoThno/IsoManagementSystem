import type { AuditChecklist } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

type ApiAuditChecklist = Omit<AuditChecklist, 'items'> & {
  items: AuditChecklist['items'];
};

export async function fetchAuditChecklist(auditId: string): Promise<AuditChecklist> {
  return requestIsoApi<ApiAuditChecklist>(`/audits/${auditId}/checklist`);
}
